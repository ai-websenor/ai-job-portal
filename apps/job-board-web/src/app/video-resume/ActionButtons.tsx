"use client";

import { Button } from "@heroui/react";
import { useRef } from "react";
import { AiOutlineUpload } from "react-icons/ai";
import { IoVideocamOutline } from "react-icons/io5";

type Props = {
  setVideo: (video: File) => void;
  startRecording: () => void;
};

const ActionButtons = ({ setVideo, startRecording }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (file) {
      setVideo(file);
    }
  };

  return (
    <div className="w-full flex flex-col sm:flex-row justify-center items-center gap-5">
      <Button
        color="primary"
        size="lg"
        className="sm:w-fit w-full"
        startContent={<IoVideocamOutline size={24} />}
        onPress={startRecording}
      >
        Record Intro Video
      </Button>
      <Button
        color="primary"
        size="lg"
        className="sm:w-fit w-full"
        variant="bordered"
        onPress={() => fileInputRef.current?.click()}
        startContent={<AiOutlineUpload size={24} />}
      >
        Upload Video
      </Button>
      <input
        type="file"
        accept="video/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default ActionButtons;
