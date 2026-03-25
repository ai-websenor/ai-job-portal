'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import useChatStore from '@/app/store/useChatStore';
import { Input, ScrollShadow } from '@heroui/react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import LoadingProgress from '../lib/LoadingProgress';
import useUserStore from '@/app/store/useUserStore';
import socket from '@/app/socket';
import SOCKET_EVENTS from '@/app/socket/socket-events';
import ChatListCard from '../cards/ChatListCard';

dayjs.extend(relativeTime);

const ChatListSection = ({ scrollToBottom }: { scrollToBottom?: () => void }) => {
  const { roomId } = useParams();
  const { user } = useUserStore();
  const [loading, setLoading] = useState(false);

  const {
    chatRooms,
    addMessage,
    setChatRooms,
    formattedParticipant,
    updateRoomAndMoveToTop,
    setFormattedParticipant,
  } = useChatStore();

  const getChatList = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.MESSAGES.THREADS.LIST, {
        params: {
          page: 1,
          limit: 30,
        },
      });
      if (response?.data) {
        setChatRooms(response.data);
        if (response?.data?.length) {
          const formatted: any = {};
          for (const room of response?.data) {
            const participant = room?.participants?.find((p: any) => p?.id !== user?.userId);
            formatted[room?.id] = participant;
          }
          setFormattedParticipant(formatted);
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getChatList();
  }, []);

  const handleNewMessage = (newChat: any) => {
    if (!newChat) return;

    if (roomId === newChat?.threadId) {
      addMessage(newChat);
      if (scrollToBottom) {
        setTimeout(() => scrollToBottom(), 100);
      }
    }

    updateRoomAndMoveToTop(newChat);
  };

  useEffect(() => {
    socket.on(SOCKET_EVENTS.LISTNERS.NEW_MESSAGE, handleNewMessage);

    return () => {
      socket.off(SOCKET_EVENTS.LISTNERS.NEW_MESSAGE, handleNewMessage);
    };
  }, []);

  return (
    <div
      className={clsx(
        'flex flex-col h-full bg-content1/50 border-r border-default-200',
        'w-full lg:w-[350px]',
      )}
    >
      <div className="p-4 border-b border-default-200 flex flex-col gap-4 bg-background z-10">
        <h1 className="text-xl font-bold text-default-900">Messages</h1>
        <Input
          classNames={{
            base: 'max-w-full h-10',
            mainWrapper: 'h-full',
            input: 'text-small',
            inputWrapper: 'h-full font-normal text-default-500 bg-default-100',
          }}
          placeholder="Search messages..."
          size="sm"
          startContent={<FiSearch className="text-default-400" />}
          type="search"
          radius="lg"
        />
      </div>

      <ScrollShadow className="flex-1">
        {loading ? (
          <LoadingProgress />
        ) : (
          <div className="flex flex-col">
            {chatRooms?.map((chat) => {
              const participant = formattedParticipant?.[chat?.id];
              return <ChatListCard key={chat.id} chat={chat} participant={participant} />;
            })}
          </div>
        )}
      </ScrollShadow>
    </div>
  );
};

export default ChatListSection;
