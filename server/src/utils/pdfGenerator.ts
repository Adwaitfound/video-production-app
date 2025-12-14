import PDFDocument from 'pdfkit';

export const generateInvoicePDF = (invoice: any, items: any[], settings: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Header
      doc.fontSize(20).text(settings.company_name || 'Video Production Agency', 50, 50);
      doc.fontSize(10).text(settings.company_address || '', 50, 75);
      doc.text(settings.company_email || '', 50, 90);
      doc.text(settings.company_phone || '', 50, 105);

      // Invoice title and number
      doc.fontSize(24).text('INVOICE', 400, 50);
      doc.fontSize(12).text(invoice.invoice_number, 400, 80);

      // Invoice details
      doc.fontSize(10);
      doc.text(`Issue Date: ${invoice.issue_date}`, 400, 100);
      doc.text(`Due Date: ${invoice.due_date}`, 400, 115);
      doc.text(`Status: ${invoice.status.toUpperCase()}`, 400, 130);

      // Client information
      doc.fontSize(12).text('Bill To:', 50, 150);
      doc.fontSize(10);
      doc.text(invoice.company_name, 50, 170);
      doc.text(invoice.contact_name, 50, 185);
      if (invoice.client_address) {
        doc.text(invoice.client_address, 50, 200);
      }

      // Project info
      if (invoice.project_title) {
        doc.fontSize(12).text('Project:', 50, 230);
        doc.fontSize(10).text(invoice.project_title, 50, 250);
      }

      // Line items table
      const tableTop = 300;
      const itemX = 50;
      const descriptionX = 150;
      const qtyX = 350;
      const rateX = 400;
      const amountX = 480;

      // Table headers
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Service', itemX, tableTop);
      doc.text('Description', descriptionX, tableTop);
      doc.text('Qty', qtyX, tableTop);
      doc.text('Rate', rateX, tableTop);
      doc.text('Amount', amountX, tableTop);

      // Draw header line
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      // Table items
      doc.font('Helvetica');
      let yPosition = tableTop + 25;

      items.forEach((item) => {
        doc.text(item.service_category, itemX, yPosition, { width: 90 });
        doc.text(item.description, descriptionX, yPosition, { width: 180 });
        doc.text(item.quantity.toString(), qtyX, yPosition);
        doc.text(`$${parseFloat(item.rate).toFixed(2)}`, rateX, yPosition);
        doc.text(`$${parseFloat(item.amount).toFixed(2)}`, amountX, yPosition);
        yPosition += 30;
      });

      // Draw line before totals
      doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
      yPosition += 15;

      // Totals
      const totalsX = 400;
      doc.text('Subtotal:', totalsX, yPosition);
      doc.text(`$${parseFloat(invoice.subtotal).toFixed(2)}`, amountX, yPosition);
      yPosition += 20;

      if (invoice.tax_rate > 0) {
        doc.text(`Tax (${invoice.tax_rate}%):`, totalsX, yPosition);
        doc.text(`$${parseFloat(invoice.tax_amount).toFixed(2)}`, amountX, yPosition);
        yPosition += 20;
      }

      if (invoice.discount > 0) {
        doc.text('Discount:', totalsX, yPosition);
        doc.text(`-$${parseFloat(invoice.discount).toFixed(2)}`, amountX, yPosition);
        yPosition += 20;
      }

      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('Total:', totalsX, yPosition);
      doc.text(`$${parseFloat(invoice.total).toFixed(2)}`, amountX, yPosition);
      yPosition += 20;

      if (invoice.paid_amount > 0) {
        doc.font('Helvetica').fontSize(10);
        doc.text('Paid:', totalsX, yPosition);
        doc.text(`$${parseFloat(invoice.paid_amount).toFixed(2)}`, amountX, yPosition);
        yPosition += 20;

        const balance = parseFloat(invoice.total) - parseFloat(invoice.paid_amount);
        doc.font('Helvetica-Bold');
        doc.text('Balance Due:', totalsX, yPosition);
        doc.text(`$${balance.toFixed(2)}`, amountX, yPosition);
      }

      // Notes
      if (invoice.notes) {
        yPosition += 40;
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('Notes:', 50, yPosition);
        doc.font('Helvetica').fontSize(9);
        doc.text(invoice.notes, 50, yPosition + 15, { width: 500 });
      }

      // Footer
      doc.fontSize(8).text(
        'Thank you for your business!',
        50,
        doc.page.height - 50,
        { align: 'center', width: 500 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
