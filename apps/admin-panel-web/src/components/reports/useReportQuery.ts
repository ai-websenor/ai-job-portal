import { useQuery } from '@tanstack/react-query';
import http from '@/api/http';

interface ApiResponse<T> {
  data: T;
  message: string;
  status: string;
  statusCode: number;
}

export function useReportQuery<T>(
  key: string[],
  url: string,
  params?: Record<string, unknown>,
  enabled = true,
) {
  return useQuery<T>({
    queryKey: key,
    queryFn: async () => {
      const res: ApiResponse<T> = await http.get(url, { params });
      return res.data;
    },
    enabled,
  });
}
