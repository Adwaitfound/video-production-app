import express, { Request, Response } from 'express';
import db from '../utils/database';
import { authMiddleware, requireRole } from '../middleware/auth';
import { generateInvoicePDF } from '../utils/pdfGenerator';

const router = express.Router();

router.use(authMiddleware);

// Get all invoices
router.get('/', async (req: Request, res: Response) => {
  try {
    let query = `
      SELECT i.*, c.company_name, c.contact_name, c.email as client_email,
             p.title as project_title
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN projects p ON i.project_id = p.id
    `;

    // If user is client, only show their invoices
    if (req.user!.role === 'client') {
      const invoices = await db.query(
        `${query} WHERE c.email = ? ORDER BY i.created_at DESC`,
        [req.user!.email]
      );
      return res.json(invoices);
    }

    const invoices = await db.query(`${query} ORDER BY i.created_at DESC`);
    res.json(invoices);
  } catch (error: any) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get single invoice with items
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await db.get(
      `SELECT i.*, c.company_name, c.contact_name, c.email as client_email, c.address as client_address,
              p.title as project_title
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN projects p ON i.project_id = p.id
       WHERE i.id = ?`,
      [id]
    );

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check access for clients
    if (req.user!.role === 'client' && invoice.client_email !== req.user!.email) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get invoice items
    const items = await db.query(
      'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id',
      [id]
    );

    // Get payments
    const payments = await db.query(
      'SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC',
      [id]
    );

    res.json({ ...invoice, items, payments });
  } catch (error: any) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Create invoice
router.post('/', requireRole('admin', 'project_manager'), async (req: Request, res: Response) => {
  try {
    const {
      project_id,
      client_id,
      issue_date,
      due_date,
      items,
      tax_rate = 0,
      discount = 0,
      notes
    } = req.body;

    if (!client_id || !issue_date || !due_date || !items || items.length === 0) {
      return res.status(400).json({ error: 'Client, dates, and items are required' });
    }

    // Generate invoice number
    const lastInvoice = await db.get(
      'SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1'
    );
    const lastNumber = lastInvoice ? parseInt(lastInvoice.invoice_number.split('-')[1]) : 0;
    const invoice_number = `INV-${String(lastNumber + 1).padStart(5, '0')}`;

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + item.amount, 0);
    const tax_amount = subtotal * (tax_rate / 100);
    const total = subtotal + tax_amount - discount;

    // Insert invoice
    const result = await db.run(
      `INSERT INTO invoices (invoice_number, project_id, client_id, issue_date, due_date, subtotal, tax_rate, tax_amount, discount, total, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invoice_number, project_id || null, client_id, issue_date, due_date, subtotal, tax_rate, tax_amount, discount, total, notes || null]
    );

    // Insert invoice items
    for (const item of items) {
      await db.run(
        'INSERT INTO invoice_items (invoice_id, service_category, description, quantity, rate, amount) VALUES (?, ?, ?, ?, ?, ?)',
        [result.lastID, item.service_category, item.description, item.quantity, item.rate, item.amount]
      );
    }

    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [result.lastID]);
    res.status(201).json(invoice);
  } catch (error: any) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Update invoice
router.put('/:id', requireRole('admin', 'project_manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, issue_date, due_date, tax_rate, discount, notes, items } = req.body;

    const existingInvoice = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!existingInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // If items are provided, recalculate totals
    if (items && items.length > 0) {
      // Delete old items
      await db.run('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);

      // Insert new items
      const subtotal = items.reduce((sum: number, item: any) => sum + item.amount, 0);
      const tax_amount = subtotal * (tax_rate / 100);
      const total = subtotal + tax_amount - discount;

      for (const item of items) {
        await db.run(
          'INSERT INTO invoice_items (invoice_id, service_category, description, quantity, rate, amount) VALUES (?, ?, ?, ?, ?, ?)',
          [id, item.service_category, item.description, item.quantity, item.rate, item.amount]
        );
      }

      await db.run(
        `UPDATE invoices
         SET status = ?, issue_date = ?, due_date = ?, subtotal = ?, tax_rate = ?, tax_amount = ?, discount = ?, total = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, issue_date, due_date, subtotal, tax_rate, tax_amount, discount, total, notes || null, id]
      );
    } else {
      await db.run(
        `UPDATE invoices
         SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, id]
      );
    }

    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);
    res.json(invoice);
  } catch (error: any) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Generate PDF
router.get('/:id/pdf', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await db.get(
      `SELECT i.*, c.company_name, c.contact_name, c.email as client_email, c.address as client_address,
              p.title as project_title
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN projects p ON i.project_id = p.id
       WHERE i.id = ?`,
      [id]
    );

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check access for clients
    if (req.user!.role === 'client' && invoice.client_email !== req.user!.email) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const items = await db.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);
    const settings = await db.get('SELECT * FROM settings WHERE id = 1');

    const pdfBuffer = await generateInvoicePDF(invoice, items, settings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_number}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Record payment
router.post('/:id/payments', requireRole('admin', 'project_manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, payment_date, payment_method, reference_number, notes } = req.body;

    if (!amount || !payment_date) {
      return res.status(400).json({ error: 'Amount and payment date are required' });
    }

    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Insert payment
    await db.run(
      'INSERT INTO payments (invoice_id, amount, payment_date, payment_method, reference_number, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [id, amount, payment_date, payment_method || null, reference_number || null, notes || null]
    );

    // Update invoice paid amount and status
    const newPaidAmount = parseFloat(invoice.paid_amount) + parseFloat(amount);
    const newStatus = newPaidAmount >= parseFloat(invoice.total) ? 'paid' : invoice.status;

    await db.run(
      'UPDATE invoices SET paid_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPaidAmount, newStatus, id]
    );

    const updatedInvoice = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);
    res.json(updatedInvoice);
  } catch (error: any) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Delete invoice
router.delete('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await db.run('DELETE FROM invoices WHERE id = ?', [id]);
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error: any) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

export default router;
