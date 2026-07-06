'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import useChatStore from '@/app/store/useChatStore';
import { IChatJobFilter, IChatRoom, IChatRoomParticipant } from '@/app/types/types';
import { formatJobLabel } from '@/app/utils/chatUtils';
import { Button, Chip, Input, ScrollShadow, Switch, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FiEdit, FiSearch, FiSliders, FiX, FiChevronUp, FiMessageSquare } from 'react-icons/fi';
import LoadingProgress from '../lib/LoadingProgress';
import useDebouncedValue from '@/app/hooks/useDebouncedValue';
import useUserStore from '@/app/store/useUserStore';
import socket from '@/app/socket';
import SOCKET_EVENTS from '@/app/socket/socket-events';
import ChatListCard from '../cards/ChatListCard';
import CommonUtils from '@/app/utils/commonUtils';
import { Roles } from '@/app/types/enum';
import { IoSend } from 'react-icons/io5';
import JobPreviewCard from './JobPreviewCard';
import { IJob } from '@/app/types/types';

dayjs.extend(relativeTime);

type ChatListShareMode = {
  jobTitle: string;
  jobPreview?: Pick<IJob, 'id' | 'title' | 'company'> | null;
  selectedThreadIds: Set<string>;
  isSending: boolean;
  onToggleThread: (threadId: string) => void;
  onSend: () => void;
  onCancel: () => void;
};

type ChatListSectionProps = {
  scrollToBottom?: () => void;
  shareMode?: ChatListShareMode | null;
};

