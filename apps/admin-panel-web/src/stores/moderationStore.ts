import { create } from 'zustand';
import { persist } from 'zustand/middleware';
// TODO: Import http and endpoints when ready to integrate API
// import http from '@/api/http';
// import endpoints from '@/api/endpoints';

export interface FlaggedPost {
  id: string;
  title: string;
  content: string;
  author: string;
  authorEmail: string;
  flaggedBy: string;
  flaggedReason: string;
  flaggedAt: Date;
  status: 'pending' | 'reviewed';
  category: string;
}

interface ModerationState {
  flaggedPosts: FlaggedPost[];
  loading: boolean;
  addFlaggedPost: (post: Omit<FlaggedPost, 'id' | 'flaggedAt' | 'status'>) => void;
  deletePost: (postId: string) => void;
  unflagPost: (postId: string) => void;
  markAsReviewed: (postId: string) => void;
  getFlaggedPosts: () => FlaggedPost[];
  getPendingCount: () => number;
}

// Mock data for demonstration
const mockFlaggedPosts: FlaggedPost[] = [
  {
    id: '1',
    title: 'Inappropriate Content Example',
    content: 'This is an example of flagged content that violates community guidelines...',
    author: 'John Doe',
    authorEmail: 'john@example.com',
    flaggedBy: 'user123',
    flaggedReason: 'Inappropriate content',
    flaggedAt: new Date('2024-01-15'),
    status: 'pending',
    category: 'General',
  },
  {
    id: '2',
    title: 'Spam Post About Products',
    content: 'Buy our amazing products now! Click here for discount...',
    author: 'Spammer',
    authorEmail: 'spam@example.com',
    flaggedBy: 'user456',
    flaggedReason: 'Spam',
    flaggedAt: new Date('2024-01-14'),
    status: 'pending',
    category: 'Marketplace',
  },
  {
    id: '3',
    title: 'Harassment Example',
    content: 'This post contains harassment towards other users...',
    author: 'BadUser',
    authorEmail: 'bad@example.com',
    flaggedBy: 'user789',
    flaggedReason: 'Harassment',
    flaggedAt: new Date('2024-01-13'),
    status: 'reviewed',
    category: 'Discussion',
  },
];

export const useModerationStore = create<ModerationState>()(
  persist(
    (set, get) => ({
      flaggedPosts: mockFlaggedPosts,
      loading: false,

      addFlaggedPost: (post) => {
        const newPost: FlaggedPost = {
          ...post,
          id: Date.now().toString(),
          flaggedAt: new Date(),
          status: 'pending',
        };
        set((state) => ({
          flaggedPosts: [newPost, ...state.flaggedPosts],
        }));
      },

      deletePost: (postId) => {
        set((state) => ({
          flaggedPosts: state.flaggedPosts.filter((post) => post.id !== postId),
        }));
      },

      unflagPost: (postId) => {
        set((state) => ({
          flaggedPosts: state.flaggedPosts.filter((post) => post.id !== postId),
        }));
      },

      markAsReviewed: (postId) => {
        set((state) => ({
          flaggedPosts: state.flaggedPosts.map((post) =>
            post.id === postId ? { ...post, status: 'reviewed' } : post
          ),
        }));
      },

      getFlaggedPosts: () => get().flaggedPosts,

      getPendingCount: () =>
        get().flaggedPosts.filter((post) => post.status === 'pending').length,
    }),
    {
      name: 'moderation-storage',
      partialize: (state) => ({
        flaggedPosts: state.flaggedPosts
      }),
    }
  )
);