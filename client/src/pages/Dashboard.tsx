import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/shared/Card';
import { DashboardData } from '../types';
import { formatCurrency, formatDate, getStatusColor } from '../utils/helpers';
import { DollarSign, FolderKanban, Users, FileText } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [clientData, setClientData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.role === 'admin' || user?.role === 'project_manager';

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isAdmin) {
          const dashboardData = await dashboardService.getAdminDashboard();
          setData(dashboardData);
        } else {
          const dashboardData = await dashboardService.getClientDashboard();
          setClientData(dashboardData);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  if (isLoading) {
    return <div className="text-center py-12">Loading dashboard...</div>;
  }

  if (isAdmin && data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.revenue.total || 0)}</div>
              <p className="text-xs text-green-600 mt-1">
                {formatCurrency(data.revenue.paid || 0)} paid
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Projects</CardTitle>
              <FolderKanban className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.projects.active}</div>
              <p className="text-xs text-gray-500 mt-1">
                {data.projects.total} total projects
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.clients.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Outstanding</CardTitle>
              <FileText className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(data.revenue.outstanding || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Projects by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.projects.byStatus.map((stat) => (
                  <div key={stat.status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(stat.status)}`}>
                        {stat.status.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="font-semibold">{stat.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Projects by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.projects.byType.map((stat) => (
                  <div key={stat.project_type} className="flex items-center justify-between">
                    <span className="capitalize">{stat.project_type.replace('_', ' ')}</span>
                    <span className="font-semibold">{stat.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivities.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent activities</p>
              ) : (
                data.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-gray-500">{activity.project_title}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {activity.user_name} • {formatDate(activity.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin && clientData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">My Projects</CardTitle>
              <FolderKanban className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientData.projects.list.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Invoiced</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(clientData.invoices.totals.total)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Outstanding</CardTitle>
              <FileText className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(clientData.invoices.totals.outstanding)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clientData.projects.list.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No projects yet</p>
              ) : (
                clientData.projects.list.map((project: any) => (
                  <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{project.title}</p>
                      <p className="text-sm text-gray-500 capitalize">{project.project_type.replace('_', ' ')}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientData.recentUpdates.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent updates</p>
              ) : (
                clientData.recentUpdates.map((update: any) => (
                  <div key={update.id} className="pb-3 border-b last:border-0">
                    <p className="font-medium">{update.title}</p>
                    <p className="text-sm text-gray-500">{update.project_title}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(update.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <div>Error loading dashboard</div>;
};
