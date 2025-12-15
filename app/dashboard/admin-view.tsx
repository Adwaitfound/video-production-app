"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { StatCard } from "@/components/shared/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, FolderKanban, FileText, Plus, Calendar, Users, TrendingUp, AlertCircle, CheckCircle2, Receipt } from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import type { Project, Client, Invoice, Milestone } from "@/types"
import { SERVICE_TYPES, type ServiceType } from "@/types"

export default function AdminDashboard() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const [projects, setProjects] = useState<Project[]>([])
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [milestones, setMilestones] = useState<Milestone[]>([])
    const [loading, setLoading] = useState(true)

    const [stats, setStats] = useState({
        totalRevenue: 0,
        activeProjects: 0,
        pendingInvoices: 0,
        totalClients: 0,
        overdueInvoices: 0,
        completedProjects: 0,
        avgProjectValue: 0,
    })

    const [serviceBreakdown, setServiceBreakdown] = useState<{
        service_type: ServiceType
        count: number
        percentage: number
    }[]>([])

    useEffect(() => {
        async function fetchDashboardData() {
            if (!user || authLoading) return

            const supabase = createClient()

            try {
                // Fetch projects
                const { data: projectsData, error: projectsError } = await supabase
                    .from('projects')
                    .select('*, clients(company_name)')
                    .order('created_at', { ascending: false })

                if (projectsError) throw projectsError

                // Fetch invoices
                const { data: invoicesData, error: invoicesError } = await supabase
                    .from('invoices')
                    .select('*, clients(company_name)')
                    .order('created_at', { ascending: false })

                if (invoicesError) throw invoicesError

                // Fetch clients
                const { data: clientsData, error: clientsError } = await supabase
                    .from('clients')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (clientsError) throw clientsError

                // Fetch upcoming milestones
                const { data: milestonesData, error: milestonesError } = await supabase
                    .from('milestones')
                    .select('*, projects(name)')
                    .in('status', ['pending', 'in_progress'])
                    .order('due_date', { ascending: true })
                    .limit(5)

                if (milestonesError) throw milestonesError

                setProjects(projectsData || [])
                setInvoices(invoicesData || [])
                setClients(clientsData || [])
                setMilestones(milestonesData || [])

                // Calculate stats
                const totalRevenue = invoicesData?.filter(inv => inv.status === 'paid')?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0
                const activeProjects = projectsData?.filter(p => p.status === 'in_progress').length || 0
                const pendingInvoices = invoicesData?.filter(inv => inv.status === 'pending')?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0
                const totalClients = clientsData?.length || 0
                const completedProjects = projectsData?.filter(p => p.status === 'completed').length || 0

                // Calculate overdue invoices
                const today = new Date()
                const overdueInvoicesCount = invoicesData?.filter(inv =>
                    inv.status === 'pending' && inv.due_date && new Date(inv.due_date) < today
                ).length || 0

                // Calculate average project value
                const totalProjectBudget = projectsData?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0
                const avgProjectValue = projectsData && projectsData.length > 0 ? totalProjectBudget / projectsData.length : 0

                // Calculate service breakdown
                const serviceCounts = projectsData?.reduce((acc, project) => {
                    acc[project.service_type] = (acc[project.service_type] || 0) + 1
                    return acc
                }, {} as Record<ServiceType, number>) || {}

                const total = Object.values(serviceCounts).reduce((sum: number, count) => sum + (count as number), 0)
                const breakdown = Object.entries(serviceCounts).map(([service, count]) => ({
                    service_type: service as ServiceType,
                    count: count as number,
                    percentage: (total as number) > 0 ? ((count as number) / (total as number)) * 100 : 0,
                }))

                setServiceBreakdown(breakdown)

                setStats({
                    totalRevenue,
                    activeProjects,
                    pendingInvoices,
                    totalClients,
                    overdueInvoices: overdueInvoicesCount,
                    completedProjects,
                    avgProjectValue,
                })
            } catch (error) {
                console.error('Error fetching dashboard data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [user, authLoading])

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        )
    }

    const recentProjects = projects.slice(0, 5)
    const recentInvoices = invoices.slice(0, 5)
    const recentClients = clients.slice(0, 5)

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Welcome back! Here&apos;s an overview of your business.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => router.push('/dashboard/projects')}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Project
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/dashboard/clients')}>
                        <Users className="h-4 w-4 mr-2" />
                        Add Client
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/dashboard/invoices')}>
                        <FileText className="h-4 w-4 mr-2" />
                        Create Invoice
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    title="Total Revenue"
                    value={`$${stats.totalRevenue.toLocaleString()}`}
                    change="From paid invoices"
                    trend="up"
                    icon={DollarSign}
                />
                <StatCard
                    title="Active Projects"
                    value={stats.activeProjects.toString()}
                    change={`${stats.completedProjects} completed`}
                    trend="up"
                    icon={FolderKanban}
                />
                <StatCard
                    title="Total Clients"
                    value={stats.totalClients.toString()}
                    change="Client relationships"
                    trend="up"
                    icon={Users}
                />
                <StatCard
                    title="Pending Invoices"
                    value={`$${stats.pendingInvoices.toLocaleString()}`}
                    change={`${stats.overdueInvoices} overdue`}
                    trend={stats.overdueInvoices > 0 ? "down" : "neutral"}
                    icon={Receipt}
                />
                <StatCard
                    title="Avg Project Value"
                    value={`$${Math.round(stats.avgProjectValue).toLocaleString()}`}
                    change="Per project"
                    trend="up"
                    icon={TrendingUp}
                />
                <StatCard
                    title="Completion Rate"
                    value={`${projects.length > 0 ? Math.round((stats.completedProjects / projects.length) * 100) : 0}%`}
                    change={`${stats.completedProjects}/${projects.length} projects`}
                    trend="up"
                    icon={CheckCircle2}
                />
            </div>

            {/* Service Breakdown */}
            {projects.length > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Service Breakdown</CardTitle>
                            <CardDescription>Projects by service vertical</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/analytics')}>
                            View Analytics
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            {(['video_production', 'social_media', 'design_branding'] as ServiceType[]).map((service) => {
                                const serviceData = serviceBreakdown.find(s => s.service_type === service) || { count: 0, percentage: 0 }
                                const config = SERVICE_TYPES[service]

                                return (
                                    <div
                                        key={service}
                                        className={`p-4 rounded-lg border-2 ${config.borderColor} ${config.bgColor} cursor-pointer hover:shadow-md transition-all`}
                                        onClick={() => router.push('/dashboard/projects')}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-2xl">{config.icon}</span>
                                            <Badge className={config.bgColor + ' ' + config.textColor}>
                                                {serviceData.count} {serviceData.count === 1 ? 'project' : 'projects'}
                                            </Badge>
                                        </div>
                                        <h3 className={`font-semibold mb-1 ${config.textColor}`}>{config.label}</h3>
                                        <p className="text-xs text-muted-foreground mb-3">{config.description}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">Share</span>
                                            <span className={`text-sm font-bold ${config.textColor}`}>
                                                {serviceData.percentage.toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
                {/* Recent Projects */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Recent Projects</CardTitle>
                            <CardDescription>Latest projects and their status</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/projects')}>
                            View All
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {recentProjects.length === 0 ? (
                            <div className="text-center py-8">
                                <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-sm text-muted-foreground">No projects yet</p>
                                <Button onClick={() => router.push('/dashboard/projects')} className="mt-4" size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Project
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentProjects.map((project) => (
                                    <div
                                        key={project.id}
                                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                                        onClick={() => router.push(`/dashboard/projects`)}
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium">{project.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {project.clients?.company_name || 'No client'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {project.budget && (
                                                <span className="text-sm font-medium">${project.budget.toLocaleString()}</span>
                                            )}
                                            <StatusBadge status={project.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Clients */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Recent Clients</CardTitle>
                            <CardDescription>Latest client additions</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {recentClients.length === 0 ? (
                            <div className="text-center py-8">
                                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-sm text-muted-foreground">No clients yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentClients.map((client) => {
                                    const clientProjects = projects.filter(p => p.client_id === client.id)
                                    const clientServices = [...new Set(clientProjects.map(p => p.service_type))]

                                    return (
                                        <div
                                            key={client.id}
                                            className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <p className="font-medium">{client.company_name}</p>
                                                    <p className="text-sm text-muted-foreground">{client.contact_person}</p>
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    {clientProjects.length} {clientProjects.length === 1 ? 'project' : 'projects'}
                                                </Badge>
                                            </div>
                                            {clientServices.length > 0 && (
                                                <div className="flex gap-1 flex-wrap">
                                                    {clientServices.map(service => {
                                                        const config = SERVICE_TYPES[service as ServiceType]
                                                        return (
                                                            <Badge key={service} variant="outline" className="text-xs">
                                                                {config.icon} {config.label}
                                                            </Badge>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Invoices */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Recent Invoices</CardTitle>
                            <CardDescription>Latest billing activity</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/invoices')}>
                            View All
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {recentInvoices.length === 0 ? (
                            <div className="text-center py-8">
                                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-sm text-muted-foreground">No invoices yet</p>
                                <Button onClick={() => router.push('/dashboard/invoices')} className="mt-4" size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Invoice
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentInvoices.map((invoice) => (
                                    <div
                                        key={invoice.id}
                                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                                        onClick={() => router.push(`/dashboard/invoices`)}
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium">{invoice.invoice_number}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {invoice.clients?.company_name || 'No client'}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-sm font-medium">${invoice.total?.toLocaleString()}</span>
                                            <StatusBadge status={invoice.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Overdue Invoices Alert */}
            {stats.overdueInvoices > 0 && (() => {
                const overdueInvoices = invoices.filter(inv =>
                    inv.status === 'pending' && inv.due_date && new Date(inv.due_date) < new Date()
                )
                return (
                    <Card className="border-red-500/50 bg-red-500/5">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                                <CardTitle className="text-red-500">Overdue Invoices</CardTitle>
                            </div>
                            <CardDescription>These invoices are past their due date</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {overdueInvoices.slice(0, 5).map((invoice) => {
                                    const daysOverdue = Math.floor((new Date().getTime() - new Date(invoice.due_date!).getTime()) / (1000 * 60 * 60 * 24))
                                    return (
                                        <div
                                            key={invoice.id}
                                            className="flex items-center justify-between p-3 rounded-lg border border-red-500/20 bg-background cursor-pointer hover:bg-accent transition-colors"
                                            onClick={() => router.push(`/dashboard/invoices`)}
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium">{invoice.invoice_number}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {invoice.clients?.company_name || 'No client'}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-sm font-medium">${invoice.total?.toLocaleString()}</span>
                                                <Badge variant="destructive" className="text-xs">
                                                    {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                                                </Badge>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            {overdueInvoices.length > 5 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full mt-4"
                                    onClick={() => router.push('/dashboard/invoices')}
                                >
                                    View all {overdueInvoices.length} overdue invoices
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )
            })()}

            {/* Upcoming Milestones */}
            {milestones.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Upcoming Milestones</CardTitle>
                        <CardDescription>Important deadlines to track</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {milestones.map((milestone) => (
                                <div
                                    key={milestone.id}
                                    className="flex items-center justify-between p-3 rounded-lg border"
                                >
                                    <div className="flex items-start gap-3">
                                        <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">{milestone.title}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {milestone.projects?.name || 'No project'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">
                                            {milestone.due_date ? new Date(milestone.due_date).toLocaleDateString() : 'No date'}
                                        </p>
                                        <Badge variant="outline" className="text-xs mt-1">
                                            {milestone.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
