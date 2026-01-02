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
  }
};
