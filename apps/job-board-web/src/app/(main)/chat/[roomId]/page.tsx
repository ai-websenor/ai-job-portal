'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import ChatFooter from '@/app/components/chats/ChatFooter';
import ChatHeader from '@/app/components/chats/ChatHeader';
import ChatListSection from '@/app/components/chats/ChatListSection';
import Message from '@/app/components/chats/Message';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import routePaths from '@/app/config/routePaths';
import socket from '@/app/socket';
import SOCKET_EVENTS from '@/app/socket/socket-events';
import useChatStore from '@/app/store/useChatStore';
import { Button, Card, CardBody, Drawer, DrawerBody, DrawerContent } from '@heroui/react';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { use, useEffect, useRef, useState } from 'react';
import { FiLock } from 'react-icons/fi';

const isAccessError = (error: unknown) => {
  const statusCode = (error as { statusCode?: number })?.statusCode;
  return statusCode === 403 || statusCode === 404;
};

const page = ({ params }: { params: Promise<{ roomId: string }> }) => {
  const { roomId } = use(params);
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFetchingOlder, setIsFetchingOlder] = useState(false);
  const { chats, setChats, setActiveChatRoom, prependMessages, setFormattedParticipant } =
    useChatStore();

  const handleAccessLost = () => {
    setAccessDenied(true);
    // Drop the now-inaccessible thread from the cached list
    const currentRooms = useChatStore.getState().chatRooms;
    useChatStore.getState().setChatRooms(currentRooms.filter((room) => room.id !== roomId));
  };

  const getRoomDetails = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.MESSAGES.THREADS.DETAILS(roomId));
      if (response?.data) {
        setActiveChatRoom(response?.data);
      }
    } catch (error) {
      if (isAccessError(error)) {
        handleAccessLost();
      }
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const getChatsByRoomId = async (pageNum: number = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setIsFetchingOlder(true);

      const response: any = await http.get(ENDPOINTS.MESSAGES.CHATS.LIST(roomId), {
        params: {
          limit: 50,
          page: pageNum,
        },
      });

      if (response?.data) {
        const pagination = response.pagination;
        const newMessages = response.data.messages;
        const opponent = response.data.participants?.opponent;
        const existingRoom = useChatStore
          .getState()
          .chatRooms.find((chatRoom) => chatRoom.id === roomId);
        const existingActiveRoom = useChatStore.getState().activeChatRoom;

        setActiveChatRoom({
          ...(existingActiveRoom?.id === roomId ? existingActiveRoom : {}),
          ...(existingRoom ?? {}),
          id: roomId,
          jobId: response.data.jobId,
          jobTitle: response.data.jobTitle,
          jobStatus: response.data.jobStatus,
          isOwnJob: response.data.isOwnJob,
          applicationId:
            response.data.applicationId !== undefined
              ? response.data.applicationId
              : (existingActiveRoom?.applicationId ?? existingRoom?.applicationId),
        });

        if (opponent) {
          setFormattedParticipant({
            ...useChatStore.getState().formattedParticipant,
            [roomId]: opponent,
          });
        }

        if (pageNum === 1) {
          setChats(newMessages);
          setTimeout(() => scrollToBottom(), 100);
        } else {
          const scrollContainer = containerRef.current;
          const previousScrollHeight = scrollContainer?.scrollHeight || 0;

          prependMessages(newMessages);

          requestAnimationFrame(() => {
            if (scrollContainer) {
              scrollContainer.scrollTop = scrollContainer.scrollHeight - previousScrollHeight;
            }
          });
        }

        setHasMore(pagination.hasNextPage);
      }
    } catch (error) {
      if (isAccessError(error)) {
        handleAccessLost();
      }
      console.log(error);
    } finally {
      setLoading(false);
      setIsFetchingOlder(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    setAccessDenied(false);
    getRoomDetails();
    getChatsByRoomId();
  }, [roomId]);

  // Join the thread's socket room so new_message events for this conversation
  // arrive in real time (covers company-level viewers too, who are never the
  // recipient). Rejoin on reconnect — server-side room membership is lost.
  useEffect(() => {
    const join = () => socket.emit(SOCKET_EVENTS.EMIT.JOIN_THREAD, { threadId: roomId });
    join();
    socket.on('connect', join);

    return () => {
      socket.off('connect', join);
      socket.emit(SOCKET_EVENTS.EMIT.LEAVE_THREAD, { threadId: roomId });
      // Unread suppression is keyed on activeChatRoom — clear it so messages
      // arriving after the user leaves this room count as unread again
      useChatStore.getState().setActiveChatRoom(null);
    };
  }, [roomId]);

  const handleScrollUp = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop === 0 && !isFetchingOlder && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      getChatsByRoomId(nextPage);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await http.post(ENDPOINTS.MESSAGES.THREADS.MARK_READ(id), {});
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const currentRoomId = roomId;

    return () => {
      if (currentRoomId) {
        markAsRead(currentRoomId);
      }
    };
  }, [roomId]);

  return (
    <>
      <title>Messages</title>

      <div className="container mx-auto flex flex-col lg:flex-row gap-6 py-4 lg:py-8 h-[calc(100vh-60px)] overflow-hidden">
        <Card className="flex-1 h-full shadow-sm border border-default-200 overflow-hidden">
          <CardBody className="p-0 flex flex-row h-full w-full">
            <div className="hidden lg:flex h-full flex-none">
              <ChatListSection scrollToBottom={scrollToBottom} />
            </div>

            {loading ? (
              <LoadingProgress />
            ) : accessDenied ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center bg-white">
                <div className="w-20 h-20 bg-warning/10 rounded-full flex items-center justify-center">
                  <FiLock className="text-3xl text-warning" />
                </div>
                <h2 className="text-xl font-bold text-default-900">
                  This conversation is no longer available
                </h2>
                <p className="text-default-500 max-w-md text-sm">
                  You no longer have access to this conversation. Your permissions may have changed,
                  or the conversation may have been removed. Please contact your administrator if
                  you think this is a mistake.
                </p>
                <Button
                  color="primary"
                  radius="lg"
                  size="sm"
                  onPress={() => router.push(routePaths.chat.list)}
                >
                  Back to Messages
                </Button>
              </div>
            ) : (
              <div className="flex flex-col h-full w-full">
                <ChatHeader onOpenDrawer={() => setIsDrawerOpen(true)} />

                <div
                  ref={containerRef}
                  onScroll={handleScrollUp}
                  className="flex-grow flex-col overflow-y-auto p-5 flex gap-4 relative"
                >
                  {isFetchingOlder && (
                    <div className="text-center text-xs text-default-400">Loading...</div>
                  )}

                  {[...chats].reverse().map((chat, index, reversedArray) => {
                    const isFirstMessageOfDay =
                      index === 0 ||
                      dayjs(reversedArray[index - 1].createdAt).format('DD-MM-YYYY') !==
                        dayjs(chat.createdAt).format('DD-MM-YYYY');

                    return (
                      <div key={chat.id || index} className="flex flex-col gap-4">
                        {isFirstMessageOfDay && (
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
                          isOwn={chat?.isOwn}
                          attachment={chat?.attachments?.[0]}
                        />
                      </div>
                    );
                  })}
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
