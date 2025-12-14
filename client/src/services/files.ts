import api from './api';
import { ProjectFile } from '../types';

export const fileService = {
  async upload(projectId: number, file: File, updateId?: number): Promise<ProjectFile> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', projectId.toString());
    if (updateId) {
      formData.append('update_id', updateId.toString());
    }

    const response = await api.post<ProjectFile>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  async download(id: number): Promise<Blob> {
    const response = await api.get(`/files/download/${id}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  async getById(id: number): Promise<ProjectFile> {
    const response = await api.get<ProjectFile>(`/files/${id}`);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/files/${id}`);
  }
};
