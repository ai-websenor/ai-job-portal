import { create } from 'zustand';
import http from '@/api/http';
import endpoints from '@/api/endpoints';

export interface FlaggedPost {
  id: string;
  title: string;
  content: string | null;
  author: string | null;
  authorEmail: string | null;
  flaggedBy: string | null;
  flaggedReason: string | null;
  flaggedAt: string;
  status: 'pending' | 'reviewed' | 'rejected';
  category: string | null;
}

interface ModerationListResponse {
  data?: FlaggedPost[];
  pagination?: { total?: number };
}

interface ModerationState {
  flaggedPosts: FlaggedPost[];
  loading: boolean;
  fetchFlaggedPosts: () => Promise<void>;
  rejectPost: (postId: string) => Promise<void>;
  unflagPost: (postId: string) => Promise<void>;
  markAsReviewed: (postId: string) => Promise<void>;
  getPendingCount: () => number;
}

// The interceptor (src/api/http.ts) unwraps `response.data`, so an http call
// resolves to the response body directly.
function normalize(raw: unknown): FlaggedPost[] {
  const res = raw as ModerationListResponse | FlaggedPost[];
  if (Array.isArray(res)) return res;
  return res?.data ?? [];
}

export const useModerationStore = create<ModerationState>()((set, get) => ({
  flaggedPosts: [],
  loading: false,

  fetchFlaggedPosts: async () => {
    set({ loading: true });
    try {
      const res = await http.get(endpoints.moderation.list, {
        params: { page: 1, limit: 100 },
      });
      set({ flaggedPosts: normalize(res), loading: false });
    } catch {
      // interceptor already shows a toast
      set({ loading: false });
    }
  },

  // "Delete Post" -> content violates policy -> reject
  rejectPost: async (postId) => {
    await http.put(endpoints.moderation.reject(postId));
    set((state) => ({
      flaggedPosts: state.flaggedPosts.filter((post) => post.id !== postId),
    }));
  },

  // "Unflag" -> remove the flag from the queue entirely
  unflagPost: async (postId) => {
    await http.delete(endpoints.moderation.details(postId));
    set((state) => ({
      flaggedPosts: state.flaggedPosts.filter((post) => post.id !== postId),
    }));
  },

  // "Mark as Reviewed" -> content is acceptable -> approve
  markAsReviewed: async (postId) => {
    await http.put(endpoints.moderation.approve(postId));
    set((state) => ({
      flaggedPosts: state.flaggedPosts.map((post) =>
        post.id === postId ? { ...post, status: 'reviewed' } : post,
      ),
    }));
  },

  getPendingCount: () => get().flaggedPosts.filter((post) => post.status === 'pending').length,
}));
