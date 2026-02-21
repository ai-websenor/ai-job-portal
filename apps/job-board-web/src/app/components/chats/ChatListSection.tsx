"use client";

import { chatList, chats } from "@/app/config/data";
import routePaths from "@/app/config/routePaths";
import useChatStore from "@/app/store/useChatStore";
import { Avatar, Input, ScrollShadow } from "@heroui/react";
import clsx from "clsx";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { FiSearch } from "react-icons/fi";
import ReactMarkdown from "react-markdown";

dayjs.extend(relativeTime);

const ChatListSection = () => {
  const router = useRouter();
  const { roomId } = useParams();
  const { chatRooms, setChatRooms, setChats } = useChatStore();

  useEffect(() => {
    setChats(chats);
    setChatRooms(chatList);
  }, []);

  return (
    <div
      className={clsx(
        "flex flex-col h-full bg-content1/50 border-r border-default-200",
        "w-full lg:w-[350px]",
      )}
    >
      <div className="p-4 border-b border-default-200 flex flex-col gap-4 bg-background z-10">
        <h1 className="text-xl font-bold text-default-900">Messages</h1>
        <Input
          classNames={{
            base: "max-w-full h-10",
            mainWrapper: "h-full",
            input: "text-small",
            inputWrapper: "h-full font-normal text-default-500 bg-default-100",
          }}
          placeholder="Search messages..."
          size="sm"
          startContent={<FiSearch className="text-default-400" />}
          type="search"
          radius="lg"
        />
      </div>

      <ScrollShadow className="flex-1">
        <div className="flex flex-col">
          {chatRooms?.map((chat) => (
            <button
              key={chat?.uid}
              onClick={() =>
                router.push(routePaths.chat?.chatDetail(chat?.uid))
              }
              className={clsx(
                "w-full flex items-center gap-3 p-4 transition-all duration-200 hover:bg-default-100 text-left border-b border-default-100 last:border-none",
                roomId === chat?.uid
                  ? "bg-primary/10 border-l-4 border-l-primary"
                  : "border-l-4 border-l-transparent",
              )}
            >
              <Avatar
                src={chat?.profilePhoto || undefined}
                name={chat?.name}
                size="md"
                isBordered
                className="flex-shrink-0"
                showFallback
                color={roomId === chat?.uid ? "primary" : "default"}
              />
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span
                    className={clsx(
                      "font-semibold truncate text-sm",
                      roomId === chat?.uid
                        ? "text-primary"
                        : "text-default-900",
                    )}
                  >
                    {chat?.name}
                  </span>
                  <span className="text-xs text-default-400 whitespace-nowrap">
                    {dayjs(chat?.lastMessage?.createdAt).fromNow()}
                  </span>
                </div>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p className="m-0 text-xs text-default-500 truncate font-medium">
                        {children}
                      </p>
                    ),
                  }}
                >
                  {chat?.lastMessage?.message}
                </ReactMarkdown>
              </div>
            </button>
          ))}
        </div>
      </ScrollShadow>
    </div>
  );
};

export default ChatListSection;
