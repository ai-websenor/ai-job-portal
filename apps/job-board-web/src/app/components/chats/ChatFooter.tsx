"use client";

import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@heroui/react";
import {
  HiOutlineDocumentText,
  HiOutlinePaperClip,
  HiOutlinePhoto,
  HiOutlineVideoCamera,
} from "react-icons/hi2";
import { HiOutlineEmojiHappy } from "react-icons/hi";
import { IoSend } from "react-icons/io5";
import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import useChatStore from "@/app/store/useChatStore";
import useUserStore from "@/app/store/useUserStore";
import dynamic from "next/dynamic";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
});

const ChatFooter = ({ scrollToBottom }: { scrollToBottom: () => void }) => {
  const { roomId } = useParams();
  const { user } = useUserStore();
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { chats, setChats, chatRooms, setChatRooms } = useChatStore();

  const handleEmojiClick = (emojiData: { emoji: string }) => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;

    const newMessage =
      message.substring(0, start) + emojiData.emoji + message.substring(end);

    setMessage(newMessage);

    setTimeout(() => {
      input.focus();
      const newPos = start + emojiData.emoji.length;
      input.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleSendChat = () => {
    if (!message.trim()) return;

    const newChat = {
      roomId,
      message,
      senderId: user?.userId ?? "",
      createdAt: new Date().toISOString(),
      uid: String(Math.random() * 1000000),
    };

    setChats([...chats, newChat]);
    setMessage("");

    const otherRooms = chatRooms.filter((room) => room?.uid !== roomId);
    const activeRoom = chatRooms.find((room) => room?.uid === roomId);

    if (activeRoom) {
      const updatedActiveRoom = {
        ...activeRoom,
        lastMessage: {
          message,
          createdAt: new Date().toISOString(),
        },
      };

      setChatRooms([updatedActiveRoom, ...otherRooms]);
    }

    setTimeout(() => {
      scrollToBottom();
    }, 10);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSendChat();
  };

  return (
    <form className="p-4 border-t border-default-100" onSubmit={handleSubmit}>
      <Input
        autoFocus
        ref={inputRef}
        placeholder="Reply message"
        variant="bordered"
        radius="full"
        size="lg"
        autoComplete="off"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
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
          <Dropdown placement="top-start">
            <DropdownTrigger>
              <Button isIconOnly variant="light" radius="full" size="sm">
                <HiOutlinePaperClip className="text-default-400 text-xl" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Attachment options">
              {attachmentItems.map((item) => (
                <DropdownItem
                  key={item.key}
                  startContent={<item.icon className={item.iconClassName} />}
                >
                  {item.label}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        }
        endContent={
          <div className="flex items-center gap-1">
            <Popover placement="top-end" showArrow offset={10}>
              <PopoverTrigger>
                <Button isIconOnly variant="light" radius="full" size="sm">
                  <HiOutlineEmojiHappy className="text-default-400 text-xl" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 border-none">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  autoFocusSearch={false}
                  height={400}
                  width={300}
                />
              </PopoverContent>
            </Popover>
            <Button
              isIconOnly
              type="submit"
              className="bg-primary text-white min-w-10 h-10"
              radius="full"
              onPress={handleSendChat}
            >
              <IoSend className="text-lg" />
            </Button>
          </div>
        }
      />
    </form>
  );
};

export default ChatFooter;

const attachmentItems = [
  {
    key: "photos",
    label: "Photos",
    icon: HiOutlinePhoto,
    iconClassName: "text-xl text-primary",
  },
  {
    key: "videos",
    label: "Videos",
    icon: HiOutlineVideoCamera,
    iconClassName: "text-xl",
  },
  {
    key: "documents",
    label: "Documents",
    icon: HiOutlineDocumentText,
    iconClassName: "text-xl text-success",
  },
];
