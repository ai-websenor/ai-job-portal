import { addToast } from '@heroui/react';
import { create } from 'zustand';
import {
  getSavedCandidates,
  saveCandidate,
  searchCandidates,
  unsaveCandidate,
} from '../api/candidateSearch';
import type {
  CandidateAvailability,
  CandidateEmploymentType,
  CandidateExperienceLevel,
  CandidateFilters,
  CandidatePagination,
  CandidateProfileCard,
  CandidateSkillOption,
} from '../types/candidateSearch';

type ArrayFilterKey = 'experienceLevels' | 'employmentTypes' | 'availability' | 'skillIds';

type ArrayFilterValue<T extends ArrayFilterKey> = T extends 'experienceLevels'
  ? CandidateExperienceLevel
  : T extends 'employmentTypes'
    ? CandidateEmploymentType
    : T extends 'availability'
      ? CandidateAvailability
      : string;

type CandidateSearchState = {
  filters: CandidateFilters;
  results: CandidateProfileCard[];
  pagination: CandidatePagination;
  loading: boolean;
  error: string | null;
  errorStatus: number | null;
  selectedSkillOptions: CandidateSkillOption[];
  savedResults: CandidateProfileCard[];
  savedPagination: CandidatePagination;
  savedLoading: boolean;
  savedError: string | null;
  actionLoadingIds: Set<string>;
  setFilter: <K extends keyof CandidateFilters>(key: K, value: CandidateFilters[K]) => void;
  setFilters: (filters: Partial<CandidateFilters>, resetPage?: boolean) => void;
  setPage: (page: number) => void;
  setSavedPage: (page: number) => void;
  toggleArrayFilter: <T extends ArrayFilterKey>(key: T, value: ArrayFilterValue<T>) => void;
  removeArrayFilter: <T extends ArrayFilterKey>(key: T, value: ArrayFilterValue<T>) => void;
  addSkillFilter: (skill: CandidateSkillOption) => void;
  resetFilters: () => void;
  fetchSearch: (
    overrides?: Partial<CandidateFilters>,
    options?: { signal?: AbortSignal },
  ) => Promise<void>;
  fetchSaved: (page?: number, options?: { signal?: AbortSignal }) => Promise<void>;
  toggleSave: (candidate: CandidateProfileCard) => Promise<void>;
};

export const createDefaultCandidateFilters = (): CandidateFilters => ({
  query: '',
  location: '',
  experienceLevels: [],
  salaryMin: undefined,
  salaryMax: undefined,
  employmentTypes: [],
  availability: [],
  skillIds: [],
  sortBy: 'relevance',
  page: 1,
  limit: 10,
});

const defaultPagination: CandidatePagination = {
  totalCandidate: 0,
  pageCount: 0,
  currentPage: 1,
  hasNextPage: false,
};

let searchRequestId = 0;
let savedRequestId = 0;

const isCanceledRequest = (error: unknown) =>
  (error as any)?.code === 'ERR_CANCELED' || (error as any)?.name === 'CanceledError';

const getErrorMessage = (error: unknown) =>
  (error as any)?.message || (error as any)?.error || 'Something went wrong';

const getErrorStatus = (error: unknown) =>
  Number((error as any)?.statusCode || (error as any)?.status || 0) || null;

const recalculatePageCount = (total: number, limit: number) => Math.ceil(total / limit);

const updateSaveState = (
  state: CandidateSearchState,
  candidate: CandidateProfileCard,
  isSaved: boolean,
) => {
  const savedCandidate = { ...candidate, isSaved };
  const existedInSaved = state.savedResults.some((item) => item.profileId === candidate.profileId);
  const shouldAdjustTotal = existedInSaved || candidate.isSaved !== isSaved;
  const totalCandidate = shouldAdjustTotal
    ? Math.max(
        0,
        state.savedPagination.totalCandidate + (isSaved ? (existedInSaved ? 0 : 1) : -1),
      )
    : state.savedPagination.totalCandidate;

  const savedResults = isSaved
    ? existedInSaved
      ? state.savedResults.map((item) =>
          item.profileId === candidate.profileId ? savedCandidate : item,
        )
      : [savedCandidate, ...state.savedResults].slice(0, state.filters.limit)
    : state.savedResults.filter((item) => item.profileId !== candidate.profileId);

  return {
    results: state.results.map((item) =>
      item.profileId === candidate.profileId ? { ...item, isSaved } : item,
    ),
    savedResults,
    savedPagination: {
      ...state.savedPagination,
      totalCandidate,
      pageCount: recalculatePageCount(totalCandidate, state.filters.limit),
      hasNextPage: state.savedPagination.currentPage < recalculatePageCount(totalCandidate, state.filters.limit),
    },
  };
};

