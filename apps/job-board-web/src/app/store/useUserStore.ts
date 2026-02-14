import { create } from "zustand";
import { persist } from "zustand/middleware";
import { IUser } from "../types/types";

interface UserState {
  user: IUser | null;
  setUser: (user: IUser) => void;
  clearUser: () => void;
}

const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) =>
        set({
          user,
        }),

      clearUser: () =>
        set({
          user: null,
        }),
    }),
    {
      name: "user-store",
    },
  ),
);

export default useUserStore;
