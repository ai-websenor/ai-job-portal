import { create } from "zustand";
import { IChatMessage, IChatRoom } from "../types/types";
import { persist } from "zustand/middleware";

interface ChatStore {
  chats: IChatMessage[];
  chatRooms: IChatRoom[];
  setChatRooms: (chatRooms: IChatRoom[]) => void;
  setChats: (chats: IChatMessage[]) => void;
  clearChats: () => void;
}

const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      chats: [],
      chatRooms: [],
      setChatRooms: (chatRooms) =>
        set({
          chatRooms,
        }),
      setChats: (chats) =>
        set({
          chats,
        }),
      clearChats: () =>
        set({
          chatRooms: [],
          chats: [],
        }),
    }),
    {
      name: "chat-store",
    },
  ),
);

export default useChatStore;
