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

  updateRoomAndMoveToTop: (newMessage: IChatMessage) => void;
  addMessage: (newMessage: IChatMessage) => void;
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

      updateRoomAndMoveToTop: (newMessage) =>
        set((state) => {
          const roomIndex = state.chatRooms.findIndex((r) => r.id === newMessage.threadId);

          if (roomIndex === -1) return state;

          const updatedRoom = {
            ...state.chatRooms[roomIndex],
            lastMessage: newMessage,
          };

          const otherRooms = state.chatRooms.filter((r) => r.id !== newMessage.threadId);

          return {
            chatRooms: [updatedRoom, ...otherRooms],
          };
        }),

      addMessage: (newMessage) =>
        set((state) => {
          const isDuplicate = state.chats.some((m) => m.id === newMessage.id);

          if (isDuplicate) return state;

          return { chats: [newMessage, ...state.chats] };
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
