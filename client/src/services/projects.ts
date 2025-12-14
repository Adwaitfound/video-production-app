import api from './api';
import { Project, ProjectUpdate, ProjectComment } from '../types';

export const projectService = {
  async getAll(): Promise<Project[]> {
    const response = await api.get<Project[]>('/projects');
    return response.data;
  },

  async getById(id: number): Promise<Project> {
    const response = await api.get<Project>(`/projects/${id}`);
    return response.data;
  },

  async create(project: Partial<Project>): Promise<Project> {
    const response = await api.post<Project>('/projects', project);
    return response.data;
  },

  async update(id: number, project: Partial<Project>): Promise<Project> {
    const response = await api.put<Project>(`/projects/${id}`, project);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/projects/${id}`);
  },

  async createUpdate(update: Partial<ProjectUpdate>): Promise<ProjectUpdate> {
    const response = await api.post<ProjectUpdate>('/updates', update);
    return response.data;
  },

  async getUpdate(id: number): Promise<ProjectUpdate> {
    const response = await api.get<ProjectUpdate>(`/updates/${id}`);
    return response.data;
  },

  async addComment(updateId: number, content: string): Promise<ProjectComment> {
    const response = await api.post<ProjectComment>(`/updates/${updateId}/comments`, { content });
    return response.data;
  }
};
