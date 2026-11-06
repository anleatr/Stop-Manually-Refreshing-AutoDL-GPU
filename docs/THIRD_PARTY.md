# 第三方组件

本项目使用 MIT 许可证，见 [LICENSE](../LICENSE)。

| 组件 | 使用方式 | 许可 |
| --- | --- | --- |
| Electron | 桌面窗口和捆绑的 Chromium / Node.js 运行环境 | MIT，及发行包中的 Chromium、Node.js 相关许可 |
| electron-builder | Windows 桌面打包工具，开发依赖 | MIT |
| Playwright / playwright-core | 控制专用浏览器 | Apache-2.0 |
| Microsoft Edge | 用户电脑上的专用登录和后台自动化浏览器 | Microsoft 对应条款 |
| AutoDL | 用户自行登录的第三方算力平台 | AutoDL 对应条款 |

具体版本由 `package-lock.json` 和打包配置确定。重新分发构建包时保留 Electron、Chromium、Node.js、Playwright 发行包中的许可证与声明。项目源码不包含这些工具的下载缓存或安装包。

`eval/` 是已移除 AI 功能的历史评测记录，引用资料及评测工具的许可应按各自原始记录核对。
