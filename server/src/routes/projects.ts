import express, { Request, Response } from 'express';
import db from '../utils/database';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = express.Router();

router.use(authMiddleware);

// Get all projects
router.get('/', async (req: Request, res: Response) => {
  try {
    let query = `
      SELECT p.*, c.company_name, c.contact_name,
             u.name as assigned_to_name, creator.name as created_by_name
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users u ON p.assigned_to = u.id
      LEFT JOIN users creator ON p.created_by = creator.id
    `;

    // If user is client, only show their projects
    if (req.user!.role === 'client') {
      const clientProjects = await db.query(
        `${query} WHERE c.email = ? ORDER BY p.created_at DESC`,
        [req.user!.email]
      );
      return res.json(clientProjects);
    }

    const projects = await db.query(`${query} ORDER BY p.created_at DESC`);
    res.json(projects);
  } catch (error: any) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const project = await db.get(
      `SELECT p.*, c.company_name, c.contact_name, c.email as client_email,
              u.name as assigned_to_name, creator.name as created_by_name
       FROM projects p
       LEFT JOIN clients c ON p.client_id = c.id
       LEFT JOIN users u ON p.assigned_to = u.id
       LEFT JOIN users creator ON p.created_by = creator.id
       WHERE p.id = ?`,
      [id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check access for clients
    if (req.user!.role === 'client' && project.client_email !== req.user!.email) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get project updates
    const updates = await db.query(
      `SELECT pu.*, u.name as user_name, u.role as user_role
       FROM project_updates pu
       LEFT JOIN users u ON pu.user_id = u.id
       WHERE pu.project_id = ?
       ORDER BY pu.created_at DESC`,
      [id]
    );

    // Filter internal updates for clients
    const filteredUpdates = req.user!.role === 'client' 
      ? updates.filter(u => u.visibility === 'client')
      : updates;

    // Get milestones
    const milestones = await db.query(
      'SELECT * FROM milestones WHERE project_id = ? ORDER BY due_date',
      [id]
    );

    // Get files
    const files = await db.query(
      `SELECT pf.*, u.name as uploaded_by_name
       FROM project_files pf
       LEFT JOIN users u ON pf.uploaded_by = u.id
       WHERE pf.project_id = ?
       ORDER BY pf.uploaded_at DESC`,
      [id]
    );

    res.json({ ...project, updates: filteredUpdates, milestones, files });
  } catch (error: any) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
router.post('/', requireRole('admin', 'project_manager'), async (req: Request, res: Response) => {
  try {
    const {
      client_id,
      title,
      description,
      project_type,
      status = 'planning',
      start_date,
      deadline,
      budget,
      assigned_to
    } = req.body;

    if (!client_id || !title || !project_type) {
      return res.status(400).json({ error: 'Client, title, and project type are required' });
    }

    const result = await db.run(
      `INSERT INTO projects (client_id, title, description, project_type, status, start_date, deadline, budget, assigned_to, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [client_id, title, description || null, project_type, status, start_date || null, deadline || null, budget || null, assigned_to || null, req.user!.id]
    );

    const project = await db.get('SELECT * FROM projects WHERE id = ?', [result.lastID]);
    res.status(201).json(project);
  } catch (error: any) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', requireRole('admin', 'project_manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      project_type,
      status,
      start_date,
      deadline,
      budget,
      assigned_to
    } = req.body;

    const existingProject = await db.get('SELECT * FROM projects WHERE id = ?', [id]);
    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await db.run(
      `UPDATE projects
       SET title = ?, description = ?, project_type = ?, status = ?, start_date = ?, deadline = ?, budget = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, description || null, project_type, status, start_date || null, deadline || null, budget || null, assigned_to || null, id]
    );

    const project = await db.get('SELECT * FROM projects WHERE id = ?', [id]);
    res.json(project);
  } catch (error: any) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const project = await db.get('SELECT * FROM projects WHERE id = ?', [id]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await db.run('DELETE FROM projects WHERE id = ?', [id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
