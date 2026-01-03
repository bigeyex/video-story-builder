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
  generateImage: (prompt: string) => ipcRenderer.invoke('generate-image', prompt),
  openProjectsFolder: () => ipcRenderer.invoke('open-projects-folder')
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
