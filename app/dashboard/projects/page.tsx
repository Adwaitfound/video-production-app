'use client';

import React from "react"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { debug } from "@/lib/debug"
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
import { Plus, Search, Calendar, DollarSign, Loader2, FolderKanban, Video, Share2, Palette, Eye, Edit, Trash2, Users, FileText, CheckSquare, Upload, TrendingUp, Clock, AlertCircle, ExternalLink, Image, File as FileIcon, Target, UserCheck, MessageSquare, ListTodo } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Project, Client, ProjectStatus, ServiceType, ProjectFile, Milestone, User, SubProject, SubProjectComment, SubProjectUpdate } from "@/types"
import { SERVICE_TYPES, SERVICE_TYPE_OPTIONS } from "@/types"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { FileManager } from "@/components/projects/file-manager"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ProjectsPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [projectTeam, setProjectTeam] = useState<Record<string, User[]>>({})
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState("")
  const [teamRole, setTeamRole] = useState("")
  const [milestoneFormData, setMilestoneFormData] = useState({
    title: "",
    description: "",
    due_date: "",
  })
  const [editFormData, setEditFormData] = useState({
    name: "",
    client_id: "",
    description: "",
    service_type: "video_production" as ServiceType,
    budget: "",
    start_date: "",
    deadline: "",
    status: "planning" as ProjectStatus,
    progress_percentage: 0,
  })

  // Sub-projects state
  const [subProjects, setSubProjects] = useState<Record<string, SubProject[]>>({})
  const [selectedSubProject, setSelectedSubProject] = useState<SubProject | null>(null)
  const [isSubProjectDialogOpen, setIsSubProjectDialogOpen] = useState(false)
  const [isEditSubProjectDialogOpen, setIsEditSubProjectDialogOpen] = useState(false)
  const [subProjectFormData, setSubProjectFormData] = useState({
    name: "",
    description: "",
    assigned_to: "unassigned",
    due_date: "",
    status: "planning" as ProjectStatus,
    video_url: "",
  })
  const [editSubProjectFormData, setEditSubProjectFormData] = useState({
    name: "",
    description: "",
    assigned_to: "unassigned",
    due_date: "",
    status: "planning" as ProjectStatus,
    video_url: "",
  })
  const [subProjectComments, setSubProjectComments] = useState<Record<string, SubProjectComment[]>>({})
  const [subProjectUpdates, setSubProjectUpdates] = useState<Record<string, SubProjectUpdate[]>>({})
  const [newComment, setNewComment] = useState("")
  const [newUpdate, setNewUpdate] = useState("")
  const [isSubProjectDetailOpen, setIsSubProjectDetailOpen] = useState(false)

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

  // Handle URL parameters for service filter
  useEffect(() => {
    const serviceParam = searchParams.get('service')
    if (serviceParam && ['video_production', 'social_media', 'design_branding'].includes(serviceParam)) {
      setServiceFilter(serviceParam)
    }
  }, [searchParams])

  useEffect(() => {
    fetchData()
  }, [])

  // Fetch team members when team dialog opens with a selected project
  useEffect(() => {
    if (isTeamDialogOpen && selectedProject) {
      console.log('Team dialog opened, fetching members for project:', selectedProject.id)
      fetchProjectTeamMembers(selectedProject.id)
    }
  }, [isTeamDialogOpen, selectedProject?.id])

  async function fetchData() {
    debug.log('FETCH_DATA', 'Starting data fetch...')
    const supabase = createClient()
    setLoading(true)

    try {
      // Fetch projects with client data
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*, clients(company_name, contact_person)')
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError
      debug.success('FETCH_DATA', 'Projects fetched', { count: projectsData?.length })

      // Fetch clients for dropdown
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')
        .order('company_name')

      if (clientsError) throw clientsError
      debug.success('FETCH_DATA', 'Clients fetched', { count: clientsData?.length })
      
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
        debug.log('FETCH_DATA', 'Fetching team members for projects...', { projectIds: projectsData.map(p => p.id) })
        const projectIds = projectsData.map((p) => p.id)
        const { data: teamData, error: teamError } = await supabase
          .from('project_team')
          .select('project_id, user_id, user:users!user_id(id, email, full_name, avatar_url, role)')
          .in('project_id', projectIds)

        if (teamError) {
          debug.warn('FETCH_DATA', 'Team fetch error:', teamError)
          console.warn('Project team table not available:', teamError.message)
        } else {
          debug.log('FETCH_DATA', 'Team data received', { rawCount: teamData?.length })
          const teamMap = (teamData || []).reduce((acc, assignment: any) => {
            if (!acc[assignment.project_id]) {
              acc[assignment.project_id] = []
            }
            if (assignment.user) {
              acc[assignment.project_id].push(assignment.user as User)
            }
            return acc
          }, {} as Record<string, User[]>)

          debug.success('FETCH_DATA', 'Team members mapped', { projectsWithTeam: Object.keys(teamMap).length, teamMap })
          setProjectTeam(teamMap)
        }
      }

      // Fetch all users for team assignment (only admins/PMs)
      if (user?.role === 'admin' || user?.role === 'project_manager') {
        const { data: allUsers, error: usersError } = await supabase
          .from('users')
          .select('*')
          .order('full_name', { ascending: true, nullsFirst: false })

        if (usersError) {
          console.error('Error fetching users:', usersError)
        } else {
          // Filter to only show admin and project_manager roles
          const filteredUsers = (allUsers || []).filter(u => 
            u.role === 'admin' || u.role === 'project_manager'
          )
          setAvailableUsers(filteredUsers)
        }
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
    if (submitting) return
    
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

      // Reset form and close dialog first
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

      // Then refresh projects list
      await fetchData()
    } catch (error: any) {
      console.error('Error creating project:', error)
      alert(error.message || 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProject || submitting) return

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

      // Reset form and close first
      setMilestoneFormData({ title: "", description: "", due_date: "" })
      setIsMilestoneDialogOpen(false)

      // Then refresh data
      await fetchData()
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
    if (!selectedProject || !selectedUserId || submitting) return

    debug.log('ASSIGN_TEAM', 'Start team assignment', { projectId: selectedProject.id, userId: selectedUserId })
    console.log('=== ASSIGN TEAM MEMBER START ===')
    console.log('Selected Project ID:', selectedProject.id)
    console.log('Selected User ID:', selectedUserId)
    console.log('Current projectTeam state:', projectTeam)

    // Check if user is already assigned
    const alreadyAssigned = projectTeam[selectedProject.id]?.find(m => m.id === selectedUserId)
    if (alreadyAssigned) {
      debug.warn('ASSIGN_TEAM', 'User already assigned', { userId: selectedUserId })
      alert('This team member is already assigned to this project')
      return
    }

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

      if (error) {
        // Handle duplicate key error specifically
        if (error.code === '23505') {
          throw new Error('This team member is already assigned to this project')
        }
        throw error
      }

      debug.success('ASSIGN_TEAM', 'Team member inserted', { projectId: selectedProject.id, userId: selectedUserId })
      console.log('Team member inserted successfully')

      // Reset form first
      setSelectedUserId("")
      setTeamRole("")

      // Refresh team members for this project and wait for it
      debug.log('ASSIGN_TEAM', 'Fetching updated team members...')
      console.log('Fetching updated team members...')
      const updatedMembers = await fetchProjectTeamMembers(selectedProject.id)
      debug.success('ASSIGN_TEAM', 'Members updated', { members: updatedMembers.map(m => m.email) })
      console.log('Updated members returned:', updatedMembers)
      console.log('=== ASSIGN TEAM MEMBER END ===')
      
      // Don't close dialog - let user see the updated list
      // setIsTeamDialogOpen(false)
    } catch (error: any) {
      debug.error('ASSIGN_TEAM', 'Assignment failed', error)
      console.error('Error assigning team member:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
      alert(error?.message || 'Failed to assign team member')
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

      // Update local state immediately
      setProjectTeam(prev => ({
        ...prev,
        [selectedProject.id]: prev[selectedProject.id]?.filter(m => m.id !== userId) || []
      }))
    } catch (error: any) {
      console.error('Error removing team member:', error)
      alert('Failed to remove team member')
    }
  }

  async function fetchProjectTeamMembers(projectId: string) {
    const supabase = createClient()
    
    try {
      const { data, error } = await supabase
        .from('project_team')
        .select('*, user:users!user_id(id, email, full_name, avatar_url, role)')
        .eq('project_id', projectId)

      if (error) {
        debug.error('FETCH_TEAM', 'Query error:', error)
        console.error('Error fetching team members:', error)
        throw error
      }

      debug.log('FETCH_TEAM', 'Raw data from query:', { projectId, count: data?.length })
      console.log('Fetched team data:', data)
      const members = (data || []).map((assignment: any) => assignment.user as User).filter(Boolean)
      debug.success('FETCH_TEAM', 'Members processed', { projectId, members: members.map(m => ({ id: m.id, email: m.email })) })
      console.log('Processed team members:', members)
      setProjectTeam(prev => ({ ...prev, [projectId]: members }))
      return members
    } catch (error) {
      debug.error('FETCH_TEAM', 'Exception:', error)
      console.error('Error in fetchProjectTeamMembers:', error)
      return []
    }
  }

  async function fetchSubProjects(projectId: string) {
    const supabase = createClient()
    
    try {
      const { data: subProjectsData, error } = await supabase
        .from('sub_projects')
        .select('*, assigned_user:users!assigned_to(id, email, full_name, avatar_url, role)')
        .eq('parent_project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Sub-projects table not available:', error.message)
        return
      }

      setSubProjects(prev => ({ ...prev, [projectId]: subProjectsData || [] }))
    } catch (error: any) {
      console.error('Error fetching sub-projects:', error)
    }
  }

  async function handleAddSubProject(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProject || submitting) return

    setSubmitting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('sub_projects')
        .insert({
          parent_project_id: selectedProject.id,
          name: subProjectFormData.name,
          description: subProjectFormData.description,
          assigned_to: subProjectFormData.assigned_to === "unassigned" ? null : subProjectFormData.assigned_to,
          due_date: subProjectFormData.due_date || null,
          status: subProjectFormData.status,
          video_url: subProjectFormData.video_url || null,
          created_by: user?.id,
        })

      if (error) throw error

      // Reset form first
      setSubProjectFormData({ name: "", description: "", assigned_to: "unassigned", due_date: "", status: "planning", video_url: "" })
      setIsSubProjectDialogOpen(false)
      
      // Then fetch updated data
      await fetchSubProjects(selectedProject.id)
    } catch (error: any) {
      console.error('Error adding sub-project:', error)
      alert(error?.message || 'Failed to add sub-project. Please run migration 009.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEditSubProject(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSubProject || submitting) return

    setSubmitting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('sub_projects')
        .update({
          name: editSubProjectFormData.name,
          description: editSubProjectFormData.description,
          assigned_to: editSubProjectFormData.assigned_to === "unassigned" ? null : editSubProjectFormData.assigned_to,
          due_date: editSubProjectFormData.due_date || null,
          status: editSubProjectFormData.status,
          video_url: editSubProjectFormData.video_url || null,
        })
        .eq('id', selectedSubProject.id)

      if (error) throw error

      setIsEditSubProjectDialogOpen(false)
      setSelectedSubProject(null)
      
      if (selectedProject) {
        await fetchSubProjects(selectedProject.id)
      }
    } catch (error: any) {
      console.error('Error updating sub-project:', error)
      alert('Failed to update task')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdateSubProjectProgress(subProjectId: string, progress: number) {
    const supabase = createClient()
    
    try {
      const { error } = await supabase
        .from('sub_projects')
        .update({ progress_percentage: progress })
        .eq('id', subProjectId)

      if (error) throw error

      if (selectedProject) {
        await fetchSubProjects(selectedProject.id)
      }
    } catch (error: any) {
      console.error('Error updating sub-project progress:', error)
    }
  }

  async function handleUpdateSubProjectStatus(subProjectId: string, status: ProjectStatus) {
    const supabase = createClient()
    
    try {
      const { error } = await supabase
        .from('sub_projects')
        .update({ 
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', subProjectId)

      if (error) throw error

      if (selectedProject) {
        await fetchSubProjects(selectedProject.id)
      }
    } catch (error: any) {
      console.error('Error updating sub-project status:', error)
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
    fetchSubProjects(project.id)
  }

  function openEditDialog(project: Project) {
    setSelectedProject(project)
    setEditFormData({
      name: project.name,
      client_id: project.client_id,
      description: project.description || "",
      service_type: project.service_type,
      budget: project.budget?.toString() || "",
      start_date: project.start_date || "",
      deadline: project.deadline || "",
      status: project.status,
      progress_percentage: project.progress_percentage,
    })
    setIsEditDialogOpen(true)
  }

  async function openTeamDialog(project: Project) {
    setSelectedProject(project)
    setIsTeamDialogOpen(true)
    // Fetch team members immediately when dialog opens
    await fetchProjectTeamMembers(project.id)
  }

  function openInvoices(project: Project) {
    window.location.href = `/dashboard/invoices?project=${project.id}`
  }

  async function handleEditProject(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProject || submitting) return

    setSubmitting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: editFormData.name,
          client_id: editFormData.client_id,
          description: editFormData.description,
          service_type: editFormData.service_type,
          budget: editFormData.budget ? parseFloat(editFormData.budget) : null,
          start_date: editFormData.start_date || null,
          deadline: editFormData.deadline || null,
          status: editFormData.status,
          progress_percentage: editFormData.progress_percentage,
        })
        .eq('id', selectedProject.id)

      if (error) throw error

      setIsEditDialogOpen(false)
      await fetchData()
    } catch (error: any) {
      console.error('Error updating project:', error)
      alert(error.message || 'Failed to update project')
    } finally {
      setSubmitting(false)
    }
  }

  const getServiceIcon = (serviceType: ServiceType) => {
    return SERVICE_TYPES[serviceType]?.icon || '📁'
  }

  const getServiceLabel = (serviceType: ServiceType) => {
    return SERVICE_TYPES[serviceType]?.label || serviceType
  }

  const getServiceBadgeVariant = (serviceType: ServiceType): "default" | "secondary" | "destructive" | "outline" => {
    switch (serviceType) {
      case 'video_production':
        return 'default'
      case 'social_media':
        return 'secondary'
      case 'design_branding':
        return 'outline'
      default:
        return 'secondary'
    }
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
                    <Label htmlFor="budget">Budget (₹)</Label>
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
                        <SelectItem value="stuck">Stuck</SelectItem>
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
              <CardTitle className="text-2xl">₹{Math.round(projectStats.totalBudget / 1000)}k</CardTitle>
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

      {/* Service Type Filter Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {Object.values(SERVICE_TYPES).map((service) => {
          const serviceProjects = projects.filter(p => p.service_type === service.value)
          const isSelected = serviceFilter === service.value
          return (
            <Card
              key={service.value}
              className={`cursor-pointer transition-all hover:shadow-lg ${isSelected ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setServiceFilter(isSelected ? 'all' : service.value)}
            >
              <CardHeader className={`pb-3 bg-gradient-to-br ${service.color} text-white rounded-t-lg`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{service.icon}</div>
                    <div>
                      <CardTitle className="text-lg text-white">{service.label}</CardTitle>
                      <CardDescription className="text-white/90 text-xs">{service.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{serviceProjects.length}</p>
                    <p className="text-xs text-muted-foreground">Projects</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">
                      {serviceProjects.filter(p => p.status === 'completed').length} Completed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {serviceProjects.filter(p => p.status === 'in_progress').length} In Progress
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

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
            <SelectItem value="stuck">Stuck</SelectItem>
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
                          <Badge variant={getServiceBadgeVariant(project.service_type)}>
                            <span className="mr-1">{getServiceIcon(project.service_type)}</span>
                            {getServiceLabel(project.service_type)}
                          </Badge>
                          <StatusBadge status={project.status} />
                        </div>
                      </div>

                      {/* Team & Progress Row */}
                      <div className="flex flex-col gap-3 text-sm">
                        {/* Creator */}
                        {project.created_by && projectCreators[project.created_by] && (
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {projectCreators[project.created_by].full_name}
                            </span>
                          </div>
                        )}
                        
                        {/* Team Members */}
                        {projectTeam[project.id] && projectTeam[project.id].length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex gap-1 flex-wrap">
                              {projectTeam[project.id].map((member) => (
                                <Badge key={member.id} variant="secondary" className="text-xs">
                                  {member.full_name || member.email.split('@')[0]}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Progress */}
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(project)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openTeamDialog(project)}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Team
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openInvoices(project)}
                    >
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
                        <p className="font-medium">₹{project.budget.toLocaleString()}</p>
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
                    <Badge variant={getServiceBadgeVariant(selectedProject.service_type)}>
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
                        <p className="font-semibold">₹{selectedProject.budget.toLocaleString()}</p>
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

                {/* Sub-Projects (Tasks) Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <ListTodo className="h-4 w-4" />
                      Sub-Projects / Tasks
                    </h3>
                    <Button size="sm" variant="outline" onClick={() => setIsSubProjectDialogOpen(true)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Task
                    </Button>
                  </div>
                  {subProjects[selectedProject.id] && subProjects[selectedProject.id].length > 0 ? (
                    <div className="space-y-2">
                      {subProjects[selectedProject.id].map((subProject) => (
                        <Card key={subProject.id} className="hover:border-primary/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium">{subProject.name}</h4>
                                    <StatusBadge status={subProject.status} />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={() => {
                                        setSelectedSubProject(subProject)
                                        setEditSubProjectFormData({
                                          name: subProject.name,
                                          description: subProject.description || "",
                                          assigned_to: subProject.assigned_to || "unassigned",
                                          due_date: subProject.due_date || "",
                                          status: subProject.status,
                                          video_url: subProject.video_url || "",
                                        })
                                        setIsEditSubProjectDialogOpen(true)
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  {subProject.description && (
                                    <p className="text-sm text-muted-foreground mb-2">{subProject.description}</p>
                                  )}
                                  {subProject.video_url && (
                                    <div className="mb-2">
                                      <a
                                        href={subProject.video_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                      >
                                        <Video className="h-3 w-3" />
                                        View Video
                                      </a>
                                    </div>
                                  )}
                                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                    {subProject.assigned_user && (
                                      <div className="flex items-center gap-1">
                                        <UserCheck className="h-3 w-3" />
                                        {subProject.assigned_user.full_name || subProject.assigned_user.email}
                                      </div>
                                    )}
                                    {subProject.due_date && (
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(subProject.due_date).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Select
                                  value={subProject.status}
                                  onValueChange={(value: ProjectStatus) => handleUpdateSubProjectStatus(subProject.id, value)}
                                >
                                  <SelectTrigger className="w-[130px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="planning">Planning</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="in_review">In Review</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="stuck">Stuck</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Progress value={subProject.progress_percentage} className="h-2 flex-1" />
                                  <span className="text-xs font-medium w-10 text-right">{subProject.progress_percentage}%</span>
                                </div>
                                <Input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={subProject.progress_percentage}
                                  onChange={(e) => handleUpdateSubProjectProgress(subProject.id, parseInt(e.target.value))}
                                  className="h-2"
                                />
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
                          <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          No tasks yet. Break down this project into smaller tasks.
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

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
                      // Update in the projects list
                      setProjects(prevProjects => 
                        prevProjects.map(p => 
                          p.id === selectedProject.id 
                            ? { ...p, drive_folder_url: url } 
                            : p
                        )
                      )
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>Team Members</DialogTitle>
                  <DialogDescription>
                    Manage team members for {selectedProject?.name}
                  </DialogDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedProject && fetchProjectTeamMembers(selectedProject.id)}
                  className="gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                    <path d="M21 3v5h-5"></path>
                  </svg>
                  Refresh
                </Button>
              </div>
            </DialogHeader>

            {/* Current Team Members */}
            <div className="space-y-4 py-4">
              {/* Debug Info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-muted-foreground p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded border border-yellow-200 dark:border-yellow-800 space-y-1">
                  <div><strong>Debug Info:</strong></div>
                  <div>Project ID: <code>{selectedProject?.id}</code></div>
                  <div>Team Count: <code>{projectTeam[selectedProject?.id || '']?.length || 0}</code></div>
                  <div>Has Team Data: <code>{projectTeam[selectedProject?.id || ''] ? 'Yes' : 'No'}</code></div>
                  <div>All Projects with Teams: <code>{Object.keys(projectTeam).length}</code></div>
                  {projectTeam[selectedProject?.id || ''] && (
                    <div>Members: <code>{projectTeam[selectedProject?.id || ''].map(m => m.email).join(', ')}</code></div>
                  )}
                </div>
              )}

              {/* Team Stats */}
              {projectTeam[selectedProject?.id || ''] && projectTeam[selectedProject?.id || ''].length > 0 && (
                <div className="grid grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{projectTeam[selectedProject?.id || ''].length}</p>
                    <p className="text-xs text-muted-foreground">Team Members</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {projectTeam[selectedProject?.id || ''].filter(m => m.role === 'admin').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Admins</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {projectTeam[selectedProject?.id || ''].filter(m => m.role === 'project_manager').length}
                    </p>
                    <p className="text-xs text-muted-foreground">PMs</p>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-3">Current Team Members ({projectTeam[selectedProject?.id || '']?.length || 0})</h3>
                {projectTeam[selectedProject?.id || ''] && projectTeam[selectedProject?.id || ''].length > 0 ? (
                  <div className="space-y-2">
                    {projectTeam[selectedProject?.id || ''].map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-primary">
                              {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{member.full_name || member.email}</p>
                              <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                                {member.role === 'admin' ? 'Admin' : 'PM'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTeamMember(member.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No team members assigned yet
                  </div>
                )}
              </div>

              {/* Add Team Member Form */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Add Team Member</h3>
                <form onSubmit={handleAssignTeamMember}>
                  <div className="grid gap-4">
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
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsTeamDialogOpen(false)}
                      disabled={submitting}
                    >
                      Close
                    </Button>
                    <Button type="submit" disabled={submitting || !selectedUserId}>
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Assign Member
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleEditProject}>
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>
                Update project details
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Project Name *</Label>
                <Input
                  id="edit-name"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-client">Client *</Label>
                <Select
                  value={editFormData.client_id}
                  onValueChange={(value) => setEditFormData({ ...editFormData, client_id: value })}
                  required
                >
                  <SelectTrigger id="edit-client">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Project description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-service">Service Type *</Label>
                  <Select
                    value={editFormData.service_type}
                    onValueChange={(value: ServiceType) => setEditFormData({ ...editFormData, service_type: value })}
                    required
                  >
                    <SelectTrigger id="edit-service">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="mr-2">{type.icon}</span>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-status">Status *</Label>
                  <Select
                    value={editFormData.status}
                    onValueChange={(value: ProjectStatus) => setEditFormData({ ...editFormData, status: value })}
                    required
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="stuck">Stuck</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-budget">Budget (₹)</Label>
                  <Input
                    id="edit-budget"
                    type="number"
                    placeholder="100000"
                    value={editFormData.budget}
                    onChange={(e) => setEditFormData({ ...editFormData, budget: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-progress">Progress (%)</Label>
                  <Input
                    id="edit-progress"
                    type="number"
                    min="0"
                    max="100"
                    value={editFormData.progress_percentage}
                    onChange={(e) => setEditFormData({ ...editFormData, progress_percentage: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-start">Start Date</Label>
                  <Input
                    id="edit-start"
                    type="date"
                    value={editFormData.start_date}
                    onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-deadline">Deadline</Label>
                  <Input
                    id="edit-deadline"
                    type="date"
                    value={editFormData.deadline}
                    onChange={(e) => setEditFormData({ ...editFormData, deadline: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Sub-Project Dialog */}
      <Dialog open={isSubProjectDialogOpen} onOpenChange={setIsSubProjectDialogOpen}>
        <DialogContent>
          <form onSubmit={handleAddSubProject}>
            <DialogHeader>
              <DialogTitle>Add Sub-Project / Task</DialogTitle>
              <DialogDescription>
                Create a task for {selectedProject?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="sub-project-name">Task Name *</Label>
                <Input
                  id="sub-project-name"
                  placeholder="e.g., Script Writing, Video Editing"
                  required
                  value={subProjectFormData.name}
                  onChange={(e) => setSubProjectFormData({ ...subProjectFormData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sub-project-desc">Description</Label>
                <Textarea
                  id="sub-project-desc"
                  placeholder="Task details..."
                  value={subProjectFormData.description}
                  onChange={(e) => setSubProjectFormData({ ...subProjectFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sub-project-assign">Assign To</Label>
                  <Select
                    value={subProjectFormData.assigned_to}
                    onValueChange={(value) => setSubProjectFormData({ ...subProjectFormData, assigned_to: value })}
                  >
                    <SelectTrigger id="sub-project-assign">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {availableUsers.map((availableUser) => (
                        <SelectItem key={availableUser.id} value={availableUser.id}>
                          {availableUser.full_name || availableUser.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sub-project-status">Status</Label>
                  <Select
                    value={subProjectFormData.status}
                    onValueChange={(value: ProjectStatus) => setSubProjectFormData({ ...subProjectFormData, status: value })}
                  >
                    <SelectTrigger id="sub-project-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="stuck">Stuck</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sub-project-date">Due Date</Label>
                <Input
                  id="sub-project-date"
                  type="date"
                  value={subProjectFormData.due_date}
                  onChange={(e) => setSubProjectFormData({ ...subProjectFormData, due_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sub-project-video">Video URL (Optional)</Label>
                <Input
                  id="sub-project-video"
                  type="url"
                  placeholder="https://youtube.com/watch?v=... or https://drive.google.com/..."
                  value={subProjectFormData.video_url}
                  onChange={(e) => setSubProjectFormData({ ...subProjectFormData, video_url: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Add a YouTube, Google Drive, or other video link
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSubProjectDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Sub-Project Dialog */}
      <Dialog open={isEditSubProjectDialogOpen} onOpenChange={setIsEditSubProjectDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleEditSubProject}>
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>
                Update task details for this project
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-sub-project-name">Task Name *</Label>
                <Input
                  id="edit-sub-project-name"
                  value={editSubProjectFormData.name}
                  onChange={(e) => setEditSubProjectFormData({ ...editSubProjectFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-sub-project-description">Description</Label>
                <Textarea
                  id="edit-sub-project-description"
                  value={editSubProjectFormData.description}
                  onChange={(e) => setEditSubProjectFormData({ ...editSubProjectFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-sub-project-assigned">Assigned To</Label>
                  <Select
                    value={editSubProjectFormData.assigned_to}
                    onValueChange={(value) => setEditSubProjectFormData({ ...editSubProjectFormData, assigned_to: value })}
                  >
                    <SelectTrigger id="edit-sub-project-assigned">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {availableUsers.map((availableUser) => (
                        <SelectItem key={availableUser.id} value={availableUser.id}>
                          {availableUser.full_name || availableUser.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-sub-project-status">Status</Label>
                  <Select
                    value={editSubProjectFormData.status}
                    onValueChange={(value: ProjectStatus) => setEditSubProjectFormData({ ...editSubProjectFormData, status: value })}
                  >
                    <SelectTrigger id="edit-sub-project-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="stuck">Stuck</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-sub-project-date">Due Date</Label>
                <Input
                  id="edit-sub-project-date"
                  type="date"
                  value={editSubProjectFormData.due_date}
                  onChange={(e) => setEditSubProjectFormData({ ...editSubProjectFormData, due_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-sub-project-video">Video URL (Optional)</Label>
                <Input
                  id="edit-sub-project-video"
                  type="url"
                  placeholder="https://youtube.com/watch?v=... or https://drive.google.com/..."
                  value={editSubProjectFormData.video_url}
                  onChange={(e) => setEditSubProjectFormData({ ...editSubProjectFormData, video_url: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Add a YouTube, Google Drive, or other video link
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditSubProjectDialogOpen(false)
                  setSelectedSubProject(null)
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
