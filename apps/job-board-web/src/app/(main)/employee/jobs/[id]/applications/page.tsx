'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import JobApplicantCard from '@/app/components/cards/JobApplicantCard';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import withAuth from '@/app/hoc/withAuth';
import usePagination from '@/app/hooks/usePagination';
import useApplicantScores from '@/app/hooks/useApplicantScores';
import { IApplication } from '@/app/types/types';
import { APPLICANT_SCORE_CONTEXT_LINE } from '@/app/types/applicantScore';
import { Select, SelectItem } from '@heroui/react';
import { useSearchParams } from 'next/navigation';
import { use, useEffect, useMemo, useState } from 'react';

type SortKey = 'applied' | 'score';

const ApplicationsPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const { page, setTotalPages, renderPagination } = usePagination();
  const [applications, setApplications] = useState<IApplication[]>([]);
  // Applied date stays the default so the page behaves exactly as before
  // until the employer deliberately switches to the match ordering.
  const [sortBy, setSortBy] = useState<SortKey>('applied');

  const jobTitle = decodeURIComponent(searchParams.get('title') || '');

  // One request for the whole page, never one per card.
  const { scores, loading: scoresLoading, error: scoresError } = useApplicantScores(id);

  /**
   * Sorting covers the applicants currently on screen — the list is paginated
   * server-side, so this reorders this page rather than the whole pipeline.
   * Unscored candidates sink to the bottom instead of counting as zero: they
   * are missing data, not weak applicants.
   */
  const visibleApplications = useMemo(() => {
    if (sortBy !== 'score') return applications;

    return [...applications].sort((a, b) => {
      const left = scores[a?.id]?.score;
      const right = scores[b?.id]?.score;

      if (typeof left !== 'number' && typeof right !== 'number') return 0;
      if (typeof left !== 'number') return 1;
      if (typeof right !== 'number') return -1;

      return right - left;
    });
  }, [applications, scores, sortBy]);

  const getApplications = async () => {
    try {
      setLoading(true);
      const response = (await http.get(ENDPOINTS.EMPLOYER.APPLICATIONS.LIST(id), {
        params: {
          page,
          limit: 10,
        },
      })) as unknown as {
        data?: IApplication[];
        pagination?: { pageCount?: number };
      };
      if (response?.data) {
        setApplications(response.data);
        setTotalPages(response.pagination?.pageCount ?? 1);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getApplications();
  }, [page]);

  return (
    <>
      <title>{jobTitle}</title>

      <div className="container mx-auto p-6">
        {loading && applications.length > 0 && (
          <div className="fixed inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <LoadingProgress />
          </div>
        )}

        {loading && applications.length === 0 ? (
          <LoadingProgress />
        ) : (
          <>
            <div className="flex flex-col gap-2 mb-6">
              <BackButton showLabel />
              <h1 className="text-2xl font-bold text-foreground">{jobTitle} Applicants</h1>
            </div>

            {applications?.length > 0 ? (
              <>
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-xl text-xs text-default-400">
                    {APPLICANT_SCORE_CONTEXT_LINE}
                    {scoresError ? ` ${scoresError}` : ''}
                  </p>
                  <Select
                    aria-label="Sort applicants"
                    label="Sort by"
                    size="sm"
                    className="max-w-[220px]"
                    selectedKeys={[sortBy]}
                    disallowEmptySelection
                    onSelectionChange={(keys) => {
                      const next = Array.from(keys)[0] as SortKey;
                      if (next) setSortBy(next);
                    }}
                  >
                    <SelectItem key="applied">Applied date</SelectItem>
                    <SelectItem key="score">Match score</SelectItem>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                  {visibleApplications?.map((item) => (
                    <JobApplicantCard
                      key={item.id}
                      applicationId={item?.id}
                      seeker={item?.jobSeeker}
                      createdAt={item?.appliedAt}
                      score={scores[item?.id]?.score ?? null}
                      band={scores[item?.id]?.band ?? null}
                      scoreLoading={scoresLoading}
                    />
                  ))}
                </div>
                {renderPagination()}
              </>
            ) : (
              <p className="text-sm text-center text-default-400">No applications found</p>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default withAuth(ApplicationsPage);
