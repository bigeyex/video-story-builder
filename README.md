# AI Video Story Builder

[中文说明 (Chinese Version)](./README_zh.md)

AI Video Story Builder is a professional desktop application designed to streamline the workflow of creators from initial concept to a complete cinematic storyboard with AI-generated images and videos.

## 🌟 Key Features

### 🎬 Comprehensive Story Workspace
*   **World Settings**: Define the core themes, art style, and setting of your story.
*   **Character Management**: Create and maintain consistent character profiles with visual descriptions.
*   **Scene Organization**: Break down your story into manageable chapters and scenes.

### 🤖 AI-Powered Content Creation
*   **Intelligent Outlining**: Generate scene outlines and conflicts using AI, with context-aware continuity (considering previous and next scenes).
*   **Cinematic Shot Breakdown**: Automatically generate a sequence of shots for any scene, specifying exactly how many shots you need to cover the narrative.

### 🖼️ Visual Storyboarding & AI Generation
*   **AI Image Generation**: Transform shot descriptions into high-quality visual references.
*   **AI Video Generation**: Convert generated images into cinemagraphs and short video clips using VolcEngine Ark API.
*   **Batch Operations**: Generate all images or videos for a scene in one go.
*   **Optimistic Flow**: Fast cancellation and re-generation support for a smooth creative iteration.

### 🛠️ Production Ready
*   **Task Persistence**: In-progress video generation tasks are saved and resumed automatically.
*   **Parallel Processing**: Handle multiple generation tasks simultaneously.
*   **Full i18n Support**: Native English and Chinese localization.

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   npm or yarn
*   API Keys: VolcEngine Ark (for video generation), OpenAI (for text and image generation).

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd video-story-builder
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables/Settings:
   Launch the app and enter your API keys in the **Global Settings** modal.

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

## 🛠️ Technology Stack
*   **Framework**: [Electron](https://www.electronjs.org/)
*   **Frontend**: [React](https://reactjs.org/), [Ant Design](https://ant.design/)
*   **State Management**: React Hooks & Context
*   **Styling**: Vanilla CSS, Ant Design Tokens
*   **AI APIs**: VolcEngine Ark, OpenAI

## 📄 License
MIT License