const useCandidateSearchStore = create<CandidateSearchState>((set, get) => ({
  filters: createDefaultCandidateFilters(),
  results: [],
  pagination: defaultPagination,
  loading: false,
  error: null,
  errorStatus: null,
  selectedSkillOptions: [],
  savedResults: [],
  savedPagination: defaultPagination,
  savedLoading: false,
  savedError: null,
  actionLoadingIds: new Set(),

  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
        page: key === 'page' ? Number(value) : 1,
      },
    })),

  setFilters: (filters, resetPage = true) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...filters,
        page: resetPage ? 1 : filters.page ?? state.filters.page,
      },
    })),

  setPage: (page) =>
    set((state) => ({
      filters: {
        ...state.filters,
        page,
      },
    })),

  setSavedPage: (page) =>
    set((state) => ({
      savedPagination: {
        ...state.savedPagination,
        currentPage: page,
      },
    })),

  toggleArrayFilter: (key, value) =>
    set((state) => {
      const values = state.filters[key] as string[];
      const nextValues = values.includes(value as string)
        ? values.filter((item) => item !== value)
        : [...values, value as string];

      return {
        filters: {
          ...state.filters,
          [key]: nextValues,
          page: 1,
        },
      };
    }),

  removeArrayFilter: (key, value) =>
    set((state) => {
      const nextSkillOptions =
        key === 'skillIds'
          ? state.selectedSkillOptions.filter((skill) => skill.id !== value)
          : state.selectedSkillOptions;

      return {
        filters: {
          ...state.filters,
          [key]: (state.filters[key] as string[]).filter((item) => item !== value),
          page: 1,
        },
        selectedSkillOptions: nextSkillOptions,
      };
    }),

  addSkillFilter: (skill) =>
    set((state) => {
      if (state.filters.skillIds.includes(skill.id)) return state;

      return {
        filters: {
          ...state.filters,
          skillIds: [...state.filters.skillIds, skill.id],
          page: 1,
        },
        selectedSkillOptions: [...state.selectedSkillOptions, skill],
      };
    }),

  resetFilters: () =>
    set({
      filters: createDefaultCandidateFilters(),
      selectedSkillOptions: [],
    }),

  fetchSearch: async (overrides, options) => {
    const requestId = ++searchRequestId;
    const filters = {
      ...get().filters,
      ...overrides,
    };

    set({
      loading: true,
      error: null,
      errorStatus: null,
    });

    try {
      const response = await searchCandidates(filters, { signal: options?.signal });
      if (requestId !== searchRequestId) return;

      set({
        results: response?.data ?? [],
        pagination: response?.pagination ?? defaultPagination,
        loading: false,
      });
    } catch (error) {
      if (isCanceledRequest(error)) {
        if (requestId === searchRequestId) {
          set({ loading: false });
        }
        return;
      }

      if (requestId !== searchRequestId) return;

      set({
        results: [],
        pagination: defaultPagination,
        loading: false,
        error: getErrorMessage(error),
        errorStatus: getErrorStatus(error),
      });
    }
  },

  fetchSaved: async (page, options) => {
    const requestId = ++savedRequestId;
    const targetPage = page ?? get().savedPagination.currentPage;
    const limit = get().filters.limit;

    set({
      savedLoading: true,
      savedError: null,
    });

    try {
      const response = await getSavedCandidates(targetPage, limit, { signal: options?.signal });
      if (requestId !== savedRequestId) return;

      set({
        savedResults: response?.data ?? [],
        savedPagination: response?.pagination ?? {
          ...defaultPagination,
          currentPage: targetPage,
        },
        savedLoading: false,
      });
    } catch (error) {
      if (isCanceledRequest(error)) {
        if (requestId === savedRequestId) {
          set({ savedLoading: false });
        }
        return;
      }

      if (requestId !== savedRequestId) return;

      set({
        savedResults: [],
        savedLoading: false,
        savedError: getErrorMessage(error),
      });
    }
  },

  toggleSave: async (candidate) => {
    if (get().actionLoadingIds.has(candidate.profileId)) return;

    const previous = candidate.isSaved;
    const next = !previous;

    set((state) => ({
      ...updateSaveState(state, candidate, next),
      actionLoadingIds: new Set(state.actionLoadingIds).add(candidate.profileId),
    }));

    try {
      if (previous) {
        await unsaveCandidate(candidate.profileId);
      } else {
        await saveCandidate(candidate.profileId);
      }

      addToast({
        title: next ? 'Candidate saved' : 'Candidate removed',
        color: 'success',
        description: next
          ? 'Candidate added to your shortlist.'
          : 'Candidate removed from your shortlist.',
      });
    } catch (error) {
      set((state) => updateSaveState(state, { ...candidate, isSaved: next }, previous));
      addToast({
        title: 'Could not update shortlist',
        color: 'danger',
        description: getErrorMessage(error),
      });
    } finally {
      set((state) => {
        const nextLoadingIds = new Set(state.actionLoadingIds);
        nextLoadingIds.delete(candidate.profileId);
        return { actionLoadingIds: nextLoadingIds };
      });
    }
  },
}));

export default useCandidateSearchStore;
