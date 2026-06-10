'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import useChatStore from '@/app/store/useChatStore';
import useUserStore from '@/app/store/useUserStore';
import { Roles } from '@/app/types/enum';
import { addToast, Card, CardBody } from '@heroui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiMessageSquare } from 'react-icons/fi';
import ChatListSection from '@/app/components/chats/ChatListSection';
import withAuth from '@/app/hoc/withAuth';

type PendingJobSharePayload = {
  jobId: string;
  jobTitle: string;
  url: string;
  message: string;
};

const PENDING_JOB_SHARE_KEY = 'pendingJobShare';

const buildJobShareMessage = (url: string) => `Please check this job: ${url}`;

const page = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shareJobId = searchParams.get('shareJobId');
  const { user } = useUserStore();
  const [pendingShare, setPendingShare] = useState<PendingJobSharePayload | null>(null);
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set());
  const [isBulkSending, setIsBulkSending] = useState(false);

  const isEmployer = user?.role === Roles.employer || user?.role === Roles.super_employer;

  const clearShareMode = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(PENDING_JOB_SHARE_KEY);
    }

    setPendingShare(null);
    setSelectedThreadIds(new Set());
    router.replace(routePaths.chat.list);
  };

  useEffect(() => {
    if (!user) return;

    if (!shareJobId) {
      setPendingShare(null);
      setSelectedThreadIds(new Set());
      return;
    }

    if (!isEmployer) {
      clearShareMode();
      return;
    }

    try {
      const rawPayload =
        typeof window !== 'undefined'
          ? window.sessionStorage.getItem(PENDING_JOB_SHARE_KEY)
          : null;

      if (!rawPayload) return;

      const parsedPayload = JSON.parse(rawPayload) as PendingJobSharePayload;
      if (parsedPayload.jobId !== shareJobId || !parsedPayload.url) {
        clearShareMode();
        return;
      }

      setPendingShare({
        ...parsedPayload,
        message: parsedPayload.message || buildJobShareMessage(parsedPayload.url),
      });
    } catch (error) {
      console.log(error);
      clearShareMode();
    }
  }, [shareJobId, user, isEmployer]);

  const handleToggleThread = (threadId: string) => {
    setSelectedThreadIds((currentSelectedThreadIds) => {
      const nextSelectedThreadIds = new Set(currentSelectedThreadIds);

      if (nextSelectedThreadIds.has(threadId)) {
        nextSelectedThreadIds.delete(threadId);
      } else {
        nextSelectedThreadIds.add(threadId);
      }

      return nextSelectedThreadIds;
    });
  };

  const updateSentRooms = (messages: any[]) => {
    if (!messages.length) return;

    const currentRooms = useChatStore.getState().chatRooms;
    let nextRooms = [...currentRooms];

    for (const message of messages) {
      const existingRoom = nextRooms.find((room) => room.id === message.threadId);
      if (!existingRoom) continue;

      nextRooms = [
        {
          ...existingRoom,
          lastMessage: message,
          lastMessageAt: message.createdAt ?? existingRoom.lastMessageAt,
        },
        ...nextRooms.filter((room) => room.id !== message.threadId),
      ];
    }

    useChatStore.getState().setChatRooms(nextRooms);
  };

  const handleSendJobShare = async () => {
    if (!pendingShare || selectedThreadIds.size === 0 || isBulkSending) return;

    const threadIds = Array.from(selectedThreadIds);

    try {
      setIsBulkSending(true);

      const results = await Promise.allSettled(
        threadIds.map((threadId) =>
          http.post(ENDPOINTS.MESSAGES.CHATS.SEND(threadId), {
            body: pendingShare.message,
            attachments: [],
          }),
        ),
      );

      const sentMessages = results.flatMap((result) => {
        if (result.status !== 'fulfilled') return [];

        const message = result.value?.data ?? result.value;
        return message?.id ? [message] : [];
      });
      const failedCount = results.length - sentMessages.length;

      updateSentRooms(sentMessages);
      addToast({
        title: sentMessages.length ? 'Job sent' : 'Could not send job',
        color: failedCount ? (sentMessages.length ? 'warning' : 'danger') : 'success',
        description: failedCount
          ? `${sentMessages.length} sent, ${failedCount} failed.`
          : `Sent to ${sentMessages.length} candidate${sentMessages.length === 1 ? '' : 's'}.`,
      });

      clearShareMode();
    } catch (error) {
      console.log(error);
    } finally {
      setIsBulkSending(false);
    }
  };

  return (
    <>
      <title>Message</title>
      <div className="container py-10 lg:h-[calc(100vh-60px)] overflow-hidden">
        <Card className="flex-1 h-full shadow-sm border border-default-200 overflow-hidden">
          <CardBody className="p-0 flex flex-row h-full w-full">
            <ChatListSection
              shareMode={
                pendingShare
                  ? {
                      jobTitle: pendingShare.jobTitle,
                      selectedThreadIds,
                      isSending: isBulkSending,
                      onToggleThread: handleToggleThread,
                      onSend: handleSendJobShare,
                      onCancel: clearShareMode,
                    }
                  : null
              }
            />

            <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-8 text-center h-full bg-white">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <FiMessageSquare className="text-4xl text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-default-900 mb-2">
                {pendingShare ? 'Select Candidates' : 'Select a Conversation'}
              </h2>
              <p className="text-default-500 max-w-md">
                {pendingShare
                  ? 'Choose candidate conversations from the list to send this job.'
                  : 'Check your messages or start a new conversation with your network.'}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
};

export default withAuth(page);
