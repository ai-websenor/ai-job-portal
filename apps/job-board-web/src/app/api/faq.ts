import ENDPOINTS from './endpoints';
import http from './http';

export interface IFaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
}

export const getFaqs = async (): Promise<IFaqItem[]> => {
  const response: any = await http.get(ENDPOINTS.FAQ.LIST);
  return response?.data ? response.data : response || [];
};
