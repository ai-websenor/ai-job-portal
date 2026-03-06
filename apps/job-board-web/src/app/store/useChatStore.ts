import { create } from 'zustand';
import { IChatMessage, IChatRoom, IChatRoomParticipant } from '../types/types';
import { persist } from 'zustand/middleware';

interface ChatStore {
  chats: IChatMessage[];
  chatRooms: IChatRoom[];
  activeChatRoom: IChatRoom | null;
  formattedParticipant: Record<string, IChatRoomParticipant>;

  clearChats: () => void;
  setChats: (chats: IChatMessage[]) => void;
  setActiveChatRoom: (data: IChatRoom) => void;
  setChatRooms: (chatRooms: IChatRoom[]) => void;
  setFormattedParticipant: (formattedParticipant: Record<string, IChatRoomParticipant>) => void;
}

const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      chats: [],
      chatRooms: [],
      activeChatRoom: null,
      formattedParticipant: {},

      setChatRooms: (chatRooms) =>
        set({
          chatRooms,
        }),

      setActiveChatRoom: (activeChatRoom) => set({ activeChatRoom }),

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
          chats: [],
          chatRooms: [],
          activeChatRoom: null,
          formattedParticipant: {},
        }),
    }),
    {
      name: 'chat-store',
    },
  ),
);

export default useChatStore;
