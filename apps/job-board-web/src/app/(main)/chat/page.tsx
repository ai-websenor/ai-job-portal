"use client";

import { Card, CardBody } from "@heroui/react";
import { FiMessageSquare } from "react-icons/fi";
import ChatListSection from "@/app/components/chats/ChatListSection";
import withAuth from "@/app/hoc/withAuth";

const page = () => {
  return (
    <>
      <title>Chat</title>
      <div className="container py-10 lg:h-[calc(100vh-80px)] overflow-hidden">
        <Card className="flex-1 h-full shadow-sm border border-default-200 overflow-hidden">
          <CardBody className="p-0 flex flex-row h-full w-full">
            <ChatListSection />

            <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-8 text-center h-full bg-white">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <FiMessageSquare className="text-4xl text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-default-900 mb-2">
                Select a Conversation
              </h2>
              <p className="text-default-500 max-w-md">
                Check your messages or start a new conversation with your
                network.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
};

export default withAuth(page);
