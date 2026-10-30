# 环境版本兼容说明

更新日期：2026-10-29（Asia/Shanghai）。本项目进行可核实的资源与镜像匹配，尚未在用户项目中运行完整依赖测试，不能把驱动门槛通过当作应用兼容证明。

## 先区分页面上的 CUDA

- 宿主驱动最高支持 CUDA：AutoDL 资源列表/驱动信息中的能力上限，类似 nvidia-smi 所示 CUDA Version；不表示容器里已安装该版本 Toolkit。AutoDL 文档原文：“通过nvidia-smi命令查看到的CUDA版本只是驱动支持的最高cuda版本参数，不代表实例中安装的是该版本CUDA。”（[CUDA/cuDNN](https://www.autodl.com/docs/cuda/)，2026-10-29 查阅）
- 镜像/Toolkit CUDA：镜像路径或 nvcc --version 所示版本，用于构建扩展时尤其重要。
- PyTorch CUDA runtime：torch.version.cuda 所示框架构建版本。预编译包可能自带所需 CUDA 用户态组件；自定义扩展还依赖本地 Toolkit、编译器、架构和 ABI。

三种版本可以不同。GPU 的计算架构支持也须检查，不能只比较版本号。

## 用户需要 CUDA 12.8 时

| 读到的信息 | 判断 | 本项目自动匹配 |
| --- | --- | --- |
| 宿主驱动最高支持 CUDA 13.0 | 新驱动通常向后兼容旧 CUDA；仅说明驱动版本门槛覆盖12.8 | 放行驱动版本这一项，仍检查型号、镜像等条件 |
| 宿主驱动最高支持 CUDA 12.8 | 版本门槛覆盖12.8 | 同上 |
| 宿主驱动最高支持 CUDA 12.6 | CUDA12大版本内可能有受限的小版本兼容；PTX/JIT、新功能或扩展可能需要更新驱动 | 标为 conditional，不自动放行 |
| 宿主驱动最高支持 CUDA 11.8 | 不满足直接运行所需12.x的驱动能力；某些受支持平台可另配兼容包，但不能默认存在 | 拒绝；不自动装兼容包 |
| 镜像 CUDA 13.0 或12.6 | 不是用户指定的12.8环境 | 不擅自替换 |
| 驱动信息缺失或未知 | 无法证实 | 拒绝 |

NVIDIA 对小版本兼容列有最低驱动门槛和功能限制。当前程序只使用页面可核实的驱动上限，采用保守规则，不尝试推断兼容包、PTX路径或项目构建选项；它可能漏掉部分经人工验证能够运行的主机。

## Python、PyTorch 和基础镜像

Python3.10项目不能仅凭“3.12更高”就判定可用：依赖可能限定 Requires-Python，二进制wheel、已删除的标准库API和项目代码也可能不兼容。Python3.12移除了distutils，就是需要检查的例子。

PyTorch2.x各版本支持的Python、CUDA构建和扩展ABI有差异。应使用项目依赖锁定范围和PyTorch官方构建组合；Python版本满足某个PyTorch版本的安装要求，也不意味着整个项目已兼容。更高版本的PyTorch不是无条件替代。

新建实例通过“同步官方镜像”逐级读取并选择：框架 / 框架版本 / Python(系统) / CUDA。最后一级自动填入只读 CUDA 字段，完整路径自动生成；不允许在表单中独立拼接四个版本。更换上级清除下级与旧报价，提交前仍按精确完整路径复核，不自行换 Python 或 PyTorch。页面没有所需镜像时停止并显示当前分支可选值。2026-10-29 现有会话只读核验的 PyTorch 2.1.0 / Python3.10(ubuntu22.04) 分支 CUDA 为12.1，PyTorch2.8.0 / Python3.12(ubuntu22.04) 为12.8；这只是当时的菜单结果，不能当作固定目录或所有可用组合的保证。

克隆保留源系统盘环境：Python、PyTorch、CUDA Toolkit 和自定义扩展与源实例完全相同，程序不会重装或升级。源环境的 CUDA 不由用户填写，首次检查时从 AutoDL 克隆页读取（克隆对话框生成的地址带有源镜像的 CUDA 版本），只选宿主驱动支持它的主机。地区与源实例一致；目标 GPU 型号和卡数可以与源实例不同。

换到另一种 GPU 时，还要看源环境是否支持这种 GPU 的计算架构。AutoDL 下单前会检查镜像 CUDA 与 GPU 架构（2026-10-29 读取其公开前端代码）：

| 架构 | AutoDL 提示中的例子 | 镜像 CUDA 要求 |
| --- | --- | --- |
| 安培 Ampere | 30 系列、A40、A4000 等 | 11.x 及以上 |
| Ada | 40 系列、H800 等 | 11.3 及以上 |
| Blackwell | 如 50 系列 | 12.8 及以上 |

另有一条：镜像 CUDA 高于主机支持的最高 CUDA 时无法开机。本项目按型号名识别 Blackwell（RTX 50 系列、名称含 Blackwell、B100/B200/B300/GB200），新建时镜像 CUDA 低于 12.8 拒绝建任务，克隆时源环境低于 12.8 不选这类主机；其他架构交给 AutoDL 的下单前提示，程序识别到提示后停止任务，不代为点“继续”。镜像 CUDA 满足要求也不代表 PyTorch 带有该架构的 kernel（例如自行安装的旧版 PyTorch），换型号后请先运行一次最小测试。

可选AI可根据用户主动提供的requirements、项目README、错误日志提出兼容建议；它不会代替上述校验，也不能自行升级依赖或提交付费操作。

## 建议在实例内核验

以下只读命令须由用户在实际项目环境中运行；不是本次开发已执行过的验收：

~~~bash
nvidia-smi
nvcc --version
python --version
python -c "import torch; print(torch.__version__); print(torch.version.cuda); print(torch.cuda.is_available())"
python -m pip check
~~~

没有nvcc不一定妨碍预编译PyTorch运行；但编译CUDA扩展通常需要额外工具链。torch.cuda.is_available()为真和pip check通过也不能证明模型或训练完整通过，应继续执行项目提供的最小推理/训练及扩展加载测试。

## 官方依据

- NVIDIA CUDA兼容文档： https://docs.nvidia.com/deploy/cuda-compatibility/
- NVIDIA小版本兼容及PTX限制： https://docs.nvidia.com/deploy/cuda-compatibility/minor-version-compatibility.html
- PyTorch官方构建组合： https://pytorch.org/get-started/previous-versions/
- PyTorch官方发布兼容矩阵： https://github.com/pytorch/pytorch/blob/main/RELEASE.md
- Python3.12移除distutils： https://docs.python.org/3/whatsnew/3.12.html
- AutoDL CUDA说明： https://www.autodl.com/docs/cuda/

代码入口：src/images.mjs、src/adapters/autodl.mjs、public/images.js（官方菜单、联动与精确选择）、src/config.mjs（镜像精确一致）、src/matching.mjs（宿主门槛）、src/ai.mjs（建议边界）。测试见 tests/images.test.mjs、tests/server.test.mjs、scripts/images-ui-smoke.mjs，以及 tests/pricing.test.mjs 与 tests/matching.test.mjs。
