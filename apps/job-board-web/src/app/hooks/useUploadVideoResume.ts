import { useState } from "react";
import ENDPOINTS from "../api/endpoints";
import http from "../api/http";
import { addToast } from "@heroui/react";

type HandleUploadParams = {
  video: File;
  duration: number;
};

type FetchByUrlParams = {
  uploadUrl: string;
  key: string;
  duration: number;
  video: File;
};

type ConfirmUploadParams = {
  key: string;
  duration: number;
  video: File;
};

const useUploadVideoResume = (onSuccess?: () => void) => {
  const [loading, setLoading] = useState(false);

  const handleUpload = async (params: HandleUploadParams) => {
    try {
      const payload = {
        fileName: params.video?.name,
        contentType: params.video?.type,
        fileSize: params.video?.size,
        durationSeconds: Math.floor(params.duration),
      };

      setLoading(true);
      const response = await http.post(
        ENDPOINTS.RESUME_VIDEO.PRE_SIGNED_UPLOAD,
        payload,
      );

      if (response?.data) {
        fetchVideoByUrl({
          ...response?.data,
          duration: params.duration,
          video: params.video,
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
        method: "PUT",
        headers: { "Content-Type": "video/mp4" },
        body: params.video,
      });

      confirmUpload(params);
    } catch (error) {
      console.log(error);
      setLoading(false);
      addToast({
        color: "danger",
        title: "Oops",
        description: "Something went wrong",
      });
    }
  };

  const confirmUpload = async (params: ConfirmUploadParams) => {
    try {
      await http.post(ENDPOINTS.RESUME_VIDEO.CONFIRM_UPLOAD, {
        key: params?.key,
        fileName: params.video?.name,
        durationSeconds: params.duration,
      });
      addToast({
        color: "success",
        title: "Success",
        description: "Resume video uploaded",
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

export default useUploadVideoResume;
