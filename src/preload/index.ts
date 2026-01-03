import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getProjects: () => ipcRenderer.invoke('get-projects'),
  createProject: (name: string) => ipcRenderer.invoke('create-project', name),
  loadProject: (id: string) => ipcRenderer.invoke('load-project', id),
  saveProject: (project: any) => ipcRenderer.invoke('save-project', project),
  deleteProject: (id: string) => ipcRenderer.invoke('delete-project', id),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  generateAI: (type: string, params: any) => ipcRenderer.invoke('generate-ai', type, params),
  generateImage: (prompt: string, projectId: string, characterId: string) => ipcRenderer.invoke('generate-image', prompt, projectId, characterId),
  openProjectsFolder: () => ipcRenderer.invoke('open-projects-folder'),
  uploadImage: (projectId: string, filePath: string) => ipcRenderer.invoke('upload-image', projectId, filePath),
  loadSceneStoryboard: (projectId: string, sceneId: string) => ipcRenderer.invoke('load-scene-storyboard', projectId, sceneId),
  generateAIStream: (type: string, params: any) => ipcRenderer.send('generate-ai-stream', type, params),
  onAIStreamChunk: (callback: (chunk: string) => void) => {
    const listener = (_: any, chunk: string) => callback(chunk)
    ipcRenderer.on('ai-stream-chunk', listener)
    return () => ipcRenderer.removeListener('ai-stream-chunk', listener)
  },
  onAIStreamEnd: (callback: (fullContent: string) => void) => {
    const listener = (_: any, fullContent: string) => callback(fullContent)
    ipcRenderer.on('ai-stream-end', listener)
    return () => ipcRenderer.removeListener('ai-stream-end', listener)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    // @ts-ignore
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
