import express, { Request, Response } from 'express';
import db from '../utils/database';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all clients
router.get('/', requireRole('admin', 'project_manager'), async (req: Request, res: Response) => {
  try {
    const clients = await db.query('SELECT * FROM clients ORDER BY created_at DESC');
    res.json(clients);
  } catch (error: any) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// Get single client
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = await db.get('SELECT * FROM clients WHERE id = ?', [id]);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get client's projects
    const projects = await db.query(
      'SELECT * FROM projects WHERE client_id = ? ORDER BY created_at DESC',
      [id]
    );

    res.json({ ...client, projects });
  } catch (error: any) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// Create client
router.post('/', requireRole('admin', 'project_manager'), async (req: Request, res: Response) => {
  try {
    const { company_name, contact_name, email, phone, address, notes } = req.body;

    if (!company_name || !contact_name || !email) {
      return res.status(400).json({ error: 'Company name, contact name, and email are required' });
    }

    const result = await db.run(
      `INSERT INTO clients (company_name, contact_name, email, phone, address, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [company_name, contact_name, email, phone || null, address || null, notes || null]
    );

    const client = await db.get('SELECT * FROM clients WHERE id = ?', [result.lastID]);
    res.status(201).json(client);
  } catch (error: any) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// Update client
router.put('/:id', requireRole('admin', 'project_manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { company_name, contact_name, email, phone, address, notes } = req.body;

    // Check if client exists
    const existingClient = await db.get('SELECT * FROM clients WHERE id = ?', [id]);
    if (!existingClient) {
      return res.status(404).json({ error: 'Client not found' });
    }

    await db.run(
      `UPDATE clients 
       SET company_name = ?, contact_name = ?, email = ?, phone = ?, address = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [company_name, contact_name, email, phone || null, address || null, notes || null, id]
    );

    const client = await db.get('SELECT * FROM clients WHERE id = ?', [id]);
    res.json(client);
  } catch (error: any) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// Delete client
router.delete('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if client exists
    const client = await db.get('SELECT * FROM clients WHERE id = ?', [id]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Check if client has projects
    const projects = await db.query('SELECT * FROM projects WHERE client_id = ?', [id]);
    if (projects.length > 0) {
      return res.status(400).json({ error: 'Cannot delete client with existing projects' });
    }

    await db.run('DELETE FROM clients WHERE id = ?', [id]);
    res.json({ message: 'Client deleted successfully' });
  } catch (error: any) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

export default router;
