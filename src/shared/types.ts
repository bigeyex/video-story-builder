export interface ProjectMetadata {
  id: string;
  name: string;
  created: number;
  lastModified: number;
}

export interface Character {
  id: string;
  name: string;
  avatar?: string;
  background: string;
  personality: string;
  appearance: string;
  position: { x: number; y: number };
}

export interface Relationship {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface StoryboardShot {
  id: string;
  image?: string;
  description: string;
  dialogue: string;
  duration: number;
  camera: string;
  sound: string;
}

export interface Scene {
  id: string;
  title: string;
  outline: string;
  conflict: string;
  storyboard: StoryboardShot[];
}

export interface Chapter {
  id: string;
  title: string;
  scenes: Scene[];
}

export interface GlobalSettings {
  volcEngineApiKey: string;
  volcEngineModel: string;
  language?: string;
}

export interface Project extends ProjectMetadata {
  wordSettings: {
    targetAudience: string;
    artStyle: string;
    summary: string;
  };
  characters: Character[];
  relationships: Relationship[];
  chapters: Chapter[];
}

export interface API {
  getProjects: () => Promise<ProjectMetadata[]>;
  createProject: (name: string) => Promise<Project>;
  loadProject: (id: string) => Promise<Project | null>;
  saveProject: (project: Project) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  getAppPath: () => Promise<string>;
  getSettings: () => Promise<GlobalSettings>;
  saveSettings: (settings: GlobalSettings) => Promise<boolean>;
  generateAI: (type: string, params: any) => Promise<any>;
  generateImage: (prompt: string) => Promise<string>;
  openProjectsFolder: () => Promise<void>;
}
