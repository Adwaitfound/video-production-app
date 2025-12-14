export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'project_manager' | 'team_member' | 'client';
  created_at: string;
}

export interface Client {
  id: number;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  client_id: number;
  title: string;
  description?: string;
  project_type: 'video' | 'social_media' | 'design';
  status: 'planning' | 'in_progress' | 'review' | 'revision' | 'completed' | 'on_hold';
  start_date?: string;
  deadline?: string;
  budget?: number;
  assigned_to?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  company_name?: string;
  contact_name?: string;
  assigned_to_name?: string;
  created_by_name?: string;
}

export interface ProjectUpdate {
  id: number;
  project_id: number;
  user_id: number;
  title: string;
  content?: string;
  update_type: 'progress' | 'milestone' | 'revision' | 'delivery';
  visibility: 'internal' | 'client';
  created_at: string;
  user_name?: string;
  user_role?: string;
}

export interface ProjectComment {
  id: number;
  update_id: number;
  user_id: number;
  content: string;
  created_at: string;
  user_name?: string;
  user_role?: string;
}

export interface ProjectFile {
  id: number;
  project_id: number;
  update_id?: number;
  filename: string;
  file_path: string;
  file_type: string;
  file_size: number;
  version: number;
  uploaded_by: number;
  uploaded_at: string;
  uploaded_by_name?: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  project_id?: number;
  client_id: number;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  total: number;
  paid_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  company_name?: string;
  contact_name?: string;
  project_title?: string;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  service_category: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Payment {
  id: number;
  invoice_id: number;
  amount: number;
  payment_date: string;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
}

export interface Milestone {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  completed_date?: string;
  created_at: string;
}

export interface DashboardData {
  projects: {
    total: number;
    active: number;
    byStatus: Array<{ status: string; count: number }>;
    byType: Array<{ project_type: string; count: number }>;
  };
  revenue: {
    total: number;
    paid: number;
    outstanding: number;
    monthly: Array<{ month: string; revenue: number }>;
  };
  invoices: {
    byStatus: Array<{ status: string; count: number; total: number }>;
  };
  clients: {
    total: number;
  };
  recentActivities: ProjectUpdate[];
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}
