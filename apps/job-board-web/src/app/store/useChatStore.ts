import { create } from 'zustand';
import { IChatMessage, IChatRoom, IChatRoomParticipant } from '../types/types';
import { persist } from 'zustand/middleware';

interface ChatStore {
  chats: IChatMessage[];
  chatRooms: IChatRoom[];
  formattedParticipant: Record<string, IChatRoomParticipant>;

  setChatRooms: (chatRooms: IChatRoom[]) => void;
  setChats: (chats: IChatMessage[]) => void;
  setFormattedParticipant: (formattedParticipant: Record<string, IChatRoomParticipant>) => void;
  clearChats: () => void;
}

const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      chats: [],
      chatRooms: [],
      formattedParticipant: {},

      setChatRooms: (chatRooms) =>
        set({
          chatRooms,
        }),

      setChats: (chats) =>
        set({
          chats,
        }),

      setFormattedParticipant: (formattedParticipant) =>
        set({
          formattedParticipant,
        }),

      clearChats: () =>
        set({
          chatRooms: [],
          chats: [],
          formattedParticipant: {},
        }),
    }),
    {
      name: 'chat-store',
    },
  ),
);

export default useChatStore;
