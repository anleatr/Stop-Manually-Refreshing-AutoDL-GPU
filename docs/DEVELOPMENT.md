# 开发与维护

## 安装和运行

在项目根目录运行 `npm ci`，按锁文件安装全部开发依赖。使用 `npm run desktop:dev` 启动 Electron，使用 `npm start` 启动网页服务。构建环境为 Windows x64，建议使用 Node.js 24。

若已安装桌面版正在使用同一运行目录，先从托盘正常退出。开发或测试不要同时打开两份程序操控同一个 AutoDL 会话。

## 验证命令

| 命令 | 范围 |
| --- | --- |
| `npm run check` | 服务、界面、脚本、测试和桌面入口的语法 |
| `npm test` | 单元、接口、提交保护、历史凭据兼容与任务状态 |
| `npm run test:tasks-ui` | 创建任务、冲突处理、队列和日志 |
| `npm run test:queue-ui` | 余额 10 分钟刷新、队列滚动和切页回顶 |
| `npm run test:login-ui` | 会话状态与登录交互 |
| `npm run test:models-ui` | 型号同步和新建/克隆表单 |
| `npm run test:account-ui` | 实例选择、余额与账户操作 |
| `npm run test:images-ui` | 官方镜像选择和克隆切换 |
| `npm run test:submit-ui` | 隔离页面上的提交边界 |

这些检查使用合成数据。UI 测试优先使用已下载的 Playwright Chromium，也支持 Windows Chrome/Edge，或通过 `AI_TEST_BROWSER` 指定浏览器路径。测试截图写入独立测试临时目录，跟随测试清理。

修改业务代码后运行 `check` 与单元测试，再运行相关 UI 回归。涉及任务提交、人工完成或删除时，应覆盖失败回滚、重复请求、运行中互斥和原提交记录保留。

## 打包

`npm run desktop:pack` 生成直接运行目录，`npm run desktop:dist` 生成安装包。开发依赖中的 Electron 提供构建运行环境，打包配置位于 `desktop/builder.json`。所有构建输出在 `desktop/out/`，已被 Git 忽略。

可用 `npm run test:desktop` 对打包后的直接运行版做隔离启动检查。测试使用独立用户目录，结束后关闭应用。

发布前在 Windows 上验证安装、启动、托盘退出和升级。源码提交不包含构建产物。发布安装包时使用 GitHub Releases，发布版本应更新 `package.json` 与锁文件中的版本号，并记录变更。

## 版本控制边界

提交源码、锁文件、静态图标、必要文档和测试。不要提交 `node_modules/`、`desktop/out/`、运行目录、浏览器资料、Token、日志、下载缓存、测试临时图片及本机生成的安装文件。

历史 `TEST_REPORT.md`、`eval/` 和历史截图保留原有记录，其界面和测试数量不代表当前版本。用户入口以 README 和使用指南为准。

## 结构与职责

- 桌面进程管理窗口、托盘和本地服务生命周期。
- `src/server.mjs` 负责本地接口、访问校验和浏览器互斥。
- `src/engine.mjs` 调度监测、提交和核验。
- `src/store.mjs` 持久化任务、日志、人工完成和删除记录。
- `src/adapters/` 通过浏览器页面操作 AutoDL。
- `public/` 提供桌面与网页共用界面。

历史数据中的 AI 凭据读取只用于旧状态文件兼容。当前应用已移除 AI 页面、接口与模型请求模块。
