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

dayjs.extend(relativeTime);

type Props = {
  message: string;
  time: string;
  senderId: string;
  messageId: string;
  isOwn?: boolean;
  attachment?: IChatAttachment;
};

const extractJobIdFromMessage = (value: string) => {
  const match = value.match(/\/jobs\/([a-f0-9-]{36})(?:[/?#\s]|$)/i);
  return match?.[1] ?? null;
};

const stripJobUrlFromMessage = (value: string) => {
  const withoutUrl = value.replace(/https?:\/\/[^\s)]+\/jobs\/[^\s)]+/gi, '').trim();
  return withoutUrl.replace(/\s{2,}/g, ' ').replace(/[:\-–—]\s*$/, '').trim();
};

const Message = ({ message, time, senderId, isOwn, attachment }: Props) => {
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
    <div className={clsx('flex w-full mb-2 group', isMe ? 'justify-end' : 'justify-start')}>
      <div className={clsx('flex gap-1', isMe ? 'flex-row-reverse' : 'flex-row')}>
        <div
          className={clsx(
            'p-3 rounded-xl w-fit max-w-md text-sm flex flex-col text-gray-700',
            isMe ? 'bg-secondary rounded-br-none' : 'bg-[#f5f5f5] rounded-bl-none',
          )}
        >
          {cleanMessage && (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="m-0">{children}</p>,
                a: ({ node: _node, ...props }) => (
                  <a
                    {...props}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800"
                  />
                ),
              }}
            >
              {cleanMessage}
            </ReactMarkdown>
          )}

          {!cleanMessage && jobPreview && (
            <p className="m-0 text-sm font-medium text-gray-700">
              Please check this job and apply if it matches your profile.
            </p>
          )}

          {attachment && <ChatAttachmentPreview isMe={isMe} attachment={attachment} />}

          {jobPreview && (
            <div className="mt-3 max-w-[320px]">
              <JobPreviewCard job={jobPreview} />
            </div>
          )}

          <span className={clsx('text-[10px] mt-1 self-end text-gray-500')}>
            {dayjs(time).fromNow()}
          </span>
        </div>

        {/* <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button isIconOnly size="sm" variant="light" className="text-gray-400 min-w-8 h-8">
                <BsThreeDotsVertical size={16} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Message action">
              <DropdownItem
                key="copy"
                onPress={handleCopy}
                startContent={<MdContentCopy size={17} />}
              >
                Copy
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div> */}
      </div>
    </div>
  );
};

export default Message;
