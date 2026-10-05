import type { MasterDataType } from '@/types';

export type { MasterDataType };

/**
 * A row in one of the simple master-data lists that follow the
 * `master-typed` / `user-typed` pattern — Job Titles, Qualifications
 * and Certifications.
 *
 * `user-typed` only means the value came from an employer's own typing.
 * An admin either promotes it to `master-typed` or deactivates it.
 */
export interface IMasterDataItem {
  id: string;
  name: string;
  type: MasterDataType;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface IMasterDataListResponse {
  data: IMasterDataItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** Rows still waiting for a review decision, per master-data list. */
export interface IMasterDataPendingCounts {
  jobTitles: number;
  qualifications: number;
  certifications: number;
}
