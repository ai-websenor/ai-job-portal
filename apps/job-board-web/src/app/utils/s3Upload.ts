import axios from "axios";
import http from "../api/http";

export interface S3UploadOptions {
  file: File;
  category: string;
  onProgress?: (percent: number) => void;
}

export interface S3UploadResult {
  key: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}

/**
 * Uploads a file directly to S3 using a presigned URL.
 * Step 1: Get presigned URL from backend (authenticated).
 * Step 2: PUT file to S3 (no auth header — S3 validates the signature).
 * Returns the S3 key for use in confirm endpoints.
 */
export async function uploadToS3({
  file,
  category,
  onProgress,
}: S3UploadOptions): Promise<S3UploadResult> {
  // Step 1: Get presigned URL
  const presignResponse: any = await http.post("/uploads/presign", {
    category,
    fileName: file.name,
    contentType: file.type,
    fileSize: file.size,
  });

  const { uploadUrl, key } = presignResponse.data ?? presignResponse;

  // Step 2: Upload directly to S3 (separate axios instance, no auth interceptor)
  await axios.put(uploadUrl, file, {
    headers: {
      "Content-Type": file.type,
    },
    onUploadProgress: onProgress
      ? (progressEvent) => {
          const percent = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          onProgress(percent);
        }
      : undefined,
  });

  return {
    key,
    fileName: file.name,
    contentType: file.type,
    fileSize: file.size,
  };
}
