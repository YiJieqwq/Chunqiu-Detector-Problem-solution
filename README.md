# 春秋检测项解决方案 · Chunqiu Detector Solutions

[在线文档 / Online docs](https://yijieqwq.github.io/Chunqiu-Detector-Problem-solution/) · [上游内容仓库](https://github.com/mingzun09/Chunqiu-Detector-Problem-solution)

本站采用 **Astro 静态生成**，中英文三章文档、标题优先搜索、原生条目折叠与深浅色主题。文档内容、作者署名与附件仍沿用原仓库；站点技术栈更换不改变其内容归属。

## 阅读与维护

- 第一章：概述、用语与风险说明。
- 第二章：模块推荐及配置。
- 第三章：检测项说明与解决办法。
- 中文源：[language/answer_zh.md](language/answer_zh.md)
- English source: [language/answer_en.md](language/answer_en.md)
- 贡献者：[File/Doc/thanks.md](File/Doc/thanks.md)
- 附件：[`File/`](File/)，构建时原样复制，本站不自动执行任何附件。

只需编辑两份 Markdown，无需修改生成的 HTML。保持现有标题以兼容历史锚点；章节内部 `###` 为条目，`####` 为检测方式、解决办法等子段落。当前正文包含 86 个检测项及 3 个附录条目，数值由源内容统计，不在 UI 中硬编码。

## 开发与构建

要求 Node.js **22.12+**。

```sh
npm ci
npm run dev      # http://localhost:4321/Chunqiu-Detector-Problem-solution/
npm run build   # dist/
npm test        # 源文档条目数、六页链接/锚点、ID、语言搜索索引、旧 .html 地址
npm run preview # 预览 dist/
```

保留 `npm run docs:dev`、`docs:build`、`docs:preview` 命令别名。默认移动端响应式，可在“更多”切换桌面视图。搜索、主题等由少量原生 JS 增强；禁用 JS 后仍可阅读、折叠和通过链接导航。

```sh
npx playwright install --with-deps chromium
npm run test:browser
```

浏览器测试覆盖 390 / 1024 / 1440px、深浅色、中英文搜索与切换、锚点展开、独立折叠和手机导航。Firefox、Safari 及真机仍需另行验收。

## 部署与路由兼容

`main` / `master` 的 push 触发 `.github/workflows/pages.yml`：安装锁定依赖 → 构建 → 静态与 Chromium 测试 → 部署 `dist/`。测试失败不会部署。

- 站点域名默认从 `GITHUB_REPOSITORY_OWNER` 推导，支持 `SITE_URL` 覆盖。
- 项目路径默认 `/Chunqiu-Detector-Problem-solution`，支持 `BASE_PATH` 覆盖。
- 保留 `/zh/`、`/en/`、`prologue`、`items`、`thanks` 和 `/File/`。
- 目录路由由 Pages 处理末尾斜杠，另输出 `items.html`、`prologue.html`、`thanks.html` 兼容旧分享地址。
- 搜索按语言隔离，首次输入关键词时加载当前语言 JSON；精确标题优先于标题包含，正文匹配其次。
- 无 Vue/React 客户端运行时、CDN 字体或周期性 DOM 扫描。样式与脚本职责集中，不再追加默认文档主题覆盖补丁。

## 参考与回退

Astro 站点建设参考了 [Matsuzaka Yuki 的原型](https://github.com/matsuzaka-yuki/Chunqiu-Detector-Problem-solution/tree/784fa4cbf88de60051f59f02e3b77db9c655ed03) 中“构建期结构化内容 + 静态组件 + 原生 details”的思路，采用独立实现并保留原三章路径。感谢其网页建设方面的支持。

原型保留在 fork 的 `astro-prototype` 分支。迁移前 VitePress 快照为 `a08f360ef6c81d7dd73aac2aefb62aa8e40e51f1`（标签 `pre-astro-v1`）；无需重新整理旧历史即可回退。回退应恢复该快照的代码和部署流程，作为新提交发布，而不是强推删除后续历史。

文档仅供技术学习与环境研究，不保证适配所有设备。修改系统前请备份并保留恢复方式。许可证见 [LICENSE](LICENSE)。
