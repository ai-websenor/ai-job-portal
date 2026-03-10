'use client';

import { Button, Popover, PopoverContent, PopoverTrigger } from '@heroui/react';
import { HiOutlineEmojiHappy } from 'react-icons/hi';
import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
});

interface Props {
  message: string;
  setMessage: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

const ChatEmojiPicker = ({ message, setMessage, inputRef }: Props) => {
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

  return (
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
  );
};

export default ChatEmojiPicker;
