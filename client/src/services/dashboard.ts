import api from './api';
import { DashboardData } from '../types';

export const dashboardService = {
  async getAdminDashboard(): Promise<DashboardData> {
    const response = await api.get<DashboardData>('/dashboard/admin');
    return response.data;
  },

  async getClientDashboard(): Promise<any> {
    const response = await api.get('/dashboard/client');
    return response.data;
  }
};
