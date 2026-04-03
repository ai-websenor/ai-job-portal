'use client';

import useUserStore from '@/app/store/useUserStore';
import { IChatAttachment } from '@/app/types/types';
import {
  addToast,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from '@heroui/react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { MdContentCopy } from 'react-icons/md';
import ReactMarkdown from 'react-markdown';
import ChatAttachmentPreview from './ChatAttachmentPreview';

dayjs.extend(relativeTime);

type Props = {
  message: string;
  time: string;
  senderId: string;
  messageId: string;
  attachment?: IChatAttachment;
};

const Message = ({ message, time, senderId, attachment }: Props) => {
  const { user } = useUserStore();
  const isMe = senderId === user?.userId;

  const handleCopy = () => {
    if (!message && !attachment) return;

    navigator.clipboard.writeText(`${message} \n ${attachment?.url}`);

    addToast({
      description: 'Copied to clipboard',
      color: 'secondary',
    });
  };

  return (
    <div className={clsx('flex w-full mb-2 group', isMe ? 'justify-end' : 'justify-start')}>
      <div className={clsx('flex gap-1', isMe ? 'flex-row-reverse' : 'flex-row')}>
        <div
          className={clsx(
            'p-3 rounded-xl w-fit max-w-md text-sm flex flex-col text-gray-700',
            isMe ? 'bg-secondary rounded-br-none' : 'bg-[#f5f5f5] rounded-bl-none',
          )}
        >
          {message && (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="m-0">{children}</p>,
              }}
            >
              {message}
            </ReactMarkdown>
          )}

          {attachment && <ChatAttachmentPreview isMe={isMe} attachment={attachment} />}

          <span className={clsx('text-[10px] mt-1 self-end text-gray-500')}>
            {dayjs(time).fromNow()}
          </span>
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
        </div>
      </div>
    </div>
  );
};

export default Message;