const ChatListSection = ({ scrollToBottom, shareMode }: ChatListSectionProps) => {
  const { roomId } = useParams();
  const { user } = useUserStore();
  const [searched, setSearched] = useState('');
  const [loading, setLoading] = useState(false);
  const [jobFilters, setJobFilters] = useState<IChatJobFilter[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedJobLabel, setSelectedJobLabel] = useState('');
  const [jobFilterSearch, setJobFilterSearch] = useState('');
  const [isJobFilterOpen, setIsJobFilterOpen] = useState(false);
  const [isJobFiltersLoading, setIsJobFiltersLoading] = useState(false);
  const [ownJobsOnly, setOwnJobsOnly] = useState(false);
  const [searchMode, setSearchMode] = useState<'messages' | 'jobs'>('messages');
  const isEmployer = user?.role === Roles.employer || user?.role === Roles.super_employer;
  const isShareMode = Boolean(shareMode && isEmployer);
  const selectedShareCount = shareMode?.selectedThreadIds.size ?? 0;
  const requestIdRef = useRef(0);
  const debouncedJobFilterSearch = useDebouncedValue(jobFilterSearch, 300);

  const {
    chatRooms,
    addMessage,
    setChatRooms,
    formattedParticipant,
    updateRoomAndMoveToTop,
    setFormattedParticipant,
  } = useChatStore();

  const loadJobFilters = async (search?: string) => {
    if (!isEmployer) return;

    const requestId = ++requestIdRef.current;

    try {
      setIsJobFiltersLoading(true);

      const params = search?.trim() ? { search: search.trim() } : undefined;
      const response = await http.get(ENDPOINTS.MESSAGES.THREADS.JOB_FILTERS, { params });

      if (requestId !== requestIdRef.current) return;

      setJobFilters(response?.data ?? []);
    } catch (error) {
      console.log(error);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsJobFiltersLoading(false);
      }
    }
  };

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

  useEffect(() => {
    getChatList();
  }, [selectedJobId, ownJobsOnly, isEmployer]);

  useEffect(() => {
    if (!isEmployer) {
      setJobFilters([]);
      setSelectedJobId('');
      setSelectedJobLabel('');
      setJobFilterSearch('');
      setIsJobFilterOpen(false);
      return;
    }

    const search = debouncedJobFilterSearch.trim();

    if (search.length < 3) {
      setJobFilters([]);
      setIsJobFiltersLoading(false);
      return;
    }

    loadJobFilters(search);
  }, [debouncedJobFilterSearch, isEmployer]);

  useEffect(() => {
    if (!selectedJobId) {
      setSelectedJobLabel('');
      return;
    }

    const selected = jobFilters.find((job) => job.jobId === selectedJobId);
    if (selected) {
      setSelectedJobLabel(formatJobLabel(selected.jobTitle, selected.jobId));
    }
  }, [jobFilters, selectedJobId]);

  const handleNewMessage = (newChat: any) => {
    if (!newChat) return;

    // Socket payloads carry sender profiles but no isOwn — derive the side here.
    // Employer viewers: every non-candidate message is own-side (covers colleague
    // messages in company threads). Candidates: only their own messages.
    const isOwn =
      newChat.isOwn ??
      (isEmployer
        ? newChat.sender?.role !== 'candidate' || newChat.senderId === user?.userId
        : newChat.senderId === user?.userId);
    const incoming = { ...newChat, isOwn };

    if (roomId === newChat?.threadId) {
      addMessage(incoming);
      if (scrollToBottom) {
        setTimeout(() => scrollToBottom(), 100);
      }
    }

    updateRoomAndMoveToTop(incoming);
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
      const threadKindLower = chat?.applicationId ? 'application' : 'direct sourced sourcing';

      return (
        nameLower.includes(searchLower) ||
        companyLower.includes(searchLower) ||
        jobLower.includes(searchLower) ||
        threadKindLower.includes(searchLower)
      );
    });
  }, [searched, chatRooms, formattedParticipant]);

  const handleJobSelect = (jobId: string, jobLabel: string) => {
    setSelectedJobId(jobId);
    setSelectedJobLabel(jobLabel);
    setJobFilterSearch('');
    setIsJobFilterOpen(false);
  };

  const clearJobFilter = () => {
    setSelectedJobId('');
    setSelectedJobLabel('');
    setJobFilterSearch('');
    setJobFilters([]);
    setIsJobFilterOpen(false);
  };

  return (
    <div
      className={clsx(
        'flex flex-col h-full bg-white border-r border-default-200',
        'w-full lg:w-[350px]',
      )}
    >
      <div className="p-4 border-b border-default-200 flex flex-col gap-4 bg-white z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-default-900">
            <FiMessageSquare className="text-primary" size={20} />
            <h1 className="text-xl font-bold">Messages</h1>
          </div>
          {isEmployer && (
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button
                  variant="light"
                  size="sm"
                  className="text-default-500 font-medium"
                  endContent={<FiChevronUp className="rotate-180" />}
                >
                  {ownJobsOnly ? 'My Jobs' : 'All Jobs'}
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Filter jobs"
                onAction={(key) => setOwnJobsOnly(key === 'mine')}
              >
                <DropdownItem key="all" className={!ownJobsOnly ? 'text-primary' : ''}>
                  All Jobs
                </DropdownItem>
                <DropdownItem key="mine" className={ownJobsOnly ? 'text-primary' : ''}>
                  My Jobs
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
        <Input
          classNames={{
            base: 'max-w-full h-10',
            mainWrapper: 'h-full',
            input: 'text-small',
            inputWrapper: 'h-full font-normal text-default-500 bg-transparent border border-default-200',
          }}
          placeholder={searchMode === 'messages' ? 'Search candidate...' : 'Search job...'}
          size="sm"
          startContent={<FiSearch className="text-default-400" />}
          endContent={
            isEmployer ? (
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <button
                    type="button"
                    className="text-default-400 hover:text-default-600 transition-colors"
                    aria-label="Filter options"
                  >
                    <FiSliders size={16} />
                  </button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="Search mode options"
                  onAction={(key) => {
                    const newMode = key as 'messages' | 'jobs';
                    setSearchMode(newMode);
                    if (newMode === 'messages') {
                      setIsJobFilterOpen(false);
                    } else if (jobFilterSearch.trim().length >= 3) {
                      setIsJobFilterOpen(true);
                    }
                  }}
                >
                  <DropdownItem key="messages" className={searchMode === 'messages' ? 'text-primary' : ''}>
                    Search Candidates
                  </DropdownItem>
                  <DropdownItem key="jobs" className={searchMode === 'jobs' ? 'text-primary' : ''}>
                    Filter by Job
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            ) : null
          }
          type="search"
          radius="sm"
          value={searchMode === 'messages' ? searched : jobFilterSearch}
          onChange={(ev) => {
            if (searchMode === 'messages') {
              setSearched(ev.target.value);
            } else {
              const value = ev.target.value;
              setJobFilterSearch(value);
              setIsJobFilterOpen(value.trim().length >= 3);
            }
          }}
          onFocus={() => {
            if (searchMode === 'jobs' && jobFilterSearch.trim().length >= 3) {
              setIsJobFilterOpen(true);
            }
          }}
          onBlur={() => {
            if (searchMode === 'jobs') {
              window.setTimeout(() => setIsJobFilterOpen(false), 150);
            }
          }}
        />
        {isShareMode && shareMode && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
              Share job
            </p>
            {shareMode.jobPreview ? (
              <div className="mt-2">
                <JobPreviewCard job={shareMode.jobPreview} />
              </div>
            ) : (
              <p className="mt-1 truncate text-sm font-semibold text-default-900">
                {shareMode.jobTitle}
              </p>
            )}
            <p className="mt-1 text-xs text-default-500">
              {selectedShareCount} candidate{selectedShareCount === 1 ? '' : 's'} selected
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                variant="flat"
                className="flex-1"
                isDisabled={shareMode.isSending}
                onPress={shareMode.onCancel}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                color="primary"
                className="flex-1"
                startContent={<IoSend size={14} />}
                isLoading={shareMode.isSending}
                isDisabled={selectedShareCount === 0}
                onPress={shareMode.onSend}
              >
                Send
              </Button>
            </div>
          </div>
        )}
        {isEmployer && (
          <div className="flex flex-col gap-3">

            {isJobFilterOpen ? (
              <div className="rounded-2xl border border-default-200 bg-default-50/80 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-default-200">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-default-500">
                    {selectedJobId ? 'Selected filter' : 'All jobs'}
                  </p>
                  {selectedJobId && (
                    <Button
                      size="sm"
                      variant="light"
                      className="h-7 px-2 text-[11px]"
                      onPress={() => {
                        setSelectedJobId('');
                        setSelectedJobLabel('');
                        setJobFilterSearch('');
                      }}
                    >
                      All jobs
                    </Button>
                  )}
                </div>

                <ScrollShadow className="max-h-56">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => {
                        clearJobFilter();
                      }}
                      onMouseDown={(event) => event.preventDefault()}
                      className={clsx(
                        'flex items-center justify-between gap-3 px-3 py-3 text-left transition-colors border-b border-default-100 last:border-none',
                        !selectedJobId ? 'bg-primary/10' : 'hover:bg-default-100',
                      )}
                    >
                      <span className="text-sm font-medium text-default-900">All jobs</span>
                      {!selectedJobId && (
                        <Chip size="sm" variant="flat" className="text-[10px]">
                          Active
                        </Chip>
                      )}
                    </button>

                    {isJobFiltersLoading ? (
                      <div className="px-3 py-4 text-sm text-default-500">Loading jobs...</div>
                    ) : jobFilters.length > 0 ? (
                      jobFilters.map((job) => {
                        const jobLabel = formatJobLabel(job.jobTitle, job.jobId);
                        const isSelected = selectedJobId === job.jobId;

                        return (
                          <button
                            key={job.jobId}
                            type="button"
                            onClick={() => handleJobSelect(job.jobId, jobLabel)}
                            onMouseDown={(event) => event.preventDefault()}
                            className={clsx(
                              'flex items-start justify-between gap-3 px-3 py-3 text-left transition-colors border-b border-default-100 last:border-none',
                              isSelected ? 'bg-primary/10' : 'hover:bg-default-100',
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-default-900 truncate">
                                {jobLabel}
                              </p>
                              <p className="text-[11px] text-default-500 capitalize mt-0.5">
                                {CommonUtils.keyIntoTitle(job.jobStatus ?? '')}
                              </p>
                            </div>
                            {isSelected && (
                              <Chip
                                size="sm"
                                color="primary"
                                variant="flat"
                                className="text-[10px]"
                              >
                                Selected
                              </Chip>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-4 text-sm text-default-500">
                        No jobs found for this search.
                      </div>
                    )}
                  </div>
                </ScrollShadow>
              </div>
            ) : jobFilterSearch.trim().length > 0 ? (
              <p className="text-[11px] text-default-500">
                Type at least 3 characters to search jobs.
              </p>
            ) : null}


            {selectedJobLabel && (
              <p className="text-[11px] text-default-500">
                Showing threads for{' '}
                <span className="font-medium text-default-700">{selectedJobLabel}</span>
              </p>
            )}
            {selectedJobId && !isJobFilterOpen && (
              <Button
                size="sm"
                variant="light"
                className="w-fit h-8 px-2 text-[11px]"
                onPress={clearJobFilter}
              >
                Clear job filter
              </Button>
            )}
          </div>
        )}
      </div>

      <ScrollShadow className="flex-1 scrollbar-hide">
        {loading ? (
          <LoadingProgress />
        ) : (
          <div className="flex flex-col">
            {filteredChatRooms?.map((chat) => {
              const participant = formattedParticipant?.[chat?.id];
              const canSelectThread = Boolean(participant?.role === Roles.candidate);
              return (
                <ChatListCard
                  key={chat.id}
                  chat={chat}
                  participant={participant}
                  selectionMode={isShareMode}
                  isSelected={shareMode?.selectedThreadIds.has(chat.id) ?? false}
                  isSelectionDisabled={isShareMode && !canSelectThread}
                  onSelectionChange={() => shareMode?.onToggleThread(chat.id)}
                />
              );
            })}
          </div>
        )}
      </ScrollShadow>

      {/* Conversation counter footer */}
      {!loading && filteredChatRooms.length > 0 && (
        <div className="px-4 py-3 border-t border-default-200 bg-white">
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-default-500 hover:text-default-700 transition-colors w-full"
          >
            <span>
              Showing{' '}
              <span className="font-semibold text-default-700">{filteredChatRooms.length}</span>
              {' '}of{' '}
              <span className="font-semibold text-default-700">{chatRooms.length}</span>
              {' '}conversations
            </span>
            <FiChevronUp size={14} className="ml-auto" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatListSection;
