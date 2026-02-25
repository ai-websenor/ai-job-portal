import { ProfileEditProps } from '@/app/types/types';
import { useWatch } from 'react-hook-form';
import { addToast, Alert, Button, Card, CardBody } from '@heroui/react';
import CommonUtils from '@/app/utils/commonUtils';
import { RiDeleteBinLine } from 'react-icons/ri';
import { useState } from 'react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import ActionButtons from '@/app/video-resume/ActionButtons';
import VideoPreviewSection from '@/app/video-resume/VideoPreviewSection';
import LoadingProgress from '../lib/LoadingProgress';
import { VideoResumeStatus } from '@/app/types/enum';
import dynamic from 'next/dynamic';
import APP_CONFIG from '@/app/config/config';
import { MdOutlineVideoCameraFront } from 'react-icons/md';
import { HiOutlineDownload } from 'react-icons/hi';
import useSignedUrl from '@/app/hooks/useSignedUrl';

const VideoRecorder = dynamic(() => import('../lib/VideoRecorder'), {
  ssr: false,
  loading: () => <LoadingProgress />,
});

const VideoResumeSection = ({ control, refetch }: ProfileEditProps) => {
  const [loading, setLoading] = useState(false);
  const [video, setVideo] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const { videoStatus, videoUrl, videoRejectionReason } = useWatch({ control });

  const { loading: uploadLoading, handleUpload } = useSignedUrl({
    endpoints: {
      preSignedEndpoint: ENDPOINTS.RESUME_VIDEO.PRE_SIGNED_UPLOAD,
      confirmUploadEndpoint: ENDPOINTS.RESUME_VIDEO.CONFIRM_UPLOAD,
    },
    onSuccess: () => {
      setVideo(null);
      refetch();
    },
  });

  const handleDelete = async () => {
    try {
      setLoading(true);
      await http.delete(ENDPOINTS.RESUME_VIDEO.DELETE);
      refetch();
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  const onUpload = async () => {
    if (!video) return;

    const duration = await CommonUtils.getVideoDurationByUrl(URL.createObjectURL(video));

    if (
      duration < APP_CONFIG.RESUME_VIDEO_CONFIGS.MIN_DURATION ||
      duration > APP_CONFIG.RESUME_VIDEO_CONFIGS.MAX_DURATION
    ) {
      addToast({
        title: 'Oops',
        color: 'danger',
        description: APP_CONFIG.RESUME_VIDEO_CONFIGS.ALERT,
      });
      return;
    }

    const bytes = video.size;
    const size = (bytes / (1024 * 1024)).toFixed(2);

    if (Number(size) > APP_CONFIG.RESUME_VIDEO_CONFIGS.MAX_SIZE) {
      addToast({
        title: 'Oops',
        color: 'danger',
        description: `Video can not be greater than ${APP_CONFIG.RESUME_VIDEO_CONFIGS.MAX_SIZE}`,
      });
      return;
    }

    handleUpload({
      duration,
      fileKey: 'video',
      file: video,
    });
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.RESUME_VIDEO.DOWNLOAD);
      if (response?.data?.downloadUrl) {
        if (typeof window !== 'undefined') {
          window.open(response?.data?.downloadUrl, '_blank');
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Video Resume</h1>
      {loading || uploadLoading ? (
        <LoadingProgress />
      ) : videoUrl ? (
        <div className="relative">
          <Card radius="sm" shadow="none" className="border-primary bg-secondary border">
            <CardBody className="flex flex-row items-center justify-between py-3 px-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <MdOutlineVideoCameraFront className="text-primary text-xl flex-shrink-0" />
                <span className="text-sm font-medium truncate text-neutral-800">{videoUrl}</span>
              </div>
              <div className="flex items-center gap-3">
                <Button onPress={handleDelete} size="sm" isIconOnly color="danger" variant="flat">
                  <RiDeleteBinLine size={16} />
                </Button>
                <Button
                  onPress={handleDownload}
                  size="sm"
                  isIconOnly
                  color="primary"
                  variant="flat"
                >
                  <HiOutlineDownload size={16} />
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : video ? (
        <div className="max-h-[600px] flex flex-col gap-5">
          <VideoPreviewSection video={video} onUpload={onUpload} onRemove={() => setVideo(null)} />
        </div>
      ) : isRecording ? (
        <VideoRecorder
          onCancel={() => setIsRecording(false)}
          onVideoFileReady={(video) => {
            setVideo(video);
            setIsRecording(false);
          }}
        />
      ) : (
        <>
          <ActionButtons setVideo={setVideo} startRecording={() => setIsRecording(true)} />
          <Alert
            variant="flat"
            color="warning"
            title="Video Requirements"
            className="mt-10 max-w-[800px] mx-auto"
            description={APP_CONFIG.RESUME_VIDEO_CONFIGS.ALERT}
          />
        </>
      )}

      {(videoStatus === VideoResumeStatus.pending ||
        videoStatus === VideoResumeStatus.rejected) && (
        <Alert
          className="my-5"
          color={CommonUtils.getStatusColor(videoStatus)}
          title={videoStatus === VideoResumeStatus.pending ? 'Pending' : 'Rejected Reason'}
          description={
            videoStatus === VideoResumeStatus.pending
              ? 'Video is not approved yet. It has been sent for admin approval.'
              : videoRejectionReason
          }
        />
      )}
    </div>
  );
};

export default VideoResumeSection;
