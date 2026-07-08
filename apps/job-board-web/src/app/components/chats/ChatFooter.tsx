'use client';

import { Alert, Button, Input, Tooltip, addToast } from '@heroui/react';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import useChatStore from '@/app/store/useChatStore';
import ChatAttachmentUpload from './ChatAttachmentUpload';
import ChatEmojiPicker from './ChatEmojiPicker';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import useSpeechRecognition from '@/app/hooks/useSpeechRecognition';
import { FiMic, FiMicOff } from 'react-icons/fi';
import { IoSend } from 'react-icons/io5';

const ChatFooter = ({ scrollToBottom }: { scrollToBottom: () => void }) => {
  const { roomId } = useParams();
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [readOnlyMessage, setReadOnlyMessage] = useState('');
  const { addMessage, updateRoomAndMoveToTop } = useChatStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { supported, isListening, error, toggle } = useSpeechRecognition({
    lang: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
    onTranscript: (transcript) => setMessage(transcript),
  });

  useEffect(() => {
    if (error) {
      addToast({
        title: 'Voice input',
        color: 'danger',
        description: error,
      });
    }
  }, [error]);

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
      }

      return [];
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
    <form className="px-4 py-4 border-t border-default-200 flex flex-col gap-3 bg-white" onSubmit={handleSubmit}>
      {readOnlyMessage && <Alert color="warning" title={readOnlyMessage} />}
      <Input
        autoFocus
        ref={inputRef}
        placeholder={readOnlyMessage ? 'Conversation is read-only' : 'Reply message...'}
        variant="bordered"
        radius="full"
        size="lg"
        isDisabled={Boolean(readOnlyMessage)}
        autoComplete="off"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        classNames={{
          inputWrapper: [
            'bg-default-50',
            'shadow-none',
            'p-2 py-2',
            'border-1',
            'border-default-200',
            'group-data-[focus=true]:border-primary/40',
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
              <>
                <ChatEmojiPicker message={message} setMessage={setMessage} inputRef={inputRef} />
                <Tooltip
                  content={
                    supported
                      ? isListening
                        ? 'Stop voice input'
                        : 'Use voice input'
                      : 'Voice input not supported in this browser'
                  }
                  placement="top"
                >
                  <span>
                    <Button
                      isIconOnly
                      type="button"
                      variant="flat"
                      color={supported ? (isListening ? 'danger' : 'default') : 'default'}
                      radius="full"
                      className="min-w-10 h-10"
                      onPress={toggle}
                      isDisabled={!supported}
                    >
                      {isListening ? <FiMicOff className="text-lg" /> : <FiMic className="text-lg" />}
                    </Button>
                  </span>
                </Tooltip>
              </>
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
