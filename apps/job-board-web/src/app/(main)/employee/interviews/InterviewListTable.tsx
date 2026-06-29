'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import CancelInterviewDialog from '@/app/components/dialogs/CancelInterviewDialog';
import CompleteInterviewDialog from '@/app/components/dialogs/CompleteInterviewDialog';
import RescheduleInterviewDialog from '@/app/components/dialogs/RescheduleInterviewDialog';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import TableDate from '@/app/components/table/TableDate';
import TableStatus from '@/app/components/table/TableStatus';
import InterviewsListFilters from './InterviewsListFilters';
import { interviewListFilterDefaultValues } from '@/app/config/data';
import routePaths from '@/app/config/routePaths';
import usePagination from '@/app/hooks/usePagination';
import { InterviewStatus } from '@/app/types/enum';
import { IInterview } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import { getInterviewActionAvailability } from '@/app/utils/interviewActionUtils';
import { isEmployerRole } from '@/app/utils/roleUtils';
import useUserStore from '@/app/store/useUserStore';
import {
  Avatar,
  Button,
  Input,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tabs,
  Tab,
} from '@heroui/react';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useEffect, useState } from 'react';
import { FiFilter, FiSearch } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

dayjs.extend(isSameOrBefore);

type Props = {
  initialFilters?: Partial<EmployerFilterValues>;
};

type EmployerFilterValues = {
  status: string;
  fromDate: string | null;
  toDate: string | null;
  candidateName: string;
  jobName: string;
  jobId: string;
};

type CandidateSegment = 'upcoming' | 'completed' | 'canceled' | 'all';

const candidateSegments: { key: CandidateSegment; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'canceled', label: 'Canceled' },
  { key: 'all', label: 'All' },
];

const candidateInterviewTypes = [
  'phone',
  'video',
  'in_person',
  'technical',
  'hr',
  'panel',
  'assessment',
] as const;

const candidateInterviewModes = ['online', 'on_site', 'phone'] as const;
const EMPLOYER_FILTERS_STORAGE_KEY = 'employee-interviews-filters';

const isUuidV4 = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());

const toUtcIsoDate = (dateString: string) => new Date(`${dateString}T00:00:00.000Z`).toISOString();
const toUtcEndOfDay = (dateString: string) => new Date(`${dateString}T23:59:59.999Z`).toISOString();

const getInitialEmployerFilters = (
  initialFilters?: Partial<EmployerFilterValues>,
): EmployerFilterValues => ({
  ...interviewListFilterDefaultValues,
  ...initialFilters,
  fromDate: initialFilters?.fromDate ?? dayjs().format('YYYY-MM-DD'),
  jobName: initialFilters?.jobName ?? '',
  jobId: initialFilters?.jobId ?? '',
});

const getResetEmployerFilters = (
  initialFilters?: Partial<EmployerFilterValues>,
): EmployerFilterValues => ({
  ...interviewListFilterDefaultValues,
  ...initialFilters,
  fromDate: null,
  toDate: null,
  candidateName: '',
  jobName: '',
  jobId: '',
});

const getRowDisplayStatus = (interview: IInterview) => interview.status;

type InterviewActionKey = 'reschedule' | 'add_round' | 'complete' | 'cancel';

const InterviewActionsSelect = ({
  interview,
  onReschedule,
  onAddRound,
  onComplete,
  onCancel,
}: {
  interview: IInterview;
  onReschedule: () => void;
  onAddRound: () => void;
  onComplete: () => void;
  onCancel: () => void;
}) => {
  const [selectedKey, setSelectedKey] = useState('');
  const canUpdate = true;
  const canCreate = true;
  const { canComplete, canReschedule, canCancel, canAddRound } =
    getInterviewActionAvailability(interview, { canUpdate, canCreate });

  const handleSelectionChange = (keys: any) => {
    const action = Array.from(keys)[0] as InterviewActionKey | undefined;
    if (!action) return;

    setSelectedKey(action);

    if (action === 'reschedule') onReschedule();
    if (action === 'add_round') onAddRound();
    if (action === 'complete') onComplete();
    if (action === 'cancel') onCancel();

    setTimeout(() => setSelectedKey(''), 0);
  };

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Select
        aria-label="Interview actions"
        placeholder="Select"
        size="sm"
        selectedKeys={selectedKey ? new Set([selectedKey]) : new Set()}
        onSelectionChange={handleSelectionChange}
        className="w-[148px] min-w-[148px]"
        classNames={{
          base: 'w-full',
          trigger:
            'min-h-10 w-full rounded-xl bg-gray-50 border border-gray-200 px-3 hover:bg-gray-100 shadow-none',
          value: 'text-sm font-medium text-gray-700',
          innerWrapper: 'gap-2',
          selectorIcon: 'text-gray-500',
          popoverContent: 'min-w-[180px] rounded-xl border border-gray-200 shadow-xl',
        }}
      >
        {canReschedule ? <SelectItem key="reschedule">Reschedule</SelectItem> : null}
        {canAddRound ? <SelectItem key="add_round">Add round</SelectItem> : null}
        {canComplete ? <SelectItem key="complete">Mark as complete</SelectItem> : null}
        {canCancel ? <SelectItem key="cancel">Cancel</SelectItem> : null}
      </Select>
    </div>
  );
};

