import { defineConfig } from "astro/config";
const owner = process.env.GITHUB_REPOSITORY_OWNER || "yijieqwq";
export default defineConfig({
  site: process.env.SITE_URL || `https://${owner.toLowerCase()}.github.io`,
  base: process.env.BASE_PATH || "/Chunqiu-Detector-Problem-solution",
  output: "static",
  trailingSlash: "always",
  devToolbar: { enabled: false },
  build: { inlineStylesheets: "never" },
});
