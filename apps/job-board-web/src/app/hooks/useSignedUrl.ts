import { useState } from 'react';
import http from '../api/http';
import { addToast } from '@heroui/react';

type UseSignedUrlParams = {
  onSuccess?: () => void;
  isSizeRequired?: boolean;
  endpoints: {
    preSignedEndpoint: string;
    confirmUploadEndpoint: string;
  };
};

type HandleUploadParams = {
  file: File;
  fileKey: string;
  duration?: number;
};

type FetchByUrlParams = {
  uploadUrl: string;
  key: string;
  duration?: number;
  file: File;
};

type ConfirmUploadParams = {
  key: string;
  duration?: number;
  file: File;
};

const useSignedUrl = ({ endpoints, onSuccess, isSizeRequired }: UseSignedUrlParams) => {
  const [loading, setLoading] = useState(false);

  const handleUpload = async (params: HandleUploadParams) => {
    try {
      const payload = {
        fileName: params.file?.name,
        contentType: params.file?.type,
        ...(isSizeRequired && { fileSize: params.file?.size }),
        ...(params.duration && { durationSeconds: Math.floor(params.duration) }),
      };

      setLoading(true);
      const response = await http.post(endpoints.preSignedEndpoint, payload);

      if (response?.data) {
        fetchVideoByUrl({
          ...response?.data,
          duration: params.duration,
          [params.fileKey]: params.file,
        });
      }
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  const fetchVideoByUrl = async (params: FetchByUrlParams) => {
    try {
      await fetch(params?.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'video/mp4' },
        body: params.file,
      });

      confirmUpload(params);
    } catch (error) {
      console.log(error);
      setLoading(false);
      addToast({
        color: 'danger',
        title: 'Oops',
        description: 'Something went wrong',
      });
    }
  };

  const confirmUpload = async (params: ConfirmUploadParams) => {
    try {
      await http.post(endpoints.confirmUploadEndpoint, {
        key: params?.key,
        fileName: params.file?.name,
        ...(params.duration && { durationSeconds: Math.floor(params.duration) }),
      });
      addToast({
        color: 'success',
        title: 'Success',
        description: 'Attachment uploaded successfully',
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleUpload,
  };
};

export default useSignedUrl;
