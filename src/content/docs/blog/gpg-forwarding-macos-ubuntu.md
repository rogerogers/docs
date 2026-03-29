---
title: Elegant Git Commit Signing with VS Code Remote SSH (macOS to Ubuntu)
date: 2026-03-29
---

Handling Git commit signing securely and elegantly has always been a pain point when developing remotely with VS Code Remote SSH.

If you have your GPG private key locally on macOS, directly copying the private key to a remote Ubuntu server is not only cumbersome but also introduces a massive security risk. The perfect solution is: **keep your private key securely on macOS, forward it via SSH Socket, and allow the remote Git to directly invoke your local GPG Agent for signing.**

This tutorial will guide you step-by-step on how to establish GPG forwarding from macOS (Local) to Ubuntu 24.04 (Remote), enabling a seamless and automated Git signing experience.

---

## Core Principles

When executing `git commit` remotely, the remote server's GPG will attempt to find a local Socket. We use the SSH `RemoteForward` feature to map the GPG Socket on the remote machine to our `extra-socket` on macOS. This way, when a password is required, a password input prompt will automatically pop up on your Mac, which is both secure and highly convenient.

---

## Step 1: Configure Local Mac Environment

To allow the Mac to pop up a password prompt in the background (when triggered remotely), we need to install a GUI prompt tool called `pinentry-mac`.

1.  **Install `pinentry-mac` using Homebrew:**

    ```bash
    brew install pinentry-mac
    ```

2.  **Configure local GPG to use this tool:**

    Open or create the `~/.gnupg/gpg-agent.conf` file, and add the following content (Note: If you are using an Apple Silicon (M1/M2/M3) chip, the path is usually `/opt/homebrew/bin/pinentry-mac`; if you are using an Intel chip, the path might be `/usr/local/bin/pinentry-mac`):

    ```text
    pinentry-program /opt/homebrew/bin/pinentry-mac
    ```

3.  **Restart the local GPG Agent to apply the configuration:**

    ```bash
    gpgconf --kill gpg-agent
    ```

4.  **Get the local extra socket path (copy this for later use):**

    Run the following command, and you will get a path similar to `/Users/yourname/.gnupg/S.gpg-agent.extra`:

    ```bash
    gpgconf --list-dirs agent-extra-socket
    ```

---

## Step 2: Configure Remote Ubuntu (24.04) Environment

If you don't configure the SSH server, every time you disconnect and reconnect, SSH will fail to forward because it cannot overwrite the old Socket file. We need to modify the SSHD configuration on Ubuntu.

1.  **SSH into your Ubuntu server.**

2.  **Edit the SSH Daemon configuration file:**

    ```bash
    sudo nano /etc/ssh/sshd_config
    ```

3.  **Enable Socket Overwriting:**

    Find or directly add the following line in the file:

    ```text
    StreamLocalBindUnlink yes
    ```

4.  **Restart the remote SSH service:**

    ```bash
    sudo systemctl restart ssh
    ```

5.  **Get the remote socket path (copy this for later use):**

    Run the following command on Ubuntu, and you will get a path similar to `/run/user/1000/gnupg/S.gpg-agent`:

    ```bash
    gpgconf --list-dirs agent-socket
    ```

---

## Step 3: Configure Local SSH Forwarding (macOS)

Now, we need to connect the Socket paths obtained in Step 1 and Step 2.

1.  Open your SSH configuration file on your Mac: `~/.ssh/config`.

2.  Find the `Host` configuration block you use to connect to Ubuntu, and add `RemoteForward`. The format is `RemoteForward <remote path> <local extra path>`:

    ```text
    Host my-ubuntu-remote
        HostName 192.168.1.100 # Your server IP or domain
        User ubuntu
        # Core configuration: forward remote requests to the local Mac
        RemoteForward /run/user/1000/gnupg/S.gpg-agent /Users/yourname/.gnupg/S.gpg-agent.extra
    ```

---

## Step 4: Configure Git on the Remote Machine

The final step is to tell the remote Git to use your GPG Key for signing.

1.  **Query your Key ID on your Mac:**

    ```bash
    gpg --list-secret-keys --keyid-format=long
    ```

    *(Find the string of characters following `rsa4096/` or `ed25519/`, such as `3AA5C34371567BD2`)*

2.  **Configure Git global variables on the Ubuntu server:**

    ```bash
    git config --global user.signingkey <YOUR_KEY_ID>
    git config --global commit.gpgsign true
    ```

---

## Step 5: Witness the Magic (Testing)

After configuring, please **completely close VS Code** and all SSH terminals connected to the server, then reopen VS Code and connect to the remote workspace.

Open the integrated terminal in VS Code and enter the following command to test if the communication is working:

```bash
echo "test" | gpg --clearsign
```

**If the configuration is successful:** A neat GUI window will immediately pop up on your Mac screen, asking you to enter your GPG private key password. After entering the correct password, a text block with a complete PGP signature will be output in the VS Code terminal.

🎉 Congratulations! Now all your Git Commits executed in the VS Code remote environment will automatically carry your secure signature.
