import { GlobalSettings } from '../../../shared/types';


export const SettingsService = {
  getSettings: async (): Promise<GlobalSettings> => {
    return window.api.getSettings();
  },
  saveSettings: async (settings: GlobalSettings): Promise<boolean> => {
    return window.api.saveSettings(settings);
  }
};
