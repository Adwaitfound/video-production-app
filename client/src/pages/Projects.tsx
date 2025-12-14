import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectService } from '../services/projects';
import { Project } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/shared/Card';
import { Button } from '../components/shared/Button';
import { getStatusColor, formatDate } from '../utils/helpers';
import { Plus } from 'lucide-react';

export const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projectService.getAll();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading projects...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Manage your video production projects</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No projects yet. Create your first project to get started.
            </CardContent>
          </Card>
        ) : (
          projects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link to={`/projects/${project.id}`} className="text-xl font-semibold text-gray-900 hover:text-blue-600">
                      {project.title}
                    </Link>
                    <p className="text-gray-500 mt-1">{project.description}</p>
                    <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                      <span className="capitalize">{project.project_type.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>{project.company_name}</span>
                      {project.deadline && (
                        <>
                          <span>•</span>
                          <span>Due {formatDate(project.deadline)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(project.status)}`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