const InterviewListTable = ({ initialFilters }: Props) => {
  const router = useRouter();
  const role = useUserStore((state) => state.user?.role);
  const employerView = isEmployerRole(role);
  const { page, setPage, setTotalPages, renderPagination } = usePagination();
  const [loading, setLoading] = useState(false);
  const [interviews, setInterviews] = useState<IInterview[]>([]);

  const [employerFilters, setEmployerFilters] = useState<EmployerFilterValues>(() =>
    getInitialEmployerFilters(initialFilters),
  );
  const [filtersReady, setFiltersReady] = useState(false);

  const [candidateSegment, setCandidateSegment] = useState<CandidateSegment>('upcoming');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateInterviewType, setCandidateInterviewType] = useState('');
  const [candidateInterviewMode, setCandidateInterviewMode] = useState('');
  const [candidateFromDate, setCandidateFromDate] = useState('');
  const [candidateToDate, setCandidateToDate] = useState('');

  const [rescheduleModal, setRescheduleModal] = useState<any>({
    isOpen: false,
    data: null,
  });
  const [statusModal, setStatusModal] = useState<any>({
    isOpen: false,
    data: null,
    type: InterviewStatus.completed,
  });

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(EMPLOYER_FILTERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<EmployerFilterValues>;
        setEmployerFilters((current) => ({
          ...current,
          ...parsed,
          fromDate: parsed.fromDate ?? null,
          toDate: parsed.toDate ?? null,
          candidateName: parsed.candidateName ?? '',
          jobName: parsed.jobName ?? '',
          jobId: parsed.jobId ?? '',
          status: parsed.status ?? '',
        }));
      }
    } catch (error) {
      console.log(error);
    } finally {
      setFiltersReady(true);
    }
  }, []);

  useEffect(() => {
    if (!filtersReady) return;

    try {
      window.sessionStorage.setItem(EMPLOYER_FILTERS_STORAGE_KEY, JSON.stringify(employerFilters));
    } catch (error) {
      console.log(error);
    }
  }, [employerFilters, filtersReady]);

  const fetchInterviews = async () => {
    const params: Record<string, string | number> = {
      page,
      limit: 10,
    };

    if (employerView) {
      if (employerFilters.status) params.status = employerFilters.status;
      if (employerFilters.candidateName) params.candidateName = employerFilters.candidateName;
      if (employerFilters.fromDate) params.fromDate = toUtcIsoDate(employerFilters.fromDate);
      if (employerFilters.toDate) params.toDate = toUtcEndOfDay(employerFilters.toDate);
      if (employerFilters.jobName) params.jobName = employerFilters.jobName;
      if (employerFilters.jobId) params.jobId = employerFilters.jobId;
    } else {
      if (candidateSegment === 'completed') params.status = 'completed';
      if (candidateSegment === 'canceled') params.status = 'canceled';

      const trimmedSearch = candidateSearch.trim();
      if (trimmedSearch) {
        if (isUuidV4(trimmedSearch)) {
          params.jobId = trimmedSearch;
        } else {
          params.jobName = trimmedSearch;
        }
      }

      if (candidateFromDate) {
        params.fromDate = toUtcIsoDate(candidateFromDate);
      } else if (candidateSegment === 'upcoming') {
        params.fromDate = new Date().toISOString();
      }

      if (candidateToDate) params.toDate = toUtcEndOfDay(candidateToDate);
      if (candidateInterviewType) params.interviewType = candidateInterviewType;
      if (candidateInterviewMode) params.interviewMode = candidateInterviewMode;
    }

    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.INTERVIEWS.LIST, { params });
      if (response?.data) {
        setInterviews(response.data);
        setTotalPages(response?.pagination?.pageCount);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    employerView,
    employerFilters.status,
    employerFilters.fromDate,
    employerFilters.toDate,
    employerFilters.candidateName,
    employerFilters.jobName,
    employerFilters.jobId,
    candidateSegment,
    candidateSearch,
    candidateInterviewType,
    candidateInterviewMode,
    candidateFromDate,
    candidateToDate,
  ]);

  const handleRowClick = (interview: IInterview) => {
    if (employerView) {
      router.push(routePaths.employee.interviews.details(interview.id));
      return;
    }

    router.push(routePaths.interviews.rounds(interview.applicationId));
  };

  const renderCandidateControls = () => (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50/80 p-2">
        <Tabs
          selectedKey={candidateSegment}
          onSelectionChange={(key) => {
            setCandidateSegment(key as CandidateSegment);
            setPage(1);
          }}
          aria-label="Interview segments"
          color="primary"
          variant="underlined"
          classNames={{
            tabList: 'gap-6',
            cursor: 'w-full',
            tab: 'px-2',
          }}
        >
          {candidateSegments.map((item) => (
            <Tab key={item.key} title={item.label} />
          ))}
        </Tabs>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full min-w-0 lg:max-w-[320px] lg:flex-1">
          <Input
            value={candidateSearch}
            onValueChange={(value) => {
              setCandidateSearch(value);
              setPage(1);
            }}
            placeholder="Search by job title or job ID"
            labelPlacement="outside"
            startContent={<FiSearch size={16} className="text-gray-400" />}
            classNames={{ inputWrapper: 'bg-gray-50 border-gray-200 shadow-none' }}
          />
          {isUuidV4(candidateSearch) && (
            <p className="mt-1 text-xs font-medium text-primary">Searching by Job ID</p>
          )}
        </div>

        <div className="w-full min-w-[180px] lg:w-[220px]">
          <Select
            placeholder="All types"
            label="Interview type"
            labelPlacement="outside"
            selectedKeys={candidateInterviewType ? [candidateInterviewType] : []}
            onSelectionChange={(keys) => {
              setCandidateInterviewType(String(Array.from(keys)[0] || ''));
              setPage(1);
            }}
            classNames={{ trigger: 'bg-gray-50 border-gray-200 shadow-none' }}
          >
            {candidateInterviewTypes.map((type) => (
              <SelectItem key={type}>{CommonUtils.getInterviewTypeLabel(type)}</SelectItem>
            ))}
          </Select>
        </div>

        <div className="w-full min-w-[180px] lg:w-[220px]">
          <Select
            placeholder="All modes"
            label="Interview mode"
            labelPlacement="outside"
            selectedKeys={candidateInterviewMode ? [candidateInterviewMode] : []}
            onSelectionChange={(keys) => {
              setCandidateInterviewMode(String(Array.from(keys)[0] || ''));
              setPage(1);
            }}
            classNames={{ trigger: 'bg-gray-50 border-gray-200 shadow-none' }}
          >
            {candidateInterviewModes.map((mode) => (
              <SelectItem key={mode}>{CommonUtils.keyIntoTitle(mode)}</SelectItem>
            ))}
          </Select>
        </div>

        <div className="w-full min-w-[160px] lg:w-[180px]">
          <Input
            type="date"
            label="From"
            labelPlacement="outside"
            value={candidateFromDate}
            onValueChange={(value) => {
              setCandidateFromDate(value);
              setPage(1);
            }}
            classNames={{ inputWrapper: 'bg-gray-50 border-gray-200 shadow-none' }}
          />
        </div>

        <div className="w-full min-w-[160px] lg:w-[180px]">
          <Input
            type="date"
            label="To"
            labelPlacement="outside"
            value={candidateToDate}
            onValueChange={(value) => {
              setCandidateToDate(value);
              setPage(1);
            }}
            classNames={{ inputWrapper: 'bg-gray-50 border-gray-200 shadow-none' }}
          />
        </div>

        <div className="flex w-full items-end lg:w-auto">
          <Button
            variant="flat"
            color="default"
            startContent={<FiFilter size={16} />}
            onPress={() => {
              setCandidateSearch('');
              setCandidateInterviewType('');
              setCandidateInterviewMode('');
              setCandidateFromDate('');
              setCandidateToDate('');
              setCandidateSegment('upcoming');
              setPage(1);
            }}
            className="h-12 w-full min-w-[120px] px-5 font-semibold lg:w-auto"
          >
            Reset
          </Button>
        </div>
      </div>

      <p className="mt-3 text-xs font-medium text-gray-500">
        Filters apply to every tab. Upcoming defaults to future interviews when no from-date is
        selected.
      </p>
    </div>
  );

  const renderEmployerFilters = () => (
    <InterviewsListFilters
      filters={employerFilters}
      setFilters={setEmployerFilters}
      handleApply={() => setPage(1)}
      handleReset={() => {
        setEmployerFilters(getResetEmployerFilters(initialFilters));
        setPage(1);
      }}
    />
  );

  return (
    <>
      {employerView ? renderEmployerFilters() : renderCandidateControls()}

      <Table shadow="none">
        <TableHeader>
          {employerView ? <TableColumn>Candidate</TableColumn> : <TableColumn>Company</TableColumn>}
          <TableColumn>Job</TableColumn>
          <TableColumn>Round</TableColumn>
          <TableColumn>Interview Type</TableColumn>
          <TableColumn>Interview Mode</TableColumn>
          <TableColumn>Interview Date</TableColumn>
          <TableColumn>Current Status</TableColumn>
          <TableColumn
            align="center"
            className={employerView ? 'w-[160px] min-w-[160px]' : 'hidden'}
          >
            {employerView ? 'Actions' : ''}
          </TableColumn>
        </TableHeader>

        <TableBody
          isLoading={loading}
          emptyContent={'No rows to display.'}
          loadingContent={<LoadingProgress />}
        >
          {interviews.map((interview) => (
            <TableRow
              key={interview.id}
              className="cursor-pointer transition-colors hover:bg-gray-50/80"
              onClick={() => handleRowClick(interview)}
            >
              {employerView ? (
                <TableCell className="flex items-center gap-2">
                  <Avatar
                    src={interview?.candidateProfilePhoto || undefined}
                    name={interview?.candidateName || undefined}
                  />
                  <p>{interview?.candidateName || 'Unknown candidate'}</p>
                </TableCell>
              ) : (
                <TableCell className="flex items-center gap-2">
                  <Avatar
                    src={interview?.companyLogo || undefined}
                    name={interview?.companyName || interview?.jobTitle || undefined}
                  />
                  <p>{interview?.companyName || 'Unknown company'}</p>
                </TableCell>
              )}
              <TableCell>{interview?.jobTitle}</TableCell>
              <TableCell>
                {interview?.roundNumber ? `Round ${interview.roundNumber}` : '-'}
              </TableCell>
              <TableCell>{CommonUtils.keyIntoTitle(interview.interviewType)}</TableCell>
              <TableCell>{CommonUtils.keyIntoTitle(interview.interviewMode || '')}</TableCell>
              <TableCell>
                <TableDate date={interview.scheduledAt} />
              </TableCell>
              <TableCell>
                <TableStatus status={getRowDisplayStatus(interview)} />
              </TableCell>

              <TableCell
                align="right"
                className={
                  employerView
                    ? 'flex justify-end items-center gap-2 w-[160px] min-w-[160px]'
                    : 'hidden'
                }
              >
                {employerView ? (
                  <InterviewActionsSelect
                    interview={interview}
                    onReschedule={() => setRescheduleModal({ isOpen: true, data: interview })}
                    onAddRound={() =>
                      router.push(routePaths.employee.jobs.scheduleInterview(interview.applicationId))
                    }
                    onComplete={() =>
                      setStatusModal({
                        isOpen: true,
                        data: interview,
                        type: InterviewStatus.completed,
                      })
                    }
                    onCancel={() =>
                      setStatusModal({
                        isOpen: true,
                        data: interview,
                        type: 'cancel',
                      })
                    }
                  />
                ) : (
                  ''
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {renderPagination()}

      {employerView && rescheduleModal.isOpen && (
        <RescheduleInterviewDialog
          isOpen={rescheduleModal.isOpen}
          onClose={() => setRescheduleModal({ ...rescheduleModal, isOpen: false })}
          interview={rescheduleModal.data}
          refetch={fetchInterviews}
        />
      )}

      {employerView && statusModal.isOpen && statusModal.type === 'completed' && (
        <CompleteInterviewDialog
          isOpen={statusModal.isOpen}
          onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
          interview={statusModal.data}
          refetch={fetchInterviews}
        />
      )}

      {employerView && statusModal.isOpen && statusModal.type === 'cancel' && (
        <CancelInterviewDialog
          isOpen={statusModal.isOpen}
          onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
          interview={statusModal.data}
          refetch={fetchInterviews}
        />
      )}
    </>
  );
};

export default InterviewListTable;
