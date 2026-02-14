"use client";

import { chatList } from "@/app/config/data";
import { Avatar, Button } from "@heroui/react";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { FiMenu } from "react-icons/fi";

interface ChatHeaderProps {
  onOpenDrawer?: () => void;
}

const ChatHeader = ({ onOpenDrawer }: ChatHeaderProps) => {
  const { roomId } = useParams();

  const room = useMemo(() => {
    return chatList.find((r) => r?.uid === roomId);
  }, [roomId]);

  return (
    <div className="min-h-20 border-b w-full flex items-center px-4 lg:px-5 gap-3">
      <Button
        isIconOnly
        variant="light"
        className="lg:hidden text-default-500"
        onPress={onOpenDrawer}
      >
        <FiMenu size={24} />
      </Button>
      <Avatar
        src={room?.profilePhoto ?? ""}
        name={room?.name}
        size="md"
        isBordered
        className="flex-shrink-0"
        showFallback
      />
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold">{room?.name}</p>
        <p className="text-xs text-default-500">Recruiter at Nomad</p>
      </div>
    </div>
  );
};

export default ChatHeader;
