"use client";

import { Button } from "@heroui/react";
import VideoPlayer from "../components/lib/VideoPlayer";

type Props = {
  video: File;
  onRemove: () => void;
  onUpload: () => void;
};

const VideoPreviewSection = ({ video, onRemove, onUpload }: Props) => {
  return (
    <>
      <VideoPlayer url={URL.createObjectURL(video)} />
      <div className="w-full flex flex-col sm:flex-row justify-center items-center gap-3">
        <Button
          size="md"
          variant="bordered"
          color="danger"
          className="p-5 w-full sm:w-[150px]"
          onPress={onRemove}
        >
          Remove
        </Button>
        <Button
          size="md"
          color="primary"
          className="p-5 w-full sm:w-[150px]"
          onPress={onUpload}
        >
          Upload
        </Button>
      </div>
    </>
  );
};

export default VideoPreviewSection;
