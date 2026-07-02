import { create } from 'zustand';

/**
 * Holds the Secret Manager vault session token. INTENTIONALLY in-memory only (no persist):
 * the token must die on tab close / refresh and never touch localStorage. A hard 20-minute
 * expiry is enforced both here (countdown) and server-side (Redis TTL + JWT exp).
 */
interface VaultState {
  vaultToken: string | null;
  expiresAt: number | null; // epoch ms
  setSession: (token: string, expiresInSeconds: number) => void;
  clear: () => void;
  isUnlocked: () => boolean;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  vaultToken: null,
  expiresAt: null,
  setSession: (token, expiresInSeconds) =>
    set({ vaultToken: token, expiresAt: Date.now() + expiresInSeconds * 1000 }),
  clear: () => set({ vaultToken: null, expiresAt: null }),
  isUnlocked: () => {
    const { vaultToken, expiresAt } = get();
    return !!vaultToken && !!expiresAt && expiresAt > Date.now();
  },
}));
