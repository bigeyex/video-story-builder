import { Project, ProjectMetadata } from '../../../shared/types';



export const ProjectService = {
  getProjects: async (): Promise<ProjectMetadata[]> => {
    return window.api.getProjects();
  },

  createProject: async (name: string): Promise<Project> => {
    return window.api.createProject(name);
  },

  loadProject: async (id: string): Promise<Project | null> => {
    return window.api.loadProject(id);
  },

  saveProject: async (project: Project): Promise<boolean> => {
    return window.api.saveProject(project);
  },

  deleteProject: async (id: string): Promise<boolean> => {
    return window.api.deleteProject(id);
  },

  openProjectsFolder: async (): Promise<void> => {
    return window.api.openProjectsFolder();
  },
  
  loadSceneStoryboard: async (projectId: string, sceneId: string): Promise<any> => {
    return window.api.loadSceneStoryboard(projectId, sceneId);
  },
  
  uploadImage: async (projectId: string, filePath: string): Promise<string> => {
    return window.api.uploadImage(projectId, filePath);
  }
};
