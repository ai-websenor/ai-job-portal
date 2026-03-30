import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import { DialogProps, IPlan, IPlanPreview } from '@/app/types/types';
import { useEffect, useState } from 'react';

interface Props extends DialogProps {
  plan: IPlan;
}

const PlanPreviewDialog = ({ isOpen, onClose, plan }: Props) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<IPlanPreview | null>(null);

  const getPreview = async () => {
    try {
      setLoading(true);
      const res = await http.post(ENDPOINTS.SUBSCRIPTIONS.PREVIEW, { planId: plan.id });
      setPreview(res?.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && plan?.id) {
      getPreview();
    }
  }, [isOpen, plan?.id]);

  return null;
};

export default PlanPreviewDialog;
