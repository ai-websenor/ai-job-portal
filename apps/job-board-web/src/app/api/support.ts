import ENDPOINTS from './endpoints';
import http from './http';
import { ISupportTicket, ISupportTicketDetail, ITicketMessage } from '../types/support';

export const listTickets = async (): Promise<ISupportTicket[]> => {
  const response: any = await http.get(ENDPOINTS.SUPPORT.TICKETS);
  // Based on spec, it might return array directly or wrapped in data
  return response?.data ? response.data : response || [];
};

export const createTicket = async (payload: {
  subject: string;
  message: string;
  category?: string;
  priority?: string;
  attachments?: string[];
}): Promise<ISupportTicket> => {
  const response: any = await http.post(ENDPOINTS.SUPPORT.TICKETS, payload);
  return response?.data ? response.data : response;
};

export const getTicket = async (id: string): Promise<ISupportTicketDetail> => {
  const response: any = await http.get(ENDPOINTS.SUPPORT.TICKET_DETAILS(id));
  return response?.data ? response.data : response;
};

export const addMessage = async (
  id: string,
  payload: { message: string; attachments?: string[] }
): Promise<ITicketMessage> => {
  const response: any = await http.post(ENDPOINTS.SUPPORT.ADD_MESSAGE(id), payload);
  return response?.data ? response.data : response;
};

export const uploadSupportAttachment = async (file: File): Promise<string> => {
  const payload = {
    fileName: file.name,
    contentType: file.type,
    fileSize: file.size,
  };
  const res: any = await http.post(ENDPOINTS.SUPPORT.ATTACHMENT_UPLOAD_URL, payload);
  const data = res?.data ? res.data : res;
  
  await fetch(data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  return data.key;
};
