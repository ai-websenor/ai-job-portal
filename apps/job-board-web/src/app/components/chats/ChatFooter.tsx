'use client';

import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@heroui/react';
import {
  HiOutlineDocumentText,
  HiOutlinePaperClip,
  HiOutlinePhoto,
  HiOutlineVideoCamera,
} from 'react-icons/hi2';
import { HiOutlineEmojiHappy } from 'react-icons/hi';
import { IoSend } from 'react-icons/io5';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import socket from '@/app/socket';
import SOCKET_EVENTS from '@/app/socket/socket-events';
import useChatStore from '@/app/store/useChatStore';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
});

const ChatFooter = ({ scrollToBottom }: { scrollToBottom: () => void }) => {
  const { roomId } = useParams();
  const [message, setMessage] = useState('');
  const { addMessage, updateRoomAndMoveToTop } = useChatStore();

  const inputRef = useRef<HTMLInputElement>(null);

  const handleEmojiClick = (emojiData: { emoji: string }) => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;

    const newMessage = message.substring(0, start) + emojiData.emoji + message.substring(end);

    setMessage(newMessage);

    setTimeout(() => {
      input.focus();
      const newPos = start + emojiData.emoji.length;
      input.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleSendChat = () => {
    if (!message.trim()) return;

    const messagePayload = {
      threadId: roomId,
      body: message.trim(),
      attachments: [],
    };

    try {
      socket.emit(SOCKET_EVENTS.EMIT.SEND_MESSAGE, messagePayload);
      setMessage('');
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.log('Failed to send message:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSendChat();
  };

  const handleNewMessage = (newChat: any) => {
    if (!newChat) return;
    addMessage(newChat);
    updateRoomAndMoveToTop(newChat);
    setTimeout(() => scrollToBottom, 100);
  };

  useEffect(() => {
    socket.on(SOCKET_EVENTS.LISTNERS.MESSAGE_SENT, handleNewMessage);

    return () => {
      socket.off(SOCKET_EVENTS.LISTNERS.MESSAGE_SENT, handleNewMessage);
    };
  }, []);

  return (
    <form className="p-4 border-t border-default-100" onSubmit={handleSubmit}>
      <Input
        autoFocus
        ref={inputRef}
        placeholder="Reply message"
        variant="bordered"
        radius="full"
        size="lg"
        autoComplete="off"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        classNames={{
          inputWrapper: [
            'bg-white',
            'shadow-none',
            'p-0',
            'border-1',
            'group-data-[focus=true]:border-default-400',
            'group-data-[focus=true]:ring-0',
            'group-data-[focus=true]:ring-offset-0',
          ].join(' '),
          input: 'text-small',
        }}
        startContent={
          <Dropdown placement="top-start">
            <DropdownTrigger>
              <Button isIconOnly variant="light" radius="full" size="sm">
                <HiOutlinePaperClip className="text-default-400 text-xl" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Attachment options">
              {attachmentItems.map((item) => (
                <DropdownItem
                  key={item.key}
                  startContent={<item.icon className={item.iconClassName} />}
                >
                  {item.label}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        }
        endContent={
          <div className="flex items-center gap-1">
            <Popover placement="top-end" showArrow offset={10}>
              <PopoverTrigger>
                <Button isIconOnly variant="light" radius="full" size="sm">
                  <HiOutlineEmojiHappy className="text-default-400 text-xl" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 border-none">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  autoFocusSearch={false}
                  height={400}
                  width={300}
                />
              </PopoverContent>
            </Popover>
            <Button
              isIconOnly
              type="submit"
              className="bg-primary text-white min-w-10 h-10"
              radius="full"
              onPress={handleSendChat}
            >
              <IoSend className="text-lg" />
            </Button>
          </div>
        }
      />
    </form>
  );
};

export default ChatFooter;

const attachmentItems = [
  {
    key: 'photos',
    label: 'Photos',
    icon: HiOutlinePhoto,
    iconClassName: 'text-xl text-primary',
  },
  {
    key: 'videos',
    label: 'Videos',
    icon: HiOutlineVideoCamera,
    iconClassName: 'text-xl',
  },
  {
    key: 'documents',
    label: 'Documents',
    icon: HiOutlineDocumentText,
    iconClassName: 'text-xl text-success',
  },
];
