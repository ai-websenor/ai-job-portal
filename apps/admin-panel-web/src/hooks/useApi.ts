import { useState } from "react";
import http from "@/api/http";
import { toast } from "sonner";

interface UseApiOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
}

export function useApi<T = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = async (
    apiCall: () => Promise<T>,
    options: UseApiOptions = {}
  ): Promise<T | null> => {
    const {
      showSuccessToast = false,
      showErrorToast = true,
      successMessage = "Operation successful",
    } = options;

    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      setData(result);

      if (showSuccessToast) {
        toast.success(successMessage);
      }

      return result;
    } catch (err: any) {
      setError(err);

      if (showErrorToast) {
        const message = err?.message || "An error occurred";
        toast.error(message);
      }

      return null;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading, error, data };
}
