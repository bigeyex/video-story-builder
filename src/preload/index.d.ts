import { ElectronAPI } from '@electron-toolkit/preload'
import { API, GlobalSettings } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
