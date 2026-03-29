---
title: 使用 VS Code Remote SSH 优雅处理 Git 提交签名 (macOS 到 Ubuntu)
date: 2026-03-29
---

在使用 VS Code Remote SSH 进行远程开发时，安全且优雅地处理 Git 提交签名一直是个痛点。

如果你在本地 macOS 上拥有 GPG 私钥，直接将私钥复制到远程 Ubuntu 服务器不仅麻烦，还会带来极大的安全隐患。最完美的解决方案是：**将私钥安全地留在 macOS 上，通过 SSH Socket 转发，让远程的 Git 直接调用本地的 GPG Agent 进行签名。**

这篇教程将手把手教你如何打通 macOS (Local) 到 Ubuntu 24.04 (Remote) 的 GPG 转发，实现无缝的 Git 自动签名体验。

---

## 核心原理

在远程执行 `git commit` 时，远程服务器的 GPG 会尝试寻找本地的 Socket。我们通过 SSH 的 `RemoteForward` 功能，将远程机器上的 GPG Socket 映射到我们 macOS 上的 `extra-socket`。这样，当需要输入密码时，你的 Mac 上会自动弹出一个密码输入框，安全又便捷。

---

## 步骤 1：配置本地 Mac 环境

为了让 Mac 能在后台（被远程触发时）弹出密码输入框，我们需要安装一个 GUI 提示工具 `pinentry-mac`。

1.  **使用 Homebrew 安装 pinentry-mac：**

    ```bash
    brew install pinentry-mac
    ```

2.  **配置本地 GPG 使用该工具：**

    打开或创建 `~/.gnupg/gpg-agent.conf` 文件，并添加以下内容（注意：如果是 Apple Silicon (M1/M2/M3) 芯片，路径通常为 `/opt/homebrew/bin/pinentry-mac`；如果是 Intel 芯片，路径可能是 `/usr/local/bin/pinentry-mac`）：

    ```text
    pinentry-program /opt/homebrew/bin/pinentry-mac
    ```

3.  **重启本地 GPG Agent 使配置生效：**

    ```bash
    gpgconf --kill gpg-agent
    ```

4.  **获取本地 extra socket 路径（请复制备用）：**

    运行以下命令，你会得到一个类似 `/Users/yourname/.gnupg/S.gpg-agent.extra` 的路径：

    ```bash
    gpgconf --list-dirs agent-extra-socket
    ```

---

## 步骤 2：配置远程 Ubuntu (24.04) 环境

如果不配置 SSH 服务端，每次断开重连时，SSH 都会因为无法覆盖旧的 Socket 文件而导致转发失败。我们需要修改 Ubuntu 的 SSHD 配置。

1.  **SSH 登录到你的 Ubuntu 服务器。**

2.  **编辑 SSH Daemon 配置文件：**

    ```bash
    sudo nano /etc/ssh/sshd_config
    ```

3.  **开启 Socket 覆盖：**

    在文件中找到或直接添加以下这一行：

    ```text
    StreamLocalBindUnlink yes
    ```

4.  **重启远程 SSH 服务：**

    ```bash
    sudo systemctl restart ssh
    ```

5.  **获取远程 socket 路径（请复制备用）：**

    在 Ubuntu 上运行以下命令，你会得到一个类似 `/run/user/1000/gnupg/S.gpg-agent` 的路径：

    ```bash
    gpgconf --list-dirs agent-socket
    ```

---

## 步骤 3：配置本地 SSH 转发 (macOS)

现在，我们要把第一步和第二步拿到的 Socket 路径连接起来。

1.  在 Mac 上打开你的 SSH 配置文件：`~/.ssh/config`。

2.  找到你用于连接 Ubuntu 的 `Host` 配置块，添加 `RemoteForward`。格式为 `RemoteForward <远程路径> <本地 extra 路径>`：

    ```text
    Host my-ubuntu-remote
        HostName 192.168.1.100 # 你的服务器 IP 或域名
        User ubuntu
        # 核心配置：将远程的请求转发到本地 Mac
        RemoteForward /run/user/1000/gnupg/S.gpg-agent /Users/yourname/.gnupg/S.gpg-agent.extra
    ```

---

## 步骤 4：在远程机器上配置 Git

最后一步，告诉远程的 Git 使用你的 GPG Key 进行签名。

1.  **在 Mac 上查询你的 Key ID：**

    ```bash
    gpg --list-secret-keys --keyid-format=long
    ```

    *(找到 `rsa4096/` 或 `ed25519/` 后面的那一串字符，比如 `3AA5C34371567BD2`)*

2.  **在 Ubuntu 服务器上配置 Git 全局变量：**

    ```bash
    git config --global user.signingkey <你的_KEY_ID>
    git config --global commit.gpgsign true
    ```

---

## 步骤 5：见证奇迹的时刻 (测试)

配置完成后，请**彻底关闭 VS Code** 以及所有连向该服务器的 SSH 终端，然后重新打开 VS Code 并连接到该远程工作区。

打开 VS Code 的集成终端，输入以下命令测试通信是否畅通：

```bash
echo "test" | gpg --clearsign
```

**如果配置成功：** 你的 Mac 屏幕上会立刻弹出一个精美的 GUI 窗口，要求你输入 GPG 私钥密码。输入正确的密码后，VS Code 终端内将输出一段带有完整 PGP 签名的文本。

🎉 恭喜！现在你在 VS Code 远程环境中执行的所有 Git Commit 都将自动带有你的安全签名了。
