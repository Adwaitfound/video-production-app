import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import db from '../utils/database';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { uploadLimiter } from '../middleware/rateLimiter';

const router = express.Router();

router.use(authMiddleware);

// Upload file - with rate limiting
router.post('/upload', uploadLimiter, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { project_id, update_id } = req.body;

    if (!project_id) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Check if project exists
    const project = await db.get('SELECT * FROM projects WHERE id = ?', [project_id]);
    if (!project) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Project not found' });
    }

    const result = await db.run(
      `INSERT INTO project_files (project_id, update_id, filename, file_path, file_type, file_size, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        project_id,
        update_id || null,
        req.file.originalname,
        req.file.filename,
        req.file.mimetype,
        req.file.size,
        req.user!.id
      ]
    );

    const file = await db.get(
      `SELECT pf.*, u.name as uploaded_by_name
       FROM project_files pf
       LEFT JOIN users u ON pf.uploaded_by = u.id
       WHERE pf.id = ?`,
      [result.lastID]
    );

    res.status(201).json(file);
  } catch (error: any) {
    console.error('Upload file error:', error);
    // Clean up file if error occurred
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Download file
router.get('/download/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const file = await db.get(
      `SELECT pf.*, p.client_id
       FROM project_files pf
       LEFT JOIN projects p ON pf.project_id = p.id
       WHERE pf.id = ?`,
      [id]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check access for clients
    if (req.user!.role === 'client') {
      const client = await db.get('SELECT * FROM clients WHERE id = ? AND email = ?', [file.client_id, req.user!.email]);
      if (!client) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const filePath = path.join(__dirname, '../../uploads', file.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.download(filePath, file.filename);
  } catch (error: any) {
    console.error('Download file error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Get file info
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const file = await db.get(
      `SELECT pf.*, u.name as uploaded_by_name, p.client_id
       FROM project_files pf
       LEFT JOIN users u ON pf.uploaded_by = u.id
       LEFT JOIN projects p ON pf.project_id = p.id
       WHERE pf.id = ?`,
      [id]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check access for clients
    if (req.user!.role === 'client') {
      const client = await db.get('SELECT * FROM clients WHERE id = ? AND email = ?', [file.client_id, req.user!.email]);
      if (!client) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json(file);
  } catch (error: any) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

// Delete file
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const file = await db.get('SELECT * FROM project_files WHERE id = ?', [id]);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Only allow deletion by uploader or admin
    if (file.uploaded_by !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../../uploads', file.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await db.run('DELETE FROM project_files WHERE id = ?', [id]);
    res.json({ message: 'File deleted successfully' });
  } catch (error: any) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
