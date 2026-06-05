'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import useChatStore from '@/app/store/useChatStore';
import { IChatJobFilter, IChatRoom, IChatRoomParticipant } from '@/app/types/types';
import { formatJobLabel } from '@/app/utils/chatUtils';
import { Input, ScrollShadow, Select, SelectItem, Switch } from '@heroui/react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import LoadingProgress from '../lib/LoadingProgress';
import useUserStore from '@/app/store/useUserStore';
import socket from '@/app/socket';
import SOCKET_EVENTS from '@/app/socket/socket-events';
import ChatListCard from '../cards/ChatListCard';
import CommonUtils from '@/app/utils/commonUtils';
import { Roles } from '@/app/types/enum';

dayjs.extend(relativeTime);

const ChatListSection = ({ scrollToBottom }: { scrollToBottom?: () => void }) => {
  const { roomId } = useParams();
  const { user } = useUserStore();
  const [searched, setSearched] = useState('');
  const [loading, setLoading] = useState(false);
  const [jobFilters, setJobFilters] = useState<IChatJobFilter[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [ownJobsOnly, setOwnJobsOnly] = useState(false);
  const isEmployer = user?.role === Roles.employer || user?.role === Roles.super_employer;
  const jobFilterOptions = useMemo(
    () => [
      { jobId: 'all', label: 'All jobs' },
      ...jobFilters.map((job) => ({
        jobId: job.jobId,
        label: formatJobLabel(job.jobTitle, job.jobId),
      })),
    ],
    [jobFilters],
  );

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
      const params: Record<string, string | number | boolean> = { page: 1, limit: 30 };

      if (selectedJobId) params.jobId = selectedJobId;
      if (isEmployer && ownJobsOnly) params.ownJobsOnly = true;

      const { data } = await http.get(ENDPOINTS.MESSAGES.THREADS.LIST, {
        params,
      });

      setChatRooms(data ?? []);
      const formatted: Record<string, IChatRoomParticipant> = {};

      for (const room of data ?? []) {
        const participant =
          room?.participants?.find((p: IChatRoomParticipant) =>
            isEmployer ? p?.role === Roles.candidate : p?.role === Roles.employer,
          ) ?? room?.participants?.find((p: IChatRoomParticipant) => p?.id !== user?.userId);

        if (participant) {
          formatted[room?.id] = participant;
        }
      }

      setFormattedParticipant(formatted);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const getJobFilters = async () => {
    if (!isEmployer) return;

    try {
      const { data } = await http.get(ENDPOINTS.MESSAGES.THREADS.JOB_FILTERS);
      setJobFilters(data ?? []);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getChatList();
  }, [selectedJobId, ownJobsOnly, isEmployer]);

  useEffect(() => {
    getJobFilters();
  }, [isEmployer]);

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

  const filteredChatRooms = useMemo(() => {
    if (!searched?.trim()) return chatRooms;

    const searchLower = searched?.toLowerCase();

    return chatRooms?.filter((chat: IChatRoom) => {
      const participant = formattedParticipant?.[chat?.id];

      if (!participant) return false;

      const nameLower = CommonUtils.getFullName(participant).toLowerCase();
      const companyLower = participant?.companyName?.toLowerCase() ?? '';
      const jobLower = formatJobLabel(chat?.jobTitle, chat?.jobId).toLowerCase();

      return (
        nameLower.includes(searchLower) ||
        companyLower.includes(searchLower) ||
        jobLower.includes(searchLower)
      );
    });
  }, [searched, chatRooms, formattedParticipant]);

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
          value={searched}
          onChange={(ev) => setSearched(ev.target.value)}
        />
        {isEmployer && (
          <div className="flex flex-col gap-3">
            <Select
              size="sm"
              label="Filter by job"
              selectedKeys={new Set([selectedJobId || 'all'])}
              onSelectionChange={(keys) => {
                const [key] = Array.from(keys);
                setSelectedJobId(key && key !== 'all' ? String(key) : '');
              }}
            >
              {jobFilterOptions.map((job) => (
                <SelectItem key={job.jobId}>{job.label}</SelectItem>
              ))}
            </Select>
            <Switch size="sm" isSelected={ownJobsOnly} onValueChange={setOwnJobsOnly}>
              My jobs only
            </Switch>
          </div>
        )}
      </div>

      <ScrollShadow className="flex-1">
        {loading ? (
          <LoadingProgress />
        ) : (
          <div className="flex flex-col">
            {filteredChatRooms?.map((chat) => {
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
