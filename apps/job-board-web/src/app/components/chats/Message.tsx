"use client";

import useChatStore from "@/app/store/useChatStore";
import useUserStore from "@/app/store/useUserStore";
import {
  addToast,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/react";
import clsx from "clsx";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { BsThreeDotsVertical } from "react-icons/bs";
import { MdContentCopy, MdDeleteOutline } from "react-icons/md";
import ReactMarkdown from "react-markdown";

dayjs.extend(relativeTime);

type Props = {
  message: string;
  time: string;
  senderId: string;
  messageId: string;
};

const Message = ({ message, time, senderId, messageId }: Props) => {
  const { user } = useUserStore();
  const isMe = senderId === user?.userId;
  const { chats, setChats } = useChatStore();

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    addToast({
      description: "Copied to clipboard",
      color: "secondary",
    });
  };

  const handleDelete = () => {
    const filtered = chats.filter((chat) => chat.uid !== messageId);
    setChats(filtered);
  };

  return (
    <div
      className={clsx(
        "flex w-full mb-2 group",
        isMe ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={clsx("flex gap-1", isMe ? "flex-row-reverse" : "flex-row")}
      >
        <div
          className={clsx(
            "p-3 rounded-xl w-fit max-w-md text-sm flex flex-col text-gray-700",
            isMe
              ? "bg-secondary rounded-br-none"
              : "bg-[#f5f5f5] rounded-bl-none",
          )}
        >
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="m-0">{children}</p>,
            }}
          >
            {message}
          </ReactMarkdown>
          <span className={clsx("text-[10px] mt-1 self-end text-gray-500")}>
            {dayjs(time).fromNow()}
          </span>
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                className="text-gray-400 min-w-8 h-8"
              >
                <BsThreeDotsVertical size={16} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Message action">
              <DropdownItem
                key="copy"
                startContent={<MdContentCopy size={18} />}
                onPress={handleCopy}
              >
                Copy
              </DropdownItem>
              {isMe ? (
                <DropdownItem
                  key="delete"
                  className="text-danger"
                  color="danger"
                  startContent={<MdDeleteOutline size={18} />}
                  onPress={handleDelete}
                >
                  Delete
                </DropdownItem>
              ) : null}
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>
    </div>
  );
};

export default Message;
