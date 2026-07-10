'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import JobPreviewCard from '@/app/components/chats/JobPreviewCard';
import useUserStore from '@/app/store/useUserStore';
import { IChatAttachment, IJob } from '@/app/types/types';
// import {
//   addToast,
//   Button,
//   Dropdown,
//   DropdownItem,
//   DropdownMenu,
//   DropdownTrigger,
// } from '@heroui/react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
// import { BsThreeDotsVertical } from 'react-icons/bs';
// import { MdContentCopy } from 'react-icons/md';
import ReactMarkdown from 'react-markdown';
import ChatAttachmentPreview from './ChatAttachmentPreview';
import remarkGfm from 'remark-gfm';
import { useEffect, useState } from 'react';
import { IoCheckmarkDone } from 'react-icons/io5';
import CommonUtils from '@/app/utils/commonUtils';

dayjs.extend(relativeTime);

type Props = {
  message: string;
  time: string;
  senderId: string;
  messageId: string;
  isOwn?: boolean;
  attachment?: IChatAttachment;
  isRead?: boolean;
};

const extractJobIdFromMessage = (value: string) => {
  const match = value.match(/\/jobs\/([a-f0-9-]{36})(?:[/?#\s]|$)/i);
  return match?.[1] ?? null;
};

const stripJobUrlFromMessage = (value: string) => {
  const withoutUrl = value.replace(/https?:\/\/[^\s)]+\/jobs\/[^\s)]+/gi, '').trim();
  return withoutUrl.replace(/\s{2,}/g, ' ').replace(/[:\-–—]\s*$/, '').trim();
};

const Message = ({ message, time, senderId, isOwn, attachment, isRead }: Props) => {
  const { user } = useUserStore();
  const [jobPreview, setJobPreview] = useState<Pick<IJob, 'id' | 'title' | 'company'> | null>(null);
  const jobId = extractJobIdFromMessage(message || '');
  const cleanMessage = stripJobUrlFromMessage(message || '');
  // isOwn is side-based (backend marks colleague messages in company threads as
  // own-side for employer viewers); senderId comparison is the fallback only
  const isMe = isOwn ?? senderId === user?.userId;

  useEffect(() => {
    let isActive = true;

    if (!jobId) {
      setJobPreview(null);
      return;
    }

    const loadJobPreview = async () => {
      try {
        const response = await http.get(ENDPOINTS.JOBS.DETAILS(jobId));
        if (!isActive) return;

        const job = response?.data;
        if (job?.id && job?.title) {
          setJobPreview({
            id: job.id,
            title: job.title,
            company: job.company,
          });
        } else {
          setJobPreview(null);
        }
      } catch (error) {
        console.log(error);
        if (isActive) {
          setJobPreview(null);
        }
      }
    };

    loadJobPreview();

    return () => {
      isActive = false;
    };
  }, [jobId]);

  // const handleCopy = () => {
  //   if (!message && !attachment?.url) return;

  //   let copyText = message ?? '';

  //   if (attachment?.url) {
  //     copyText += `\n${attachment.url}`;
  //   }

  //   navigator.clipboard.writeText(copyText);

  //   addToast({
  //     description: 'Copied to clipboard',
  //     color: 'secondary',
  //   });
  // };

  return (
    <div className={clsx('flex w-full mb-1 group', isMe ? 'justify-end' : 'justify-start')}>
      <div className={clsx('flex gap-1', isMe ? 'flex-row-reverse' : 'flex-row')}>
        <div
          className={clsx(
            'py-1.5 px-3 rounded-xl w-fit max-w-md text-sm shadow-sm flex items-end gap-2',
            isMe
              ? 'bg-primary text-white rounded-br-sm'
              : 'bg-[#f0f0f5] text-gray-800 rounded-bl-sm',
          )}
        >
          <div className="flex flex-col min-w-0 pb-[1px]">
            {cleanMessage && (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="m-0 leading-relaxed">{children}</p>,
                  a: ({ node: _node, ...props }) => (
                    <a
                      {...props}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={clsx(
                        'underline break-words',
                        isMe ? 'text-white/90 hover:text-white' : 'text-blue-600 hover:text-blue-800',
                      )}
                    />
                  ),
                }}
              >
                {cleanMessage}
              </ReactMarkdown>
            )}

            {!cleanMessage && jobPreview && (
              <p className={clsx('m-0 text-sm font-medium', isMe ? 'text-white' : 'text-gray-700')}>
                Please check this job and apply if it matches your profile.
              </p>
            )}

            {attachment && <ChatAttachmentPreview isMe={isMe} attachment={attachment} />}

            {jobPreview && (
              <div className="mt-2 max-w-[320px]">
                <JobPreviewCard job={jobPreview} isMe={isMe} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span
              className={clsx(
                'text-[10px]',
                isMe ? 'text-white/70' : 'text-gray-400',
              )}
            >
              {CommonUtils.formatMessageTime(time)}
            </span>
            {isMe && (
              <IoCheckmarkDone
                size={14}
                className={isRead ? "text-[#38bdf8]" : "text-white/70"}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Message;
