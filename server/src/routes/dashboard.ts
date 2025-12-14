import express, { Request, Response } from 'express';
import db from '../utils/database';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = express.Router();

router.use(authMiddleware);

// Admin dashboard
router.get('/admin', requireRole('admin', 'project_manager'), async (req: Request, res: Response) => {
  try {
    // Project statistics
    const projectStats = await db.query(`
      SELECT status, COUNT(*) as count
      FROM projects
      GROUP BY status
    `);

    // Total projects
    const totalProjects = await db.get('SELECT COUNT(*) as count FROM projects');

    // Active projects (not completed or on hold)
    const activeProjects = await db.get(`
      SELECT COUNT(*) as count FROM projects
      WHERE status NOT IN ('completed', 'on_hold')
    `);

    // Revenue metrics
    const revenueStats = await db.get(`
      SELECT 
        SUM(total) as total_revenue,
        SUM(paid_amount) as total_paid,
        SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) as paid_invoices_total,
        SUM(CASE WHEN status != 'paid' AND status != 'cancelled' THEN total - paid_amount ELSE 0 END) as outstanding
      FROM invoices
    `);

    // Monthly revenue (current year)
    const monthlyRevenue = await db.query(`
      SELECT 
        strftime('%m', issue_date) as month,
        SUM(total) as revenue
      FROM invoices
      WHERE strftime('%Y', issue_date) = strftime('%Y', 'now')
      GROUP BY month
      ORDER BY month
    `);

    // Invoice statistics
    const invoiceStats = await db.query(`
      SELECT status, COUNT(*) as count, SUM(total) as total
      FROM invoices
      GROUP BY status
    `);

    // Recent activities (last 10)
    const recentUpdates = await db.query(`
      SELECT pu.*, p.title as project_title, u.name as user_name
      FROM project_updates pu
      LEFT JOIN projects p ON pu.project_id = p.id
      LEFT JOIN users u ON pu.user_id = u.id
      ORDER BY pu.created_at DESC
      LIMIT 10
    `);

    // Project type breakdown
    const projectTypeStats = await db.query(`
      SELECT project_type, COUNT(*) as count
      FROM projects
      GROUP BY project_type
    `);

    // Client count
    const clientCount = await db.get('SELECT COUNT(*) as count FROM clients');

    res.json({
      projects: {
        total: totalProjects.count,
        active: activeProjects.count,
        byStatus: projectStats,
        byType: projectTypeStats
      },
      revenue: {
        total: revenueStats.total_revenue || 0,
        paid: revenueStats.total_paid || 0,
        outstanding: revenueStats.outstanding || 0,
        monthly: monthlyRevenue
      },
      invoices: {
        byStatus: invoiceStats
      },
      clients: {
        total: clientCount.count
      },
      recentActivities: recentUpdates
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Client dashboard
router.get('/client', requireRole('client'), async (req: Request, res: Response) => {
  try {
    // Get client
    const client = await db.get('SELECT * FROM clients WHERE email = ?', [req.user!.email]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get client projects
    const projects = await db.query(`
      SELECT p.*, u.name as assigned_to_name
      FROM projects p
      LEFT JOIN users u ON p.assigned_to = u.id
      WHERE p.client_id = ?
      ORDER BY p.created_at DESC
    `, [client.id]);

    // Get project statistics
    const projectStats = await db.query(`
      SELECT status, COUNT(*) as count
      FROM projects
      WHERE client_id = ?
      GROUP BY status
    `, [client.id]);

    // Get invoices
    const invoices = await db.query(`
      SELECT i.*, p.title as project_title
      FROM invoices i
      LEFT JOIN projects p ON i.project_id = p.id
      WHERE i.client_id = ?
      ORDER BY i.created_at DESC
    `, [client.id]);

    // Calculate invoice totals
    const invoiceTotals = invoices.reduce((acc: any, inv: any) => {
      acc.total += parseFloat(inv.total);
      acc.paid += parseFloat(inv.paid_amount);
      if (inv.status !== 'paid' && inv.status !== 'cancelled') {
        acc.outstanding += parseFloat(inv.total) - parseFloat(inv.paid_amount);
      }
      return acc;
    }, { total: 0, paid: 0, outstanding: 0 });

    // Get recent updates
    const recentUpdates = await db.query(`
      SELECT pu.*, p.title as project_title, u.name as user_name
      FROM project_updates pu
      LEFT JOIN projects p ON pu.project_id = p.id
      LEFT JOIN users u ON pu.user_id = u.id
      WHERE p.client_id = ? AND pu.visibility = 'client'
      ORDER BY pu.created_at DESC
      LIMIT 10
    `, [client.id]);

    res.json({
      projects: {
        list: projects,
        byStatus: projectStats
      },
      invoices: {
        list: invoices.slice(0, 5),
        totals: invoiceTotals
      },
      recentUpdates
    });
  } catch (error: any) {
    console.error('Client dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
