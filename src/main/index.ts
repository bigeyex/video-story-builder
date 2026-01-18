import { app, shell, BrowserWindow, ipcMain, protocol } from 'electron'
import path, { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as fs from 'fs/promises'

// Node's crypto
import { randomUUID } from 'crypto'
import OpenAI from 'openai'
import { DEFAULT_MODELS, OLD_DEFAULT_MODELS } from '../shared/constants'

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
    title: 'Video Story Builder',
    width: 1350,
    height: 1005,
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
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
  const settingsStr = await fs.readFile(SETTINGS_FILE, 'utf-8').catch(() => '{}')
  const settings = JSON.parse(settingsStr)
  
  let textModelId = settings.textModelId || settings.volcEngineModel || DEFAULT_MODELS.text
  if (OLD_DEFAULT_MODELS.includes(textModelId)) {
    textModelId = DEFAULT_MODELS.text
  }
  
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
    
    let textModelId = settings.textModelId || settings.volcEngineModel || DEFAULT_MODELS.text
    if (OLD_DEFAULT_MODELS.includes(textModelId)) {
      textModelId = DEFAULT_MODELS.text
    }
    
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
      const delta = chunk.choices[0]?.delta as any
      const content = delta?.content || ''
      const reasoningContent = delta?.reasoning_content || ''

      if (reasoningContent) {
        event.sender.send('ai-stream-thinking', reasoningContent)
      }

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
    let imageModelId = settings.imageModelId || DEFAULT_MODELS.image
    if (OLD_DEFAULT_MODELS.includes(imageModelId)) {
      imageModelId = DEFAULT_MODELS.image
    }

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

  ipcMain.handle('generate-character-design', async (_, prompt: string, projectId: string, characterId: string) => {
    const settingsStr = await fs.readFile(SETTINGS_FILE, 'utf-8').catch(() => '{}')
    const settings = JSON.parse(settingsStr)
    let imageModelId = settings.imageModelId || DEFAULT_MODELS.image
    if (OLD_DEFAULT_MODELS.includes(imageModelId)) {
      imageModelId = DEFAULT_MODELS.image
    }

    if (!settings.volcEngineApiKey) {
      throw new Error('API Key not configured')
    }

    const client = new OpenAI({
      apiKey: settings.volcEngineApiKey,
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    })

    // Generate a comprehensive character design sheet
    const designPrompt = `Character design sheet with three distinct views: Front, Side, and Back. ${prompt}. Full body character design. The three views must be standing side-by-side with clear separation and NO OVERLAP. Clean white background. Professional concept art style.`

    const response = await client.images.generate({
      model: imageModelId,
      prompt: designPrompt,
      n: 1,
      size: '2048x2048' as any
    });

    const url = response.data?.[0]?.url || '';
    if (!url || !projectId || !characterId) return url;

    try {
      const designDir = join(PROJECT_DIR, projectId, 'designs');
      await fs.mkdir(designDir, { recursive: true });
      
      const fileName = `${characterId}_design_${Date.now()}.png`;
      const filePath = join(designDir, fileName);
      
      const imgRes = await fetch(url);
      const buffer = await imgRes.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(buffer));
      
      // Return relative path: {projectId}/designs/{fileName}
      return `${projectId}/designs/${fileName}`;
    } catch (e) {
      console.error('Failed to save character design locally:', e);
      return url;
    }
  })

  ipcMain.handle('generate-shot-image', async (_, params: { projectId: string, prompt: string, shotId: string, characters: any[] }) => {
    const { projectId, prompt, shotId, characters } = params;
    const settingsStr = await fs.readFile(SETTINGS_FILE, 'utf-8').catch(() => '{}')
    const settings = JSON.parse(settingsStr)
    // Use user settings or default to a model that supports reference images if possible
    // Doubao-Seedream-4.5 supports multi-reference
    let imageModelId = settings.imageModelId || DEFAULT_MODELS.image
    if (OLD_DEFAULT_MODELS.includes(imageModelId)) {
      imageModelId = DEFAULT_MODELS.image
    }

    if (!settings.volcEngineApiKey) {
      throw new Error('API Key not configured')
    }

    const client = new OpenAI({
      apiKey: settings.volcEngineApiKey,
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    })

    // 1. Load project to check for existing reference IDs (source of truth)
    const projectPath = join(PROJECT_DIR, projectId, 'project.json');
    let projectCharacters: any[] = [];
    try {
        const projectContent = await fs.readFile(projectPath, 'utf-8');
        const project = JSON.parse(projectContent);
        projectCharacters = project.characters || [];
    } catch (e) {
        console.error('Failed to load project for characters:', e);
        projectCharacters = characters; // Fallback to params
    }

    // 2. Identify chars and upload references
    const updatedCharacters: any[] = [];
    const references: any[] = [];
    let hasUpdates = false;

    // We iterate over the characters from project file to ensure we use persisted IDs
    // But we only care about characters mentioned in the prompt
    for (const char of projectCharacters) {
      if (prompt.toLowerCase().includes(char.name.toLowerCase())) {
        if (char.characterDesign) {
            let refId = char.volcRefId;

            // If no ref ID but we have a design file, upload it
            if (!refId && char.characterDesign) {
                try {
                    const fullPath = join(PROJECT_DIR, char.characterDesign);
                    
                    // We need a File-like object. 'fs.createReadStream' is standard in Node.
                    const { createReadStream } = require('fs');
                    const fileStream = createReadStream(fullPath);

                    const fileRes = await client.files.create({
                        file: fileStream,
                        purpose: 'user_data' 
                    });
                    
                    refId = fileRes.id;
                    char.volcRefId = refId;
                    updatedCharacters.push(char);
                    hasUpdates = true;
                    console.log(`Uploaded design for ${char.name}: ${refId}`);
                } catch (e) {
                    console.error(`Failed to upload design for ${char.name}:`, e);
                }
            } else if (refId) {
                // Already has ID, good.
            }

            if (refId) {
                references.push({
                    image_id: refId,
                    image_ref_type: 'character' 
                });
            }
        }
      }
    }

    // 3. Persist updated characters (ref IDs)
    if (hasUpdates) {
        try {
            const projectContent = await fs.readFile(projectPath, 'utf-8');
            const project = JSON.parse(projectContent);
            
            // Update characters in project
            project.characters = project.characters.map(c => {
                const updated = updatedCharacters.find(uc => uc.id === c.id);
                return updated ? { ...c, volcRefId: updated.volcRefId } : c;
            })
            
            await fs.writeFile(projectPath, JSON.stringify(project, null, 2));
        } catch (e) {
            console.error('Failed to save updated reference IDs:', e);
        }
    }

    // 3. Generate Image
    // VolcEngine Doubao specific: How to pass references?
    // The standard OpenAI SDK 'images.generate' only accepts prompt/n/size/model/response_format/user/quality/style.
    // We strictly need to pass 'references' in the body.
    // The SDK allows extra body parameters if we cast or use custom request?
    // Actually, simple hack: just pass it. TS might complain, so we cast to any.
    
    // Note: VolcEngine docs say parameters are usually snake_case.
    // Common extension: req_key OR references
    
    // Based on recent VolcEngine usage (e.g. SeedEdit), it might be 'references'.
    // If strict OpenAI SDK strips unknown keys, we might fail.
    // But 'client.images.generate' usually takes 'options' which can have extra props? No.
    // We should use `client.post` if supported or assume the SDK passes through unknown props?
    // The safest way with the configured client is to assume it might not pass unknown props,
    // but typically OpenAI wrappers do allow extra fields in some versions or via 'extra_body' logic isn't explicit in basic 'generate'.
    
    // HOWEVER, for `images.generate`, there's no `extra_body` arg in standard signature. 
    // We will try to pass it in the object and cast to any.
    
    const requestBody: any = {
        model: imageModelId,
        prompt: prompt,
        n: 1,
        size: '2048x2048',
    };

    if (references.length > 0) {
        // VolcEngine convention for character ref
        // refs: [{ image_id: "...", image_ref_type: "character" }]
        requestBody.references = references;
    }

    const response = await client.images.generate(requestBody);

    const url = response.data?.[0]?.url || '';
    
    if (!url) {
        // Return empty or throw
        throw new Error('No image generated');
    }

    // 4. Save Image Locally
    try {
      // Re-use avatars or 'assets'? Let's use 'avatars' for simplicity or 'shots'
      const shotsDir = join(PROJECT_DIR, projectId, 'shots');
      await fs.mkdir(shotsDir, { recursive: true });
      
      const fileName = `shot_${shotId}_${Date.now()}.png`;
      const filePath = join(shotsDir, fileName);
      
      const imgRes = await fetch(url);
      const buffer = await imgRes.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(buffer));
      
      // Return relative path
      return { 
          url: `${projectId}/shots/${fileName}`,
          updatedCharacters // Return these so frontend can update its state
      };
    } catch (e) {
      console.error('Failed to save shot locally:', e);
      return { url, updatedCharacters }; 
    }
  })

