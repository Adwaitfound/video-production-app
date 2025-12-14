import api from './api';
import { Invoice, InvoiceItem } from '../types';

export const invoiceService = {
  async getAll(): Promise<Invoice[]> {
    const response = await api.get<Invoice[]>('/invoices');
    return response.data;
  },

  async getById(id: number): Promise<Invoice & { items: InvoiceItem[] }> {
    const response = await api.get<Invoice & { items: InvoiceItem[] }>(`/invoices/${id}`);
    return response.data;
  },

  async create(invoice: Partial<Invoice> & { items: Partial<InvoiceItem>[] }): Promise<Invoice> {
    const response = await api.post<Invoice>('/invoices', invoice);
    return response.data;
  },

  async update(id: number, invoice: Partial<Invoice> & { items?: Partial<InvoiceItem>[] }): Promise<Invoice> {
    const response = await api.put<Invoice>(`/invoices/${id}`, invoice);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/invoices/${id}`);
  },

  async downloadPDF(id: number): Promise<Blob> {
    const response = await api.get(`/invoices/${id}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  },

  async recordPayment(id: number, payment: {
    amount: number;
    payment_date: string;
    payment_method?: string;
    reference_number?: string;
    notes?: string;
  }): Promise<Invoice> {
    const response = await api.post<Invoice>(`/invoices/${id}/payments`, payment);
    return response.data;
  }
};
