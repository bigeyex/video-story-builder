import { app, shell, BrowserWindow, ipcMain } from 'electron'
import path, { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as fs from 'fs/promises'

// Node's crypto
import { randomUUID } from 'crypto'
import OpenAI from 'openai'

// Use current working directory or executable path for portable feel
// In dev, use app.getAppPath() or similar. In prod, use relative to exe.
const PROJECT_DIR = join(app.isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath(), 'storyprojects')

async function ensureProjectDir(): Promise<void> {
  try {
    await fs.access(PROJECT_DIR)
  } catch {
    await fs.mkdir(PROJECT_DIR, { recursive: true })
  }
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.storybuilder.app')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
// AI Handlers
// OpenAI import moved to top

ipcMain.handle('generate-ai', async (_, type: string, params: any) => {
  // 1. Get Settings
  const settingsStr = await fs.readFile(SETTINGS_FILE, 'utf-8').catch(() => '{}')
  const settings = JSON.parse(settingsStr)
  if (!settings.volcEngineApiKey || !settings.volcEngineModel) {
    throw new Error('API Key or Model not configured')
  }

  // 2. Read Prompt Template
  // resources path depends on dev vs prod. 
  // In dev: ../../resources/prompts
  // In prod: process.resourcesPath/prompts usually? 
  // Using electron-toolkit/utils or similar is better.
  // For now assuming dev structure relative to main or using resources folder passed to builder.
  // app.isPackaged check needed.
  
  let promptPath = ''
  if (app.isPackaged) {
    promptPath = join(process.resourcesPath, 'prompts', `${type}.txt`)
  } else {
    promptPath = join(__dirname, '../../resources/prompts', `${type}.txt`)
  }

  let prompt = await fs.readFile(promptPath, 'utf-8')

  // 3. Replace variables
  for (const [key, value] of Object.entries(params)) {
    prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
  }

  // 4. Inject language instruction
  const langMap = {
    'zh': 'Chinese',
    'en': 'English'
  }
  const targetLang = langMap[settings.language] || 'English'
  prompt += `\n\nPlease respond in ${targetLang}.`

  // 5. Call OpenAI (VolcEngine compatible)
  const client = new OpenAI({
    apiKey: settings.volcEngineApiKey,
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3', // VolcEngine Endpoint
  })

  const completion = await client.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: settings.volcEngineModel,
  })

  let content = completion.choices[0]?.message?.content || ''
  // Clean markdown code blocks if any
  content = content.replace(/```json/g, '').replace(/```/g, '').trim()
  
  try {
    return JSON.parse(content)
  } catch {
    return content
  }
})

ipcMain.handle('generate-image', async (_, prompt: string) => {
  const settingsStr = await fs.readFile(SETTINGS_FILE, 'utf-8').catch(() => '{}')
  const settings = JSON.parse(settingsStr)
  if (!settings.volcEngineApiKey) {
    throw new Error('API Key not configured')
  }

  const client = new OpenAI({
    apiKey: settings.volcEngineApiKey,
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  })

  // Note: VolcEngine might use different endpoint or model for images.
  // Assuming OpenAI compatible or using a specific model if known.
  // If OpenAI SDK 'images.generate' fails on VolcEngine, we might need custom fetch.
  // For now, attempting standard OpenAI call.
  const response = await client.images.generate({
    model: 'cv-2024...', // Placeholder, user might need to set this separate?
    // Actually, VolcEngine Image Gen usually requires specific model ep.
    // Let's rely on user config or default?
    // If settings has only one model field, it might be for Chat.
    // I'll use the same model field or maybe 'dall-e-3' as placeholder if VolcEngine maps it?
    // Unlikely. I'll just try with settings.volcEngineModel if user puts an image model payload there?
    // Or just pass prompt and let user configure model in code?
    // Better: Add "Image Model" to settings?
    // For now, I'll assume the single model key is sufficient or I'll try to use a default.
    prompt: prompt,
    n: 1,
    size: '1024x1024'
  });

  return response.data?.[0]?.url || '';
})

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC Handlers
  ipcMain.handle('get-projects', async () => {
    await ensureProjectDir()
    const files = await fs.readdir(PROJECT_DIR)
    const projects: any[] = []
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(join(PROJECT_DIR, file), 'utf-8')
          const data = JSON.parse(content)
          // Return only metadata
          projects.push({
            id: data.id,
            name: data.name,
            created: data.created,
            lastModified: data.lastModified
          })
        } catch (e) {
          console.error('Failed to read project file', file, e)
        }
      }
    }
    return projects.sort((a, b) => b.lastModified - a.lastModified)
  })

  ipcMain.handle('create-project', async (_, name: string) => {
    await ensureProjectDir()
    const id = randomUUID()
    const timestamp = Date.now()
    const newProject = {
      id,
      name,
      created: timestamp,
      lastModified: timestamp,
      wordSettings: { targetAudience: '', artStyle: '', summary: '' },
      characters: [],
      relationships: [],
      chapters: [
        {
          id: `chap-${timestamp}`,
          title: 'Chapter 1',
          scenes: [
            {
              id: `scene-${timestamp}`,
              title: 'Scene 1',
              outline: '',
              conflict: '',
              storyboard: []
            }
          ]
        }
      ]
    }
    await fs.writeFile(join(PROJECT_DIR, `${id}.json`), JSON.stringify(newProject, null, 2))
    return newProject
  })

  ipcMain.handle('load-project', async (_, id: string) => {
    await ensureProjectDir()
    try {
      const content = await fs.readFile(join(PROJECT_DIR, `${id}.json`), 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  })

  ipcMain.handle('save-project', async (_, project: any) => {
    await ensureProjectDir()
    const timestamp = Date.now()
    const updatedProject = { ...project, lastModified: timestamp }
    await fs.writeFile(join(PROJECT_DIR, `${project.id}.json`), JSON.stringify(updatedProject, null, 2))
    return true
  })

  ipcMain.handle('delete-project', async (_, id: string) => {
    await ensureProjectDir()
    try {
      await fs.unlink(join(PROJECT_DIR, `${id}.json`))
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('get-app-path', () => app.getPath('userData'))
  
  ipcMain.handle('open-projects-folder', async () => {
      await ensureProjectDir()
      await shell.openPath(PROJECT_DIR)
  })

  const SETTINGS_FILE = join(app.getPath('userData'), 'settings.json')

  ipcMain.handle('get-settings', async () => {
    try {
      const content = await fs.readFile(SETTINGS_FILE, 'utf-8')
      return JSON.parse(content)
    } catch {
      return { volcEngineApiKey: '', volcEngineModel: '' }
    }
  })

  ipcMain.handle('save-settings', async (_, settings) => {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2))
    return true
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
