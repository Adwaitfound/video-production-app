'use client';

import React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/shared/status-badge"
import { Plus, Search, Calendar, DollarSign, Loader2, FolderKanban, Video, Share2, Palette, Eye, Edit, Trash2, Users, FileText, CheckSquare, Upload, TrendingUp, Clock, AlertCircle, ExternalLink, Image, File as FileIcon, Target, UserCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Project, Client, ProjectStatus, ServiceType, ProjectFile, Milestone, User } from "@/types"
import { SERVICE_TYPES } from "@/types"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { FileManager } from "@/components/projects/file-manager"

export default function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projectFiles, setProjectFiles] = useState<Record<string, ProjectFile[]>>({})
  const [projectMilestones, setProjectMilestones] = useState<Record<string, Milestone[]>>({})
  const [projectCreators, setProjectCreators] = useState<Record<string, User>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [serviceFilter, setServiceFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false)
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false)
  const [projectTeam, setProjectTeam] = useState<Record<string, User[]>>({})
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState("")
  const [teamRole, setTeamRole] = useState("")
  const [milestoneFormData, setMilestoneFormData] = useState({
    title: "",
    description: "",
    due_date: "",
  })

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    description: "",
    service_type: "video_production" as ServiceType,
    budget: "",
    start_date: "",
    deadline: "",
    status: "planning" as ProjectStatus,
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const supabase = createClient()
    setLoading(true)

    try {
      // Fetch projects with client data
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*, clients(company_name, contact_person)')
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError

      // Fetch clients for dropdown
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')
        .order('company_name')

      if (clientsError) throw clientsError

      setProjects(projectsData || [])
      setClients(clientsData || [])

      // Fetch recent files for the listed projects
      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map((p) => p.id)
        const { data: filesData, error: filesError } = await supabase
          .from('project_files')
          .select('*')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })

        if (filesError) throw filesError

        const grouped = (filesData || []).reduce((acc, file) => {
          acc[file.project_id] = acc[file.project_id] || []
          acc[file.project_id].push(file as ProjectFile)
          return acc
        }, {} as Record<string, ProjectFile[]>)

        setProjectFiles(grouped)
      }

      // Fetch milestones for projects
      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map((p) => p.id)
        const { data: milestonesData, error: milestonesError } = await supabase
          .from('milestones')
          .select('*')
          .in('project_id', projectIds)
          .order('due_date', { ascending: true })

        if (milestonesError) {
          console.warn('Milestones table not available:', milestonesError.message)
        } else {
          const groupedMilestones = (milestonesData || []).reduce((acc, milestone) => {
            acc[milestone.project_id] = acc[milestone.project_id] || []
            acc[milestone.project_id].push(milestone as Milestone)
            return acc
          }, {} as Record<string, Milestone[]>)

          setProjectMilestones(groupedMilestones)
        }
      }

      // Fetch creator info for projects
      if (projectsData && projectsData.length > 0) {
        const creatorIds = [...new Set(projectsData.map((p) => p.created_by).filter(Boolean))] as string[]
        if (creatorIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('*')
            .in('id', creatorIds)

          if (usersError) throw usersError

          const creatorsMap = (usersData || []).reduce((acc, user) => {
            acc[user.id] = user as User
            return acc
          }, {} as Record<string, User>)

          setProjectCreators(creatorsMap)
        }
      }

      // Fetch project team members
      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map((p) => p.id)
        const { data: teamData, error: teamError } = await supabase
          .from('project_team')
          .select('project_id, user_id, users(id, email, full_name, avatar_url, role)')
          .in('project_id', projectIds)

        if (teamError) {
          console.warn('Project team table not available:', teamError.message)
        } else {
          const teamMap = (teamData || []).reduce((acc, assignment: any) => {
            if (!acc[assignment.project_id]) {
              acc[assignment.project_id] = []
            }
            if (assignment.users) {
              acc[assignment.project_id].push(assignment.users as User)
            }
            return acc
          }, {} as Record<string, User[]>)

          setProjectTeam(teamMap)
        }
      }

      // Fetch all users for team assignment (only admins/PMs)
      if (user?.role === 'admin') {
        const { data: allUsers, error: usersError } = await supabase
          .from('users')
          .select('*')
          .in('role', ['admin', 'project_manager'])
          .order('full_name')

        if (usersError) throw usersError
        setAvailableUsers(allUsers || [])
      }
    } catch (error: any) {
      console.error('Error fetching data:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          name: formData.name,
          client_id: formData.client_id,
          description: formData.description,
          service_type: formData.service_type,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          start_date: formData.start_date || null,
          deadline: formData.deadline || null,
          status: formData.status,
          progress_percentage: 0,
          created_by: user?.id,
        }])
        .select()

      if (error) throw error

      // Refresh projects list
      await fetchData()

      // Reset form and close dialog
      setFormData({
        name: "",
        client_id: "",
        description: "",
        service_type: "video_production" as ServiceType,
        budget: "",
        start_date: "",
        deadline: "",
        status: "planning",
      })
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error('Error creating project:', error)
      alert(error.message || 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProject) return

    setSubmitting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('milestones')
        .insert({
          project_id: selectedProject.id,
          title: milestoneFormData.title,
          description: milestoneFormData.description,
          due_date: milestoneFormData.due_date || null,
          status: 'pending',
        })

      if (error) throw error

      // Refresh data
      await fetchData()

      // Reset form
      setMilestoneFormData({ title: "", description: "", due_date: "" })
      setIsMilestoneDialogOpen(false)
    } catch (error: any) {
      console.error('Error adding milestone:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
      alert(error?.message || 'Failed to add milestone. The milestones table may not exist yet.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAssignTeamMember(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProject || !selectedUserId) return

    setSubmitting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('project_team')
        .insert({
          project_id: selectedProject.id,
          user_id: selectedUserId,
          role: teamRole || null,
          assigned_by: user?.id,
        })

      if (error) throw error

      // Refresh data
      await fetchData()

      // Reset form
      setSelectedUserId("")
      setTeamRole("")
      setIsTeamDialogOpen(false)
    } catch (error: any) {
      console.error('Error assigning team member:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
      alert(error?.message || 'Failed to assign team member. The project_team table may not exist yet. Please run migration 008.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemoveTeamMember(userId: string) {
    if (!selectedProject) return
    if (!confirm('Remove this team member from the project?')) return

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('project_team')
        .delete()
        .eq('project_id', selectedProject.id)
        .eq('user_id', userId)

      if (error) throw error

      // Refresh data
      await fetchData()
    } catch (error: any) {
      console.error('Error removing team member:', error)
      alert(error.message || 'Failed to remove team member')
    }
  }

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.clients?.company_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || project.status === statusFilter
    const matchesService = serviceFilter === "all" || project.service_type === serviceFilter
    return matchesSearch && matchesStatus && matchesService
  })

  // Calculate project stats
  const projectStats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'in_progress').length,
    completed: projects.filter(p => p.status === 'completed').length,
    planning: projects.filter(p => p.status === 'planning').length,
    totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
    avgProgress: projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + p.progress_percentage, 0) / projects.length) : 0,
  }

  function openProjectDetails(project: Project) {
    setSelectedProject(project)
    setIsDetailModalOpen(true)
  }

  const getServiceIcon = (serviceType: ServiceType) => {
    return SERVICE_TYPES[serviceType]?.icon || '📁'
  }

  const getServiceLabel = (serviceType: ServiceType) => {
    return SERVICE_TYPES[serviceType]?.label || serviceType
  }

  const getServiceBadgeClass = (serviceType: ServiceType) => {
    return SERVICE_TYPES[serviceType]?.bgColor + ' ' + SERVICE_TYPES[serviceType]?.textColor
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <Image className="h-4 w-4" />
      case 'video':
        return <Video className="h-4 w-4" />
      case 'pdf':
      case 'document':
        return <FileText className="h-4 w-4" />
      default:
        return <FileIcon className="h-4 w-4" />
    }
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage all your video production projects
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Enter the project details to get started.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    placeholder="Brand Video Production"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="client">Client *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                    required
                  >
                    <SelectTrigger id="client">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.length === 0 ? (
                        <SelectItem value="none" disabled>No clients available</SelectItem>
                      ) : (
                        clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.company_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {clients.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Add a client first before creating a project
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="service">Service Type *</Label>
                  <Select
                    value={formData.service_type}
                    onValueChange={(value) => setFormData({ ...formData, service_type: value as ServiceType })}
                    required
                  >
                    <SelectTrigger id="service">
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(SERVICE_TYPES).map((service) => (
                        <SelectItem key={service.value} value={service.value}>
                          <span className="flex items-center gap-2">
                            <span>{service.icon}</span>
                            <span>{service.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {SERVICE_TYPES[formData.service_type].description}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief project description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="budget">Budget ($)</Label>
                    <Input
                      id="budget"
                      type="number"
                      placeholder="10000"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: ProjectStatus) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || clients.length === 0}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {submitting ? 'Creating...' : 'Create Project'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Project Stats */}
      {!loading && projects.length > 0 && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total Projects</CardDescription>
              <CardTitle className="text-2xl">{projectStats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {projectStats.active} active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Completed</CardDescription>
              <CardTitle className="text-2xl">{projectStats.completed}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {projects.length > 0 ? Math.round((projectStats.completed / projects.length) * 100) : 0}% success rate
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total Budget</CardDescription>
              <CardTitle className="text-2xl">${Math.round(projectStats.totalBudget / 1000)}k</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Across all projects
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Avg Progress</CardDescription>
              <CardTitle className="text-2xl">{projectStats.avgProgress}%</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={projectStats.avgProgress} className="h-1" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filter by service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            <SelectItem value="video_production">
              <span className="flex items-center gap-2">
                {SERVICE_TYPES.video_production.icon} Video Production
              </span>
            </SelectItem>
            <SelectItem value="social_media">
              <span className="flex items-center gap-2">
                {SERVICE_TYPES.social_media.icon} Social Media
              </span>
            </SelectItem>
            <SelectItem value="design_branding">
              <span className="flex items-center gap-2">
                {SERVICE_TYPES.design_branding.icon} Design & Branding
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Get started by creating your first project</p>
            <Button onClick={() => setIsDialogOpen(true)} disabled={clients.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Project
            </Button>
            {clients.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Add a client first in the Clients page
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">No projects match your search</p>
              </CardContent>
            </Card>
          ) : (
            filteredProjects.map((project) => (
              <Card key={project.id} className="hover:bg-accent/50 transition-colors">
                <CardHeader>
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Thumbnail */}
                    {project.thumbnail_url && (
                      <div className="w-full md:w-32 h-32 rounded-lg overflow-hidden border bg-muted flex-shrink-0">
                        <img
                          src={project.thumbnail_url}
                          alt={project.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 cursor-pointer" onClick={() => openProjectDetails(project)}>
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle>{project.name}</CardTitle>
                          </div>
                          <CardDescription className="mt-1">
                            {project.clients?.company_name || 'No client'}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getServiceBadgeClass(project.service_type)}>
                            <span className="mr-1">{getServiceIcon(project.service_type)}</span>
                            {getServiceLabel(project.service_type)}
                          </Badge>
                          <StatusBadge status={project.status} />
                        </div>
                      </div>

                      {/* Team & Progress Row */}
                      <div className="flex items-center gap-4 text-sm">
                        {project.created_by && projectCreators[project.created_by] && (
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {projectCreators[project.created_by].full_name}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{project.progress_percentage}% complete</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.description && (
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                  )}

                  {/* Milestones */}
                  {projectMilestones[project.id] && projectMilestones[project.id].length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          Milestones
                        </span>
                        <Badge variant="outline" className="text-[11px]">
                          {projectMilestones[project.id].length} total
                        </Badge>
                      </div>
                      <div className="grid gap-2">
                        {projectMilestones[project.id].slice(0, 2).map((milestone) => (
                          <div
                            key={milestone.id}
                            className="flex items-center justify-between rounded-lg border px-3 py-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <StatusBadge status={milestone.status} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{milestone.title}</p>
                                {milestone.due_date && (
                                  <p className="text-xs text-muted-foreground">
                                    Due: {new Date(milestone.due_date).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {projectMilestones[project.id].length > 2 && (
                          <p className="text-xs text-muted-foreground">
                            +{projectMilestones[project.id].length - 2} more in Details
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openProjectDetails(project)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Details
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      <Users className="h-3 w-3 mr-1" />
                      Team
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileText className="h-3 w-3 mr-1" />
                      Invoice
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Recent Files</span>
                      <Badge variant="outline" className="text-[11px]">
                        {(projectFiles[project.id]?.length || 0)} total
                      </Badge>
                    </div>
                    {(!projectFiles[project.id] || projectFiles[project.id].length === 0) ? (
                      <p className="text-sm text-muted-foreground">No files yet</p>
                    ) : (
                      <div className="space-y-2">
                        {projectFiles[project.id].slice(0, 3).map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between rounded-lg border px-2 py-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {getFileIcon(file.file_type)}
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{file.file_name}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="outline" className="text-[10px]">
                                    {file.file_category.replace('_', ' ')}
                                  </Badge>
                                  <span>{file.storage_type === 'supabase' ? 'Upload' : 'Drive link'}</span>
                                </div>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" asChild>
                              <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        ))}
                        {projectFiles[project.id].length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{projectFiles[project.id].length - 3} more in Details
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {project.budget && (
                      <div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <DollarSign className="h-3 w-3" />
                          Budget
                        </div>
                        <p className="font-medium">${project.budget.toLocaleString()}</p>
                      </div>
                    )}
                    {project.deadline && (
                      <div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Calendar className="h-3 w-3" />
                          Deadline
                        </div>
                        <p className="font-medium">{new Date(project.deadline).toLocaleDateString()}</p>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span className="font-medium">{project.progress_percentage}%</span>
                      </div>
                      <Progress value={project.progress_percentage} className="h-2" />
                    </div>
                  </div>
                </CardContent >
              </Card >
            ))
          )
          }
        </div >
      )}

      {/* Project Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-2xl">{selectedProject.name}</DialogTitle>
                    <DialogDescription className="mt-2">
                      Client: {selectedProject.clients?.company_name || 'No client'}
                    </DialogDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getServiceBadgeClass(selectedProject.service_type)}>
                      <span className="mr-1">{getServiceIcon(selectedProject.service_type)}</span>
                      {getServiceLabel(selectedProject.service_type)}
                    </Badge>
                    <StatusBadge status={selectedProject.status} />
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Project Overview */}
                <div>
                  <h3 className="font-semibold mb-3">Project Overview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedProject.budget && (
                      <div className="p-3 rounded-lg border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <DollarSign className="h-3 w-3" />
                          Budget
                        </div>
                        <p className="font-semibold">${selectedProject.budget.toLocaleString()}</p>
                      </div>
                    )}
                    {selectedProject.start_date && (
                      <div className="p-3 rounded-lg border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Calendar className="h-3 w-3" />
                          Start Date
                        </div>
                        <p className="font-semibold">{new Date(selectedProject.start_date).toLocaleDateString()}</p>
                      </div>
                    )}
                    {selectedProject.deadline && (
                      <div className="p-3 rounded-lg border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Clock className="h-3 w-3" />
                          Deadline
                        </div>
                        <p className="font-semibold">{new Date(selectedProject.deadline).toLocaleDateString()}</p>
                      </div>
                    )}
                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <TrendingUp className="h-3 w-3" />
                        Progress
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={selectedProject.progress_percentage} className="h-2 flex-1" />
                        <span className="font-semibold text-sm">{selectedProject.progress_percentage}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedProject.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground">{selectedProject.description}</p>
                  </div>
                )}

                {/* Milestones Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Milestones</h3>
                    <Button size="sm" variant="outline" onClick={() => setIsMilestoneDialogOpen(true)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Milestone
                    </Button>
                  </div>
                  {projectMilestones[selectedProject.id] && projectMilestones[selectedProject.id].length > 0 ? (
                    <div className="space-y-2">
                      {projectMilestones[selectedProject.id].map((milestone) => (
                        <Card key={milestone.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">{milestone.title}</h4>
                                  <StatusBadge status={milestone.status} />
                                </div>
                                {milestone.description && (
                                  <p className="text-sm text-muted-foreground mb-2">{milestone.description}</p>
                                )}
                                {milestone.due_date && (
                                  <p className="text-xs text-muted-foreground">
                                    Due: {new Date(milestone.due_date).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          No milestones yet. Add milestones to track project progress.
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Team Members */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Team Members</h3>
                    {user?.role === 'admin' && (
                      <Button size="sm" variant="outline" onClick={() => setIsTeamDialogOpen(true)}>
                        <Plus className="h-3 w-3 mr-1" />
                        Assign Member
                      </Button>
                    )}
                  </div>
                  {projectTeam[selectedProject.id] && projectTeam[selectedProject.id].length > 0 ? (
                    <div className="space-y-2">
                      {projectTeam[selectedProject.id].map((member) => (
                        <Card key={member.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium">
                                    {member.full_name?.charAt(0) || member.email.charAt(0)}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">{member.full_name || member.email}</p>
                                  <p className="text-xs text-muted-foreground">{member.role}</p>
                                </div>
                              </div>
                              {user?.role === 'admin' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveTeamMember(member.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          No team members assigned yet.
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Files & Documents */}
                <div>
                  <h3 className="font-semibold mb-3">Files & Documents</h3>
                  <FileManager
                    projectId={selectedProject.id}
                    driveFolderUrl={selectedProject.drive_folder_url}
                    onDriveFolderUpdate={(url) => {
                      setSelectedProject({ ...selectedProject, drive_folder_url: url })
                      fetchData()
                    }}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </Button>
                <Button>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Project
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Milestone Dialog */}
      <Dialog open={isMilestoneDialogOpen} onOpenChange={setIsMilestoneDialogOpen}>
        <DialogContent>
          <form onSubmit={handleAddMilestone}>
            <DialogHeader>
              <DialogTitle>Add Milestone</DialogTitle>
              <DialogDescription>
                Create a new milestone for {selectedProject?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="milestone-title">Title *</Label>
                <Input
                  id="milestone-title"
                  placeholder="Script completion"
                  required
                  value={milestoneFormData.title}
                  onChange={(e) => setMilestoneFormData({ ...milestoneFormData, title: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="milestone-desc">Description</Label>
                <Textarea
                  id="milestone-desc"
                  placeholder="Complete final draft of script"
                  value={milestoneFormData.description}
                  onChange={(e) => setMilestoneFormData({ ...milestoneFormData, description: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="milestone-date">Due Date</Label>
                <Input
                  id="milestone-date"
                  type="date"
                  value={milestoneFormData.due_date}
                  onChange={(e) => setMilestoneFormData({ ...milestoneFormData, due_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMilestoneDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Milestone
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Team Member Dialog */}
      {user?.role === 'admin' && (
        <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
          <DialogContent>
            <form onSubmit={handleAssignTeamMember}>
              <DialogHeader>
                <DialogTitle>Assign Team Member</DialogTitle>
                <DialogDescription>
                  Add a team member to {selectedProject?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="team-member">Team Member *</Label>
                  <Select
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                    required
                  >
                    <SelectTrigger id="team-member">
                      <SelectValue placeholder="Select a team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.length === 0 ? (
                        <SelectItem value="none" disabled>No users available</SelectItem>
                      ) : (
                        availableUsers
                          .filter(u => !projectTeam[selectedProject?.id || '']?.find(m => m.id === u.id))
                          .map((availableUser) => (
                            <SelectItem key={availableUser.id} value={availableUser.id}>
                              {availableUser.full_name} ({availableUser.email})
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="team-role">Role (Optional)</Label>
                  <Input
                    id="team-role"
                    placeholder="e.g., Lead Editor, Designer"
                    value={teamRole}
                    onChange={(e) => setTeamRole(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTeamDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || !selectedUserId}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Assign Member
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
