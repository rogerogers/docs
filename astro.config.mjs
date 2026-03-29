// @ts-check
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightBlog from "starlight-blog";
import devtoolsJson from "vite-plugin-devtools-json";

// https://astro.build/config
export default defineConfig({
  site: "https://rogerogers.com",
  vite: {
    plugins: [devtoolsJson()],
  },
  integrations: [
    starlight({
      components: {
        Footer: "./src/components/Footer.astro",
      },
      plugins: [starlightBlog()],
      title: "Rogerogers",
      defaultLocale: "root",
      locales: {
        root: {
          label: "English",
          lang: "en",
        },
        zh: {
          label: "简体中文",
          lang: "zh-CN",
        },
      },
      logo: {
        src: "./src/assets/logo.svg",
        replacesTitle: true,
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/rogerogers",
        },
      ],
      sidebar: [
        {
          label: "Guides",
          translations: { zh: "指南" },
          items: [
            // Each item here is one entry in the navigation menu.
            { label: "Example Guide", translations: { zh: "示例指南" }, slug: "guides/example" },
          ],
        },
        {
          label: "Reference",
          translations: { zh: "参考" },
          autogenerate: { directory: "reference" },
        },
      ],
    }),
  ],
});
