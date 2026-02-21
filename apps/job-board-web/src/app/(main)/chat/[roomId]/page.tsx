"use client";

import ChatFooter from "@/app/components/chats/ChatFooter";
import ChatHeader from "@/app/components/chats/ChatHeader";
import ChatListSection from "@/app/components/chats/ChatListSection";
import Message from "@/app/components/chats/Message";
import useChatStore from "@/app/store/useChatStore";
import {
  Card,
  CardBody,
  Drawer,
  DrawerBody,
  DrawerContent,
} from "@heroui/react";
import { useEffect, useRef, useState } from "react";

const page = () => {
  const { chats } = useChatStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  };

  useEffect(() => {
    scrollToBottom();
  }, []);

  return (
    <>
      <title>David Boose </title>
      <div className="container mx-auto flex flex-col lg:flex-row gap-6 py-4 lg:py-8 h-[calc(100vh-70px)] overflow-hidden">
        <Card className="flex-1 h-full shadow-sm border border-default-200 overflow-hidden">
          <CardBody className="p-0 flex flex-row h-full w-full">
            <div className="hidden lg:flex h-full flex-none">
              <ChatListSection />
            </div>
            <div className="flex flex-col h-full w-full">
              <ChatHeader onOpenDrawer={() => setIsDrawerOpen(true)} />
              <div className="flex-grow overflow-y-auto p-5 flex flex-col gap-4">
                {chats?.map((chat) => (
                  <Message
                    key={chat?.uid}
                    messageId={chat?.uid}
                    message={chat?.message}
                    time={chat?.createdAt}
                    senderId={chat?.senderId}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
              <ChatFooter scrollToBottom={scrollToBottom} />
            </div>
          </CardBody>
        </Card>
      </div>

      <Drawer
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        placement="left"
        size="xs"
      >
        <DrawerContent>
          {() => (
            <DrawerBody className="p-0 overflow-hidden">
              <ChatListSection />
            </DrawerBody>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default page;
