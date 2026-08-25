# Chunqiu Detector-Problem solution / 春秋检测器问题解决方案

> You can select your language below to view this document or visit our interactive online documentation platform.
>
> 您可以在下方选择语言查看此文档，或访问我们的在线交互文档平台（支持实时关键词搜索）。

## 🌐 交互式在线文档 / Interactive Web Site (GitHub Pages)
👉 **[点击访问在线文档平台 (支持搜索框与信息展开/折叠)](https://mingzun09.github.io/Chunqiu-Detector-Problem-solution/)**

---

### ⚙️ 开启 GitHub Pages 步骤说明 / How to Enable GitHub Pages
如果您是仓库所有者，首次部署 GitHub Pages 时需在仓库设置中启用页面服务（只需设置一次）：

1. 打开仓库页面，点击顶部 **Settings**（设置）。
2. 在左侧菜单中选择 **Pages**。
3. 在 **Build and deployment** -> **Source** 下：
   - **推荐方式**：选择 **GitHub Actions**（本仓库已配置 `.github/workflows/pages.yml`，每次提交将自动构建发布）。
   - **传统方式**：选择 **Deploy from a branch**，分支选择 `main`（或 `master`），目录选择 `/ (root)`，点击 **Save**。
4. 保存后等待 1-2 分钟，页面即可通过 `https://<your-username>.github.io/<repository-name>/` 访问！

---

## 语言选择 / Language
Select one of the following languages to view the solution file.
请选择以下语言之一来查看解决方案文件。

[中文解决方案](/language/answer_zh.md) | [English Solutions](/language/answer_en.md)

> 文档中包含大量嵌入式链接（蓝色突出显示），点击即可跳转至对应的项目/文件地址。
> There are many embedded links in the document (highlighted in blue). You can click on them to be redirected to the relevant project/file address.

---

## 依赖与文件说明 / Files & Attachments
仓库中包含了部分自动化修复脚本与 KPM 模块，位于 `/File/` 目录下：
- `/File/Found property.sh` - 修复 Found property 属性检测
- `/File/Tampered Attestation Key(26)Pass.sh` - 修复证书 Patch 标签异常
- `/File/shamiko_Plus.sh` - 隐藏属性区空洞修改
- `/File/Bin/Nohello-v1.8.2.9-83-b3e7d87-release.kpm` - APatch 隐藏 KPM 模块
- `/File/Doc/ksu_kp_sidechannel_zh.md` - KSU/APatch 侧信道检测原理说明

---

## 反馈与参与贡献 / Feedback & Contribute
欢迎提交 Issues 或 Pull Requests 补充新的检测项及解决方案！

You can fork and modify the repository, then pull requests. I will check and merge them.
