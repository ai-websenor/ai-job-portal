'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import ChatFooter from '@/app/components/chats/ChatFooter';
import ChatHeader from '@/app/components/chats/ChatHeader';
import ChatListSection from '@/app/components/chats/ChatListSection';
import Message from '@/app/components/chats/Message';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import useChatStore from '@/app/store/useChatStore';
import { Card, CardBody, Drawer, DrawerBody, DrawerContent } from '@heroui/react';
import { use, useEffect, useRef, useState } from 'react';

const page = ({ params }: { params: Promise<{ roomId: string }> }) => {
  const { roomId } = use(params);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { chats, setChats, setActiveChatRoom } = useChatStore();

  const getRoomDetails = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.MESSAGES.THREADS.DETAILS(roomId));
      if (response?.data) {
        setActiveChatRoom(response?.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const getChatsByRoomId = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.MESSAGES.CHATS.LIST(roomId), {
        params: {
          page: 1,
          limit: 50,
        },
      });
      if (response?.data) {
        setChats(response?.data?.messages);
        scrollToBottom();
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
  };

  useEffect(() => {
    getRoomDetails();
    getChatsByRoomId();
  }, []);

  return (
    <>
      <title>Message</title>
      <div className="container mx-auto flex flex-col lg:flex-row gap-6 py-4 lg:py-8 h-[calc(100vh-70px)] overflow-hidden">
        <Card className="flex-1 h-full shadow-sm border border-default-200 overflow-hidden">
          <CardBody className="p-0 flex flex-row h-full w-full">
            <div className="hidden lg:flex h-full flex-none">
              <ChatListSection />
            </div>
            {loading ? (
              <LoadingProgress />
            ) : (
              <div className="flex flex-col h-full w-full">
                <ChatHeader onOpenDrawer={() => setIsDrawerOpen(true)} />

                <div className="flex-grow flex-col overflow-y-auto p-5 flex gap-4">
                  {[...chats]?.reverse()?.map((chat) => (
                    <Message
                      key={chat?.id}
                      messageId={chat?.id}
                      message={chat?.body}
                      time={chat?.createdAt}
                      senderId={chat?.senderId}
                    />
                  ))}

                  <div ref={messagesEndRef} />
                </div>

                <ChatFooter scrollToBottom={scrollToBottom} />
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Drawer isOpen={isDrawerOpen} onOpenChange={setIsDrawerOpen} placement="left" size="xs">
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
