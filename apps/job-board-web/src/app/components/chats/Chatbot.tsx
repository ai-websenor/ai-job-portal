'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import { defaultChatbotSuggestions } from '@/app/config/data';
import { ChatbotRoles } from '@/app/types/enum';
import { IChatbotMessage } from '@/app/types/types';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Input,
  ScrollShadow,
  Tooltip,
} from '@heroui/react';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { IoChatbubblesSharp, IoClose, IoSend } from 'react-icons/io5';

type Props = {
  jobId: string;
};

const Chatbot = ({ jobId }: Props) => {
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<IChatbotMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>(defaultChatbotSuggestions);

  const scrollRef = useRef<HTMLDivElement>(null);

  const toggleChatbot = () => setIsOpen(!isOpen);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  const handleSendChat = async (text: string) => {
    if (!text.trim()) return;

    setMessage('');
    setChatHistory((prev) => [...prev, { role: ChatbotRoles.user, text }]);

    try {
      setIsLoading(true);

      const res = await http.post(ENDPOINTS.MESSAGES.CHATBOT, { jobId, message: text });

      if (res?.data?.response) {
        setChatHistory((prev) => [...prev, { role: ChatbotRoles.bot, text: res?.data?.response }]);
        setSuggestions(res?.data?.suggestions || []);
      }
    } catch (error) {
      console.log(error);
      setChatHistory((prev) => [
        ...prev,
        { role: ChatbotRoles.bot, text: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4">
      {isOpen && (
        <Card
          className="flex flex-col w-[380px] h-[500px] max-h-[calc(100vh-150px)] overflow-hidden shadow-2xl border-none bg-background/90 backdrop-blur-lg"
          isBlurred
        >
          <CardHeader className="flex justify-between items-center bg-primary text-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <IoChatbubblesSharp size={18} />
              </div>
              <div className="flex flex-col">
                <p className="font-bold text-sm leading-none">Job AI Assistant</p>
                <span className="text-[10px] opacity-80 mt-1 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  Online
                </span>
              </div>
            </div>
            <Button
              isIconOnly
              variant="light"
              radius="full"
              size="sm"
              onPress={toggleChatbot}
              className="text-white hover:bg-white/10"
            >
              <IoClose size={20} />
            </Button>
          </CardHeader>

          <CardBody className="flex-1 p-0 bg-default-50/50">
            <ScrollShadow hideScrollBar className="h-full p-4 flex flex-col gap-4">
              {chatHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-40 gap-2">
                  <IoChatbubblesSharp size={40} />
                  <p className="text-xs italic">Ask me anything about this role...</p>
                </div>
              )}

              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={clsx('flex w-full', {
                    'justify-end': msg.role === ChatbotRoles.user,
                    'justify-start': msg.role !== ChatbotRoles.user,
                  })}
                >
                  <div
                    className={clsx('max-w-[85%] px-4 py-2.5 shadow-sm text-sm transition-all', {
                      'bg-primary text-white rounded-2xl rounded-tr-none':
                        msg.role === ChatbotRoles.user,
                      'bg-white text-default-700 rounded-2xl rounded-tl-none border border-default-200':
                        msg.role !== ChatbotRoles.user,
                    })}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start items-center gap-2">
                  <div className="bg-white border border-default-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-default-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-default-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-default-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={scrollRef} className="h-2" />
            </ScrollShadow>
          </CardBody>

          <CardFooter className="flex flex-col gap-3 p-4 bg-white border-t border-default-100">
            {suggestions.length > 0 && (
              <div className="flex gap-2 overflow-x-auto w-full no-scrollbar pb-1">
                {suggestions.map((s, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant="flat"
                    color="primary"
                    className="h-7 text-[10px] px-3 min-w-fit rounded-full border border-primary/20"
                    onPress={() => handleSendChat(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat(message);
              }}
              className="flex w-full gap-2 items-center"
            >
              <Input
                fullWidth
                size="sm"
                autoFocus
                placeholder="Type your question..."
                value={message}
                onValueChange={setMessage}
                classNames={{
                  inputWrapper:
                    'bg-default-100/50 hover:bg-default-100 focus-within:!bg-default-100',
                }}
              />
              <Button
                isIconOnly
                color="primary"
                radius="lg"
                size="md"
                type="submit"
                disabled={!message.trim() || isLoading}
                className="shadow-md"
              >
                <IoSend size={16} />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}

      <Tooltip content="Chat with Job Assistant" placement="left">
        <Button
          isIconOnly
          radius="full"
          color="primary"
          onPress={toggleChatbot}
          className="shadow-lg w-12 h-12 text-xl animate-appearance-in"
        >
          {isOpen ? <IoClose /> : <IoChatbubblesSharp />}
        </Button>
      </Tooltip>
    </div>
  );
};

export default Chatbot;
