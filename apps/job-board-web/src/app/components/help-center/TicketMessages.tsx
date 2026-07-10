import { ITicketMessage } from '@/app/types/support';
import CommonUtils from '@/app/utils/commonUtils';

import { Avatar } from '@heroui/react';
import { BiSupport, BiUser } from 'react-icons/bi';

interface TicketMessagesProps {
  messages: ITicketMessage[];
}

const TicketMessages = ({ messages }: TicketMessagesProps) => {
  if (!messages || messages.length === 0) {
    return <div className="text-center text-gray-500 py-12 flex flex-col items-center justify-center">
      <BiSupport className="text-4xl text-gray-300 mb-2" />
      <p>No messages yet. Send a reply to start the conversation.</p>
    </div>;
  }

  // Reverse messages so oldest is at the top for chat-like UI
  const displayMessages = [...messages].reverse();

  return (
    <div className="flex flex-col gap-6 p-2">
      {displayMessages.map((msg, index) => {
        const isUser = msg.senderType === 'user';
        const msgDate = new Date(msg.createdAt).toLocaleDateString();
        const prevDate = index > 0 ? new Date(displayMessages[index - 1].createdAt).toLocaleDateString() : null;

        return (
          <div key={msg.id} className="flex flex-col gap-6">
            {msgDate !== prevDate && (
              <div className="flex justify-center my-1">
                <span className="bg-gray-200/60 text-gray-500 text-[11px] font-medium tracking-wide py-1 px-3 rounded-full">
                  {CommonUtils.formatChatListDate(msg.createdAt)}
                </span>
              </div>
            )}
            <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              <Avatar
                icon={isUser ? <BiUser className="text-lg" /> : <BiSupport className="text-lg" />}
                classNames={{
                  base: isUser ? 'bg-primary/20 text-primary shrink-0' : 'bg-gray-200 text-gray-600 shrink-0',
                }}
                size="sm"
              />
              <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-medium text-gray-700">
                    {isUser ? 'You' : 'Support Team'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {CommonUtils.formatMessageTime(msg.createdAt)}
                  </span>
                </div>
                <div
                  className={`px-4 py-3 shadow-sm ${
                    isUser
                      ? 'bg-primary text-white rounded-2xl rounded-tr-sm'
                      : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.message}</p>
                  
                  {/* Future phase 2: attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {msg.attachments.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${
                            isUser ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          Attachment {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>
        );
      })}
    </div>
  );
};

export default TicketMessages;
