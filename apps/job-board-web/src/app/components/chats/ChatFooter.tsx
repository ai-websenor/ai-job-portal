'use client';

import { Alert, Button, Input } from '@heroui/react';
import { IoSend } from 'react-icons/io5';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import useChatStore from '@/app/store/useChatStore';
import ChatAttachmentUpload from './ChatAttachmentUpload';
import ChatEmojiPicker from './ChatEmojiPicker';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';

const ChatFooter = ({ scrollToBottom }: { scrollToBottom: () => void }) => {
  const { roomId } = useParams();
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [readOnlyMessage, setReadOnlyMessage] = useState('');
  const { addMessage, updateRoomAndMoveToTop } = useChatStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSendChat();
  };

  const handleSendChat = async () => {
    if (readOnlyMessage || isSending || (!message.trim() && !selectedFile)) return;

    let attachments = [];
    if (selectedFile) {
      attachments = await handleUploadAttachment();
      if (attachments.length === 0) {
        alert('Upload failed. Please try again.');
        return;
      }
    }

    const messagePayload = {
      attachments,
      body: message.trim() ?? '',
    };

    try {
      setIsSending(true);
      const response: any = await http.post(
        ENDPOINTS.MESSAGES.CHATS.SEND(roomId as string),
        messagePayload,
      );
      const newMessage = response?.data ?? response;

      if (newMessage?.id) {
        addMessage(newMessage);
        updateRoomAndMoveToTop(newMessage);
      }

      setReadOnlyMessage('');
      setMessage('');
      setTimeout(() => scrollToBottom(), 100);
      setSelectedFile(null);
    } catch (error: any) {
      if (error?.statusCode === 403) {
        // Permission revoked mid-session (company chat access removed) reads
        // differently from an application-status restriction
        const isAuthorizationError = String(error?.message || '').includes('Not authorized');
        setReadOnlyMessage(
          isAuthorizationError
            ? 'You no longer have access to this conversation. Your permissions may have changed.'
            : error?.message || 'Chat is disabled for this application.',
        );
      }
      console.log('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
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

  useEffect(() => {
    setReadOnlyMessage('');
    setMessage('');
    setSelectedFile(null);
  }, [roomId]);

  return (
    <form className="p-4 border-t border-default-100 flex flex-col gap-3" onSubmit={handleSubmit}>
      {readOnlyMessage && <Alert color="warning" title={readOnlyMessage} />}
      <Input
        autoFocus
        ref={inputRef}
        placeholder={readOnlyMessage ? 'Conversation is read-only' : 'Reply message'}
        variant="bordered"
        radius="full"
        size="lg"
        isDisabled={Boolean(readOnlyMessage)}
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
          readOnlyMessage ? null : (
            <ChatAttachmentUpload selectedFile={selectedFile} setSelectedFile={setSelectedFile} />
          )
        }
        endContent={
          <div className="flex items-center gap-1">
            {!readOnlyMessage && (
              <ChatEmojiPicker message={message} setMessage={setMessage} inputRef={inputRef} />
            )}
            <Button
              isIconOnly
              type="submit"
              className="bg-primary text-white min-w-10 h-10"
              radius="full"
              isLoading={isUploading || isSending}
              isDisabled={Boolean(readOnlyMessage)}
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
