import { app, shell, BrowserWindow, ipcMain, protocol } from 'electron'
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

// Register custom protocol for local assets
protocol.registerSchemesAsPrivileged([
  { scheme: 'story-asset', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
])

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
    width: 1350,
    height: 1005,
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
app.whenReady().then(async () => {
  
  console.log('Projects directory:', PROJECT_DIR)

  // Handle story-asset protocol
    protocol.handle('story-asset', async (request) => {
    let url = request.url.replace('story-asset://', '')
    // Strip file:// if somehow injected (happened in some edge cases)
    url = url.replace(/^file:\/\/\/?/, '')
    
    // On Windows, URLs might have encoded backslashes
    const decodedPath = decodeURIComponent(url)
    
    // If it's already an absolute path and starts with PROJECT_DIR, use it
    // Otherwise, join with PROJECT_DIR
    let absolutePath = decodedPath
    if (!path.isAbsolute(decodedPath)) {
      absolutePath = join(PROJECT_DIR, decodedPath)
    } else {
      // Normalize to handle potential /D:/ drive letter issues
      absolutePath = path.normalize(decodedPath)
    }

    if (!absolutePath.toLowerCase().startsWith(PROJECT_DIR.toLowerCase())) {
      console.error('Forbidden access to:', absolutePath, 'PROJECT_DIR:', PROJECT_DIR)
      return new Response('Forbidden', { status: 403 })
    }

    try {
      const data = await fs.readFile(absolutePath)
      const ext = path.extname(absolutePath).toLowerCase()
      let contentType = 'application/octet-stream'

      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg'
      else if (ext === '.png') contentType = 'image/png'
      else if (ext === '.gif') contentType = 'image/gif'
      else if (ext === '.webp') contentType = 'image/webp'
      else if (ext === '.svg') contentType = 'image/svg+xml'

      return new Response(data, {
        headers: { 'Content-Type': contentType }
      })
    } catch (e) {
      console.error('Failed to read story-asset:', e)
      return new Response('Not Found', { status: 404 })
    }
  })
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.storybuilder.app')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
// AI Handlers
// OpenAI import moved to top

const activeAIStreams = new Map<string, AbortController>()

ipcMain.handle('cancel-ai', (_, requestId: string) => {
  const controller = activeAIStreams.get(requestId)
  if (controller) {
    controller.abort()
    activeAIStreams.delete(requestId)
    console.log(`Aborted AI request: ${requestId}`)
    return true
  }
  return false
})

ipcMain.handle('generate-ai', async (_, type: string, params: any) => {
  // 1. Get Settings
  const settingsStr = await fs.readFile(SETTINGS_FILE, 'utf-8').catch(() => '{}')
  const settings = JSON.parse(settingsStr)
  const textModelId = settings.textModelId || settings.volcEngineModel || 'doubao-seed-1-6-251015'
  
  if (!settings.volcEngineApiKey) {
    throw new Error('API Key not configured')
  }

  // 2. Read Prompt Template
  // ... (lines 76-89)
  
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
    'zh-CN': 'Chinese',
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
    model: textModelId,
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

ipcMain.on('generate-ai-stream', async (event, type: string, params: any) => {
  let fullContent = ''
  try {
    const settingsStr = await fs.readFile(SETTINGS_FILE, 'utf-8').catch(() => '{}')
    const settings = JSON.parse(settingsStr)
    const textModelId = settings.textModelId || settings.volcEngineModel || 'doubao-seed-1-6-251015'
    
    if (!settings.volcEngineApiKey) {
      throw new Error('API Key not configured')
    }

    let promptPath = ''
    if (app.isPackaged) {
      promptPath = join(process.resourcesPath, 'prompts', `${type}.txt`)
    } else {
      promptPath = join(__dirname, '../../resources/prompts', `${type}.txt`)
    }

    let prompt = await fs.readFile(promptPath, 'utf-8')
    for (const [key, value] of Object.entries(params)) {
      prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
    }

    const langMap = { 'zh': 'Chinese', 'zh-CN': 'Chinese', 'en': 'English' }
    const targetLang = langMap[settings.language] || 'English'
    prompt += `\n\nPlease respond in ${targetLang}.`

    const client = new OpenAI({
      apiKey: settings.volcEngineApiKey,
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    })

    const requestId = params.requestId || `req-${Date.now()}`
    
    const controller = new AbortController()
    activeAIStreams.set(requestId, controller)


    const stream = await client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: textModelId,
      stream: true,
    }, { signal: controller.signal })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      if (content) {
        fullContent += content
        event.sender.send('ai-stream-chunk', content)
      }
    }
    event.sender.send('ai-stream-end', fullContent)
  } catch (e: any) {
    if (e.name === 'AbortError') {
      console.log('Stream aborted')
      event.sender.send('ai-stream-end', fullContent) // Send whatever we have
    } else {
      console.error('Streaming AI error:', e)
      event.sender.send('ai-stream-error', e.message || String(e))
    }
  } finally {
    if (params.requestId) {
        activeAIStreams.delete(params.requestId)
    }
  }
})

  ipcMain.handle('generate-image', async (_, prompt: string, projectId: string, characterId: string) => {
    const settingsStr = await fs.readFile(SETTINGS_FILE, 'utf-8').catch(() => '{}')
    const settings = JSON.parse(settingsStr)
    const imageModelId = settings.imageModelId || 'doubao-seedream-4-5-251128'

    if (!settings.volcEngineApiKey) {
      throw new Error('API Key not configured')
    }

    const client = new OpenAI({
      apiKey: settings.volcEngineApiKey,
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    })

    const response = await client.images.generate({
      model: imageModelId,
      prompt: prompt,
      n: 1,
      size: '2048x2048' as any
    });

    const url = response.data?.[0]?.url || '';
    if (!url || !projectId || !characterId) return url;

    try {
      const avatarDir = join(PROJECT_DIR, projectId, 'avatars');
      await fs.mkdir(avatarDir, { recursive: true });
      
      const fileName = `${characterId}_${Date.now()}.png`;
      const filePath = join(avatarDir, fileName);
      
      const imgRes = await fetch(url);
      const buffer = await imgRes.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(buffer));
      
      // Return relative path: {projectId}/avatars/{fileName}
      return `${projectId}/avatars/${fileName}`;
    } catch (e) {
      console.error('Failed to save avatar locally:', e);
      return url;
    }
  })

  ipcMain.handle('upload-image', async (_, projectId: string, filePath: string) => {
    const { nativeImage } = require('electron')
    try {
      const img = nativeImage.createFromPath(filePath)
      if (img.isEmpty()) throw new Error('Failed to load image')

      // Compress/Resize: Max width 1024
      const size = img.getSize()
      let finalImg = img
      if (size.width > 1024) {
        finalImg = img.resize({ width: 1024 })
      }

      const avatarDir = join(PROJECT_DIR, projectId, 'avatars')
      await fs.mkdir(avatarDir, { recursive: true })
      
      const fileName = `upload_${Date.now()}.png`
      const relativePath = `${projectId}/avatars/${fileName}`
      const absolutePath = join(PROJECT_DIR, relativePath)
      
      await fs.writeFile(absolutePath, finalImg.toPNG())
      return `story-asset://${relativePath}`
    } catch (e) {
      console.error('Failed to upload image:', e)
      throw e
    }
  })

  ipcMain.handle('load-scene-storyboard', async (_, projectId: string, sceneId: string) => {
    const filePath = join(PROJECT_DIR, projectId, 'scenes', `${sceneId}.json`)
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return []
    }
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC Handlers
  const migrateProjects = async () => {
    await ensureProjectDir()
    const files = await fs.readdir(PROJECT_DIR)
    for (const file of files) {
      if (file.endsWith('.json') && file !== 'settings.json') {
        const id = file.replace('.json', '')
        const oldPath = join(PROJECT_DIR, file)
        const newDir = join(PROJECT_DIR, id)
        const newPath = join(newDir, 'project.json')

        try {
          await fs.mkdir(newDir, { recursive: true })
          await fs.rename(oldPath, newPath)
          console.log(`Migrated project ${id} to subfolder`)
        } catch (e) {
          console.error(`Failed to migrate project ${id}`, e)
        }
      }
    }
  }

  await migrateProjects()

  ipcMain.handle('get-projects', async () => {
    await ensureProjectDir()
    const entries = await fs.readdir(PROJECT_DIR, { withFileTypes: true })
    const projects: any[] = []
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectPath = join(PROJECT_DIR, entry.name, 'project.json')
        try {
          const content = await fs.readFile(projectPath, 'utf-8')
          const data = JSON.parse(content)
          projects.push({
            id: data.id,
            name: data.name,
            created: data.created,
            lastModified: data.lastModified
          })
        } catch (e) {
          // Skip directories that don't have project.json
        }
      }
    }
    return projects.sort((a, b) => b.lastModified - a.lastModified)
  })

  ipcMain.handle('create-project', async (_, name: string) => {
    await ensureProjectDir()
    const id = randomUUID()
    const timestamp = Date.now()
    const projectDir = join(PROJECT_DIR, id)
    await fs.mkdir(projectDir, { recursive: true })
    await fs.mkdir(join(projectDir, 'scenes'), { recursive: true })

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
    await fs.writeFile(join(projectDir, 'project.json'), JSON.stringify(newProject, null, 2))
    return newProject
  })

  ipcMain.handle('load-project', async (_, id: string) => {
    await ensureProjectDir()
    try {
      const content = await fs.readFile(join(PROJECT_DIR, id, 'project.json'), 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  })

  ipcMain.handle('save-project', async (_, project: any) => {
    await ensureProjectDir()
    const timestamp = Date.now()
    const projectDir = join(PROJECT_DIR, project.id)
    const scenesDir = join(projectDir, 'scenes')
    await fs.mkdir(scenesDir, { recursive: true })

    // Split storyboards
    const chapters = project.chapters.map(chap => ({
      ...chap,
      scenes: chap.scenes.map(scene => {
        const { storyboard, ...sceneRest } = scene
        if (storyboard) {
          const sceneFile = join(scenesDir, `${scene.id}.json`)
          // Save storyboard separately
          fs.writeFile(sceneFile, JSON.stringify(storyboard, null, 2))
        }
        return { ...sceneRest, storyboard: [] } // Empty in project.json
      })
    }))

    const updatedProject = { ...project, chapters, lastModified: timestamp }
    await fs.writeFile(join(projectDir, 'project.json'), JSON.stringify(updatedProject, null, 2))
    return true
  })

  ipcMain.handle('delete-project', async (_, id: string) => {
    await ensureProjectDir()
    try {
      await fs.rm(join(PROJECT_DIR, id), { recursive: true, force: true })
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
