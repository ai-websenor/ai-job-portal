"use client";

import { Button, Input } from "@heroui/react";
import { HiOutlinePaperClip } from "react-icons/hi2";
import { HiOutlineEmojiHappy } from "react-icons/hi";
import { IoSend } from "react-icons/io5";

const ChatFooter = () => {
  return (
    <div className="p-4 border-t border-default-100">
      <Input
        autoFocus
        placeholder="Reply message"
        variant="bordered"
        radius="full"
        size="lg"
        classNames={{
          inputWrapper: [
            "bg-white",
            "shadow-none",
            "p-0",
            "border-1",
            "group-data-[focus=true]:border-default-400",
            "group-data-[focus=true]:ring-0",
            "group-data-[focus=true]:ring-offset-0",
          ].join(" "),
          input: "text-small",
        }}
        startContent={
          <Button isIconOnly variant="light" radius="full" size="sm">
            <HiOutlinePaperClip className="text-default-400 text-xl" />
          </Button>
        }
        endContent={
          <div className="flex items-center gap-1">
            <Button isIconOnly variant="light" radius="full" size="sm">
              <HiOutlineEmojiHappy className="text-default-400 text-xl" />
            </Button>
            <Button
              isIconOnly
              className="bg-primary text-white min-w-10 h-10"
              radius="full"
            >
              <IoSend className="text-lg" />
            </Button>
          </div>
        }
      />
    </div>
  );
};

export default ChatFooter;
