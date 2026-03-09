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
        setTimeout(() => scrollToBottom(), 100);
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
              <ChatListSection scrollToBottom={scrollToBottom} />
            </div>

            {loading ? (
              <LoadingProgress />
            ) : (
              <div className="flex flex-col h-full w-full">
                <ChatHeader onOpenDrawer={() => setIsDrawerOpen(true)} />

                <div className="flex-grow flex-col overflow-y-auto p-5 flex gap-4">
                  {(() => {
                    let lastDate = '';

                    return [...chats]?.reverse()?.map((chat, index) => {
                      const currentDate = new Date(chat.createdAt).toDateString();
                      const showDivider = currentDate !== lastDate;
                      lastDate = currentDate;

                      return (
                        <div key={chat.id || index} className="flex flex-col gap-4">
                          {showDivider && (
                            <div className="flex items-center my-1">
                              <div className="flex-grow border-t border-default-200"></div>
                              <span className="px-2 text-xs text-default-400 tracking-wider">
                                {formatDateLabel(chat.createdAt)}
                              </span>
                              <div className="flex-grow border-t border-default-200"></div>
                            </div>
                          )}

                          <Message
                            messageId={chat?.id}
                            message={chat?.body}
                            time={chat?.createdAt}
                            senderId={chat?.senderId}
                          />
                        </div>
                      );
                    });
                  })()}

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

const formatDateLabel = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};
