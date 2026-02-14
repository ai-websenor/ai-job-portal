"use client";

import { useRef, useState } from "react";
import { FaPlay } from "react-icons/fa";

const VideoPlayer = ({ url }: { url: string }) => {
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      setProgress((current / duration) * 100);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickPos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = clickPos * videoRef.current.duration;
    }
  };

  return (
    <div className="relative w-full group cursor-pointer overflow-hidden rounded-2xl shadow-sm">
      <video
        ref={videoRef}
        src={url}
        muted={false}
        className="w-full h-full object-contain block bg-black"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />

      {!isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity"
          onClick={togglePlay}
        >
          <div className="w-16 h-16 flex items-center justify-center bg-white rounded-full shadow-xl">
            <FaPlay className="text-primary ml-1" size={20} />
          </div>
        </div>
      )}

      {isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={togglePlay}
        />
      )}

      <div
        className="absolute bottom-0 left-0 w-full h-1.5 bg-white/20 cursor-pointer group-hover:h-2 transition-all"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-[#7857FF] transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default VideoPlayer;
