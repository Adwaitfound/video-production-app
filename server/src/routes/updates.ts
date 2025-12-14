import express, { Request, Response } from 'express';
import db from '../utils/database';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.use(authMiddleware);

// Create project update
router.post('/', async (req: Request, res: Response) => {
  try {
    const { project_id, title, content, update_type = 'progress', visibility = 'client' } = req.body;

    if (!project_id || !title) {
      return res.status(400).json({ error: 'Project ID and title are required' });
    }

    // Check if project exists
    const project = await db.get('SELECT * FROM projects WHERE id = ?', [project_id]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const result = await db.run(
      `INSERT INTO project_updates (project_id, user_id, title, content, update_type, visibility)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [project_id, req.user!.id, title, content || null, update_type, visibility]
    );

    const update = await db.get(
      `SELECT pu.*, u.name as user_name, u.role as user_role
       FROM project_updates pu
       LEFT JOIN users u ON pu.user_id = u.id
       WHERE pu.id = ?`,
      [result.lastID]
    );

    res.status(201).json(update);
  } catch (error: any) {
    console.error('Create update error:', error);
    res.status(500).json({ error: 'Failed to create update' });
  }
});

// Get update with comments
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const update = await db.get(
      `SELECT pu.*, u.name as user_name, u.role as user_role
       FROM project_updates pu
       LEFT JOIN users u ON pu.user_id = u.id
       WHERE pu.id = ?`,
      [id]
    );

    if (!update) {
      return res.status(404).json({ error: 'Update not found' });
    }

    // Get comments
    const comments = await db.query(
      `SELECT pc.*, u.name as user_name, u.role as user_role
       FROM project_comments pc
       LEFT JOIN users u ON pc.user_id = u.id
       WHERE pc.update_id = ?
       ORDER BY pc.created_at ASC`,
      [id]
    );

    res.json({ ...update, comments });
  } catch (error: any) {
    console.error('Get update error:', error);
    res.status(500).json({ error: 'Failed to fetch update' });
  }
});

// Add comment to update
router.post('/:id/comments', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Check if update exists
    const update = await db.get('SELECT * FROM project_updates WHERE id = ?', [id]);
    if (!update) {
      return res.status(404).json({ error: 'Update not found' });
    }

    const result = await db.run(
      'INSERT INTO project_comments (update_id, user_id, content) VALUES (?, ?, ?)',
      [id, req.user!.id, content]
    );

    const comment = await db.get(
      `SELECT pc.*, u.name as user_name, u.role as user_role
       FROM project_comments pc
       LEFT JOIN users u ON pc.user_id = u.id
       WHERE pc.id = ?`,
      [result.lastID]
    );

    res.status(201).json(comment);
  } catch (error: any) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Delete update
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const update = await db.get('SELECT * FROM project_updates WHERE id = ?', [id]);
    if (!update) {
      return res.status(404).json({ error: 'Update not found' });
    }

    // Only allow deletion by the creator or admin
    if (update.user_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.run('DELETE FROM project_updates WHERE id = ?', [id]);
    res.json({ message: 'Update deleted successfully' });
  } catch (error: any) {
    console.error('Delete update error:', error);
    res.status(500).json({ error: 'Failed to delete update' });
  }
});

export default router;
