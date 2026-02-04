# Storyboard Maker

[English Version](./README.md)
[下载链接](https://github.com/bigeyex/storyboard-maker/releases/tag/1.0.0)

Storyboard Maker 是一款专业的桌面端应用程序，旨在简化创作者从初步构思到完成带有 AI 生成图片和视频的电影级分镜脚本的工作流程。

## 🌟 核心功能

### 🎬 全面的故事工作空间
*   **世界观设置**：定义故事的核心主题、艺术风格和背景设定。
*   **角色管理**：创建并维护包含视觉描述的一致角色档案。
*   **场景组织**：将故事分解为可管理的章节和场景。

### 🤖 AI 驱动的内容创作
*   **智能大纲生成**：利用 AI 生成场景大纲和冲突，具备上下文感知的连贯性（考虑前序和后续场景）。
*   **电影级分镜拆解**：自动为任何场景生成分镜序列，可精确指定所需镜头数量。

### 🖼️ 视觉分镜与 AI 生成
*   **AI 图片生成**：将分镜描述转化为高质量的视觉参考图。
*   **AI 视频生成**：利用火山引擎 Ark API 将生成的图片转换为动图或短视频短片。
*   **批量操作**：一键为场景生成所有图片或视频。
*   **乐观交互流程**：支持快速取消和重新生成，确保流畅的创意迭代。

### 🛠️ 生产级特性
*   **任务持久化**：进行中的视频生成任务会自动保存并可在重启后自动恢复。
*   **并行处理**：支持同时处理多个生成任务。
*   **完善的国际化 (i18n)**：原生支持中英文双语切换。

## 🚀 快速入门

### 环境准备
*   Node.js (v18 或更高版本)
*   npm 或 yarn
*   API 密钥：火山引擎 Ark（用于视频生成）、OpenAI（用于文本和图片生成）。

### 安装步骤
1. 克隆仓库：
   ```bash
   git clone <repository-url>
   cd storyboard-maker
   ```
2. 安装依赖：
   ```bash
   npm install
   ```
3. 配置 API 密钥：
   启动应用并在**全局设置** (Global Settings) 弹窗中输入您的 API 密钥。

### 开发模式
```bash
npm run dev
```

### 打包构建
```bash
npm run build
```

## 🛠️ 技术栈
*   **框架**：[Electron](https://www.electronjs.org/)
*   **前端**：[React](https://reactjs.org/), [Ant Design](https://ant.design/)
*   **状态管理**：React Hooks & Context
*   **样式**：Vanilla CSS, Ant Design 设计令牌 (Tokens)
*   **AI API**：火山引擎 Ark, OpenAI

## 📄 开源协议
MIT License
