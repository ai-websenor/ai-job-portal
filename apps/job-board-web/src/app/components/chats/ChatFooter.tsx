'use client';

import { Button, Input } from '@heroui/react';
import { IoSend } from 'react-icons/io5';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import socket from '@/app/socket';
import SOCKET_EVENTS from '@/app/socket/socket-events';
import useChatStore from '@/app/store/useChatStore';
import ChatAttachmentUpload from './ChatAttachmentUpload';
import ChatEmojiPicker from './ChatEmojiPicker';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';

const ChatFooter = ({ scrollToBottom }: { scrollToBottom: () => void }) => {
  const { roomId } = useParams();
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { addMessage, updateRoomAndMoveToTop } = useChatStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSendChat = async () => {
    if (!message.trim() && !selectedFile) return;

    const messagePayload = {
      threadId: roomId,
      body: message.trim() ?? '',
      attachments: [],
    };

    if (selectedFile) {
      messagePayload.attachments = await handleUploadAttachment();
    }

    try {
      socket.emit(SOCKET_EVENTS.EMIT.SEND_MESSAGE, messagePayload);
      setMessage('');
      setTimeout(() => scrollToBottom(), 100);
      setSelectedFile(null);
    } catch (error) {
      console.log('Failed to send message:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSendChat();
  };

  const handleUploadAttachment = async (): Promise<any> => {
    try {
      setIsUploading(true);
      const response = await http.post(ENDPOINTS.MESSAGES.CHATS.UPLOAD_ATTACHMENT, {
        fileName: selectedFile?.name,
        contentType: selectedFile?.type,
        fileSize: selectedFile?.size,
      });

      if (response?.data?.uploadUrl) {
        await handleUploadOnS3(response?.data?.uploadUrl);

        return [
          {
            name: selectedFile?.name,
            url: response?.data?.uploadUrl,
            type: selectedFile?.type,
            size: selectedFile?.size,
          },
        ];
      } else {
        return [];
      }
    } catch (error) {
      console.log(error);
      return [];
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadOnS3 = async (uploadedUrl: string) => {
    try {
      await fetch(uploadedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': selectedFile?.type!,
        },
        body: selectedFile,
      });
    } catch (error) {
      console.log(error);
    }
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
          <ChatAttachmentUpload selectedFile={selectedFile} setSelectedFile={setSelectedFile} />
        }
        endContent={
          <div className="flex items-center gap-1">
            <ChatEmojiPicker message={message} setMessage={setMessage} inputRef={inputRef} />
            <Button
              isIconOnly
              type="submit"
              className="bg-primary text-white min-w-10 h-10"
              radius="full"
              isLoading={isUploading}
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