const activeVideoPolls = new Map<string, { controller: AbortController, sender: Electron.WebContents }>()

async function startVideoPolling(params: {
    projectId: string,
    shotId: string,
    taskId: string,
    apiKey: string,
    eventSender: Electron.WebContents
}) {
    const { projectId, shotId, taskId, apiKey, eventSender } = params;
    
    // If already polling, just update the sender and return
    if (activeVideoPolls.has(taskId)) {
        const entry = activeVideoPolls.get(taskId);
        if (entry) entry.sender = eventSender;
        return;
    }
    
    const controller = new AbortController();
    activeVideoPolls.set(taskId, { controller, sender: eventSender });
    
    const sendUpdate = (channel: string, data: any) => {
        const entry = activeVideoPolls.get(taskId);
        if (entry && !entry.sender.isDestroyed()) {
            entry.sender.send(channel, data);
        }
    };

    let pollCount = 0;
    try {
        while (!controller.signal.aborted) {
            pollCount++;
            const statusRes = await fetch(`https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/${taskId}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                signal: controller.signal
            });

            if (!statusRes.ok) {
                console.warn(`[Poll ${pollCount}] Polling failed for task ${taskId}, retrying...`);
            } else {
                const statusData: any = await statusRes.json();
                const status = statusData.status;
                console.log(`[Poll ${pollCount}] Task ${taskId} status: ${status}`);
                
                if (status === 'succeeded') {
                    console.log(`[Poll ${pollCount}] Video generation succeeded. Full response:`, JSON.stringify(statusData, null, 2));
                    const videoUrl = statusData.content?.video_url;
                    
                    if (videoUrl) {
                        try {
                            const videoDir = join(PROJECT_DIR, projectId, 'videos');
                            await fs.mkdir(videoDir, { recursive: true });
                            
                            const fileName = `video_${shotId}_${Date.now()}.mp4`;
                            const filePath = join(videoDir, fileName);
                            
                            const videoFileRes = await fetch(videoUrl);
                            const buffer = await videoFileRes.arrayBuffer();
                            await fs.writeFile(filePath, Buffer.from(buffer));
                            
                            const relativeVideoUrl = `${projectId}/videos/${fileName}`;
                            sendUpdate('video-status-update', { projectId, shotId, status: 'succeeded', videoUrl: relativeVideoUrl });
                        } catch (e) {
                            console.error('Failed to save video locally:', e);
                            sendUpdate('video-status-update', { projectId, shotId, status: 'succeeded', videoUrl }); 
                        }
                        break;
                    } else {
                        sendUpdate('video-status-update', { projectId, shotId, status: 'failed', error: 'Video URL not found in response' });
                        break;
                    }
                } else if (status === 'failed') {
                    console.error(`[Poll ${pollCount}] Video generation failed:`, JSON.stringify(statusData, null, 2));
                    sendUpdate('video-status-update', { projectId, shotId, status: 'failed', error: statusData.error_message || 'Unknown error' });
                    break;
                } else {
                    sendUpdate('video-status-update', { projectId, shotId, status });
                }
            }

            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    } catch (e: any) {
        if (e.name === 'AbortError') {
            console.log(`Video polling aborted for task: ${taskId}`);
        } else {
            console.error(`Error polling video task ${taskId}:`, e);
            sendUpdate('video-status-update', { projectId, shotId, status: 'failed', error: e.message });
        }
    } finally {
        activeVideoPolls.delete(taskId);
    }
}

  ipcMain.handle('generate-shot-video', async (event, params: { projectId: string, prompt: string, shotId: string, imageUrl: string, dialogue?: string, duration?: number, ratio?: string, camera?: string, sound?: string }) => {
    const { projectId, prompt, shotId, imageUrl, dialogue, duration, ratio, camera, sound } = params;
    const settingsStr = await fs.readFile(SETTINGS_FILE, 'utf-8').catch(() => '{}')
    const settings = JSON.parse(settingsStr)
    let videoModelId = settings.videoModelId || DEFAULT_MODELS.video
    if (OLD_DEFAULT_MODELS.includes(videoModelId)) {
      videoModelId = DEFAULT_MODELS.video
    }

    if (!settings.volcEngineApiKey) {
      throw new Error('API Key not configured')
    }

    // 1. Prepare Image Base64
    let imageDataUrl = '';
    if (imageUrl) {
        try {
            const relativePath = imageUrl.replace('story-asset://', '');
            const fullPath = join(PROJECT_DIR, relativePath);
            
            const ext = path.extname(fullPath).toLowerCase().replace('.', '') || 'png';
            const format = ext === 'jpg' ? 'jpeg' : ext;
            const buffer = await fs.readFile(fullPath);
            const base64 = buffer.toString('base64');
            imageDataUrl = `data:image/${format};base64,${base64}`;
            
            console.log(`Encoded reference image for video: ${fullPath} (${format})`);
        } catch (e) {
            console.error('Failed to encode reference image for video:', e);
        }
    }

    // 2. Prepare Combined Prompt with Metadata
    let finalPrompt = prompt;
    if (camera) finalPrompt += `. Camera: ${camera}`;
    if (sound) finalPrompt += `. Sound/Atmosphere: ${sound}`;
    
    if (dialogue) {
        // Find if dialogue already has quotes, if not wrap it
        let cleanDialogue = dialogue.trim();
        // Check for both English and Chinese quotes
        if (!/^["“].*["”]$/.test(cleanDialogue)) {
            // Check if it has character name part already: Name: "Content"
            if (cleanDialogue.includes(':')) {
                const parts = cleanDialogue.split(':');
                const charPart = parts[0].trim();
                const contentPart = parts.slice(1).join(':').trim();
                if (!/^["“].*["”]$/.test(contentPart)) {
                    cleanDialogue = `${charPart}: "${contentPart}"`;
                }
            } else {
                cleanDialogue = `"${cleanDialogue}"`;
            }
        }
        finalPrompt += `. Dialogue: ${cleanDialogue}`;
    }

    // 3. Create Video Task
    const requestBody: any = {
        model: videoModelId,
        content: [
            {
                "type": "image_url",
                "image_url": {
                  "url": imageDataUrl
                }
            },
            {
                "type": "text",
                "text": finalPrompt
            }
        ],
        duration: duration || 5,
        ratio: ratio || "16:9"
    };

    const createTaskRes = await fetch('https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${settings.volcEngineApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!createTaskRes.ok) {
        const error = await createTaskRes.text();
        throw new Error(`Failed to create video task: ${error}`);
    }

    const taskData: any = await createTaskRes.json();
    const taskId = taskData.id;
    if (!taskId) throw new Error('No task ID returned');

    // 3. Start Background Polling
    startVideoPolling({
        projectId,
        shotId,
        taskId,
        apiKey: settings.volcEngineApiKey,
        eventSender: event.sender
    });

    return taskId;
  })

  ipcMain.handle('cancel-video-task', (_, taskId: string) => {
    const entry = activeVideoPolls.get(taskId);
    if (entry) {
        entry.controller.abort();
        activeVideoPolls.delete(taskId);
        return true;
    }
    return false;
  })

  ipcMain.handle('resume-project-video-polling', async (event, projectId: string) => {
    const settingsStr = await fs.readFile(SETTINGS_FILE, 'utf-8').catch(() => '{}')
    const settings = JSON.parse(settingsStr)
    const apiKey = settings.volcEngineApiKey;
    if (!apiKey) return;

    try {
        const projectPath = join(PROJECT_DIR, projectId, 'project.json');
        const projectContent = await fs.readFile(projectPath, 'utf-8');
        const project = JSON.parse(projectContent);
        
        // Iterate through all chapters and scenes
        for (const chapter of project.chapters) {
            for (const scene of chapter.scenes) {
                const scenePath = join(PROJECT_DIR, projectId, 'scenes', `${scene.id}.json`);
                try {
                    const sceneContent = await fs.readFile(scenePath, 'utf-8');
                    const storyboard = JSON.parse(sceneContent);
                    
                    if (Array.isArray(storyboard)) {
                        for (const shot of storyboard) {
                            if (shot.videoTaskId && !shot.video && shot.videoStatus !== 'failed') {
                                startVideoPolling({
                                    projectId,
                                    shotId: shot.id,
                                    taskId: shot.videoTaskId,
                                    apiKey,
                                    eventSender: event.sender
                                });
                            }
                        }
                    }
                } catch (e) {
                    // Ignore missing or invalid scene files
                    console.debug(`Could not load scene ${scene.id} for polling resumption:`, e);
                }
            }
        }
    } catch (e) {
        console.error('Failed to resume project video polling:', e);
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

    // Split storyboards and collect save promises
    const savePromises: Promise<void>[] = []
    const chapters = project.chapters.map(chap => ({
      ...chap,
      scenes: chap.scenes.map(scene => {
        const { storyboard, ...sceneRest } = scene
        if (storyboard && storyboard.length > 0) {
          const sceneFile = join(scenesDir, `${scene.id}.json`)
          // Save storyboard separately
          savePromises.push(fs.writeFile(sceneFile, JSON.stringify(storyboard, null, 2)))
        }
        return { ...sceneRest, storyboard: [] } // Empty in project.json
      })
    }))

    await Promise.all(savePromises)

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
