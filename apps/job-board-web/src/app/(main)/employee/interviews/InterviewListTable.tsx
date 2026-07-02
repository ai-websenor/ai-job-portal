'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import CancelInterviewDialog from '@/app/components/dialogs/CancelInterviewDialog';
import CompleteInterviewDialog from '@/app/components/dialogs/CompleteInterviewDialog';
import RescheduleInterviewDialog from '@/app/components/dialogs/RescheduleInterviewDialog';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import TablePagination from '@/app/components/table/TablePagination';
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
  DateRangePicker,
  Input,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Chip,
} from '@heroui/react';
import { I18nProvider } from '@react-aria/i18n';
import { parseDate } from '@internationalized/date';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useEffect, useState } from 'react';
import { FiCalendar, FiFilter, FiMonitor, FiPhone, FiSearch, FiMapPin } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { IoBriefcaseOutline } from 'react-icons/io5';

dayjs.extend(isSameOrBefore);

type Props = {
  initialFilters?: Partial<EmployerFilterValues>;
};

type EmployerFilterValues = {
  status: string;
  interviewMode: string;
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

const candidateInterviewTypes = ['technical', 'hr', 'panel', 'assessment'] as const;
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
  fromDate: initialFilters?.fromDate ?? null,
  toDate: initialFilters?.toDate ?? null,
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

const getInterviewModeIcon = (mode?: string | null) => {
  switch (mode?.toLowerCase()) {
    case 'online':
      return <FiMonitor className="shrink-0 text-default-400" size={14} />;
    case 'phone':
      return <FiPhone className="shrink-0 text-default-400" size={14} />;
    case 'on_site':
      return <FiMapPin className="shrink-0 text-default-400" size={14} />;
    default:
      return null;
  }
};

const getInterviewTypeLabel = (value?: string | null) =>
  value ? CommonUtils.getInterviewTypeLabel(value) : '-';

const getInterviewModeLabel = (value?: string | null) =>
  value ? CommonUtils.keyIntoTitle(value) : '-';

const getInterviewDetails = (interview: IInterview) => {
  const roundLabel = `Round ${interview.roundNumber ?? '-'}`;
  const typeLabel = getInterviewTypeLabel(interview.interviewType);
  const modeLabel = getInterviewModeLabel(interview.interviewMode);

  return { roundLabel, typeLabel, modeLabel };
};

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
  const { page, setPage, setTotalPages } = usePagination();
  const [loading, setLoading] = useState(false);
  const [interviews, setInterviews] = useState<IInterview[]>([]);
  const [totalInterviews, setTotalInterviews] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const [employerFilters, setEmployerFilters] = useState<EmployerFilterValues>(() =>
    getInitialEmployerFilters(initialFilters),
  );
  const [filtersReady, setFiltersReady] = useState(false);

  const [candidateSegment, setCandidateSegment] = useState<CandidateSegment>('upcoming');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateInterviewType, setCandidateInterviewType] = useState('');
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
          interviewMode: parsed.interviewMode ?? '',
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
      if (employerFilters.interviewMode) params.interviewMode = employerFilters.interviewMode;
      if (employerFilters.candidateName) params.candidateName = employerFilters.candidateName;
      if (employerFilters.fromDate) params.fromDate = toUtcIsoDate(employerFilters.fromDate);
      if (employerFilters.toDate) params.toDate = toUtcEndOfDay(employerFilters.toDate);
      if (employerFilters.jobName) params.jobName = employerFilters.jobName;
      if (employerFilters.jobId) params.jobId = employerFilters.jobId;
    } else {
      if (candidateSegment === 'upcoming') params.status = 'upcoming';
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

      if (candidateFromDate) params.fromDate = toUtcIsoDate(candidateFromDate);

      if (candidateToDate) params.toDate = toUtcEndOfDay(candidateToDate);
      if (candidateInterviewType) params.interviewType = candidateInterviewType;
    }

    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.INTERVIEWS.LIST, { params });
      if (response?.data) {
        setInterviews(response.data);
        const nextPageCount = response?.pagination?.pageCount ?? 1;
        setTotalPages(nextPageCount);
        setPageCount(nextPageCount);
        setTotalInterviews(response?.pagination?.totalInterviews ?? response?.data?.length ?? 0);
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
    employerFilters.interviewMode,
    employerFilters.fromDate,
    employerFilters.toDate,
    employerFilters.candidateName,
    employerFilters.jobName,
    employerFilters.jobId,
    candidateSegment,
    candidateSearch,
    candidateInterviewType,
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-wrap items-end gap-3">
          <div className="w-full min-w-[180px] lg:w-[220px]">
            <Select
              label="All Status"
              labelPlacement="outside"
              placeholder="All Status"
              selectedKeys={candidateSegment ? [candidateSegment] : []}
              onSelectionChange={(keys) => {
                setCandidateSegment(Array.from(keys)[0] as CandidateSegment);
                setPage(1);
              }}
              classNames={{
                label: 'font-semibold text-gray-600',
                trigger: 'bg-gray-50 shadow-none hover:bg-gray-100',
              }}
            >
              {candidateSegments.map((item) => (
                <SelectItem key={item.key}>{item.label}</SelectItem>
              ))}
            </Select>
          </div>

          <div className="min-w-[260px] flex-[1.5] lg:max-w-[360px]">
            <I18nProvider locale="en-GB">
              <DateRangePicker
                label={
                  <span className="inline-flex items-center gap-1.5">
                    <FiCalendar size={14} />
                    Date Range
                  </span>
                }
                labelPlacement="outside"
                value={
                  candidateFromDate && candidateToDate
                    ? {
                        start: parseDate(candidateFromDate),
                        end: parseDate(candidateToDate),
                      }
                    : null
                }
                onChange={(value: any) => {
                  if (!value) {
                    setCandidateFromDate('');
                    setCandidateToDate('');
                    setPage(1);
                    return;
                  }

                  setCandidateFromDate(value.start ? value.start.toString() : '');
                  setCandidateToDate(value.end ? value.end.toString() : '');
                  setPage(1);
                }}
                hideTimeZone
                showMonthAndYearPickers
                classNames={{
                  label: 'font-semibold text-gray-600',
                  inputWrapper: 'bg-gray-50 shadow-none hover:bg-gray-100',
                  separator: 'text-gray-400',
                  selectorButton: 'text-gray-500',
                }}
              />
            </I18nProvider>
          </div>

          <div className="min-w-[180px] flex-1 lg:max-w-[240px]">
            <Select
              label="All Interview Types"
              labelPlacement="outside"
              placeholder="All Interview Types"
              selectedKeys={candidateInterviewType ? [candidateInterviewType] : []}
              onSelectionChange={(keys) => {
                setCandidateInterviewType(String(Array.from(keys)[0] || ''));
                setPage(1);
              }}
              classNames={{
                label: 'font-semibold text-gray-600',
                trigger: 'bg-gray-50 shadow-none hover:bg-gray-100',
              }}
            >
              {candidateInterviewTypes.map((type) => (
                <SelectItem key={type}>
                  {type === 'technical'
                    ? 'Technical'
                    : type === 'hr'
                      ? 'HR'
                      : type === 'panel'
                        ? 'Panel'
                        : 'Assessment'}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2 pb-0.5">
            <Button
              size="sm"
              variant="flat"
              color="default"
              startContent={<FiFilter size={14} />}
              onPress={() => {
                setCandidateSearch('');
                setCandidateInterviewType('');
                setCandidateFromDate('');
                setCandidateToDate('');
                setCandidateSegment('upcoming');
                setPage(1);
              }}
              className="font-medium px-4 text-primary"
            >
              Reset
            </Button>
          </div>
        </div>

        <div className="w-full lg:max-w-[360px] lg:shrink-0">
          <Input
            value={candidateSearch}
            onValueChange={(value) => {
              setCandidateSearch(value);
              setPage(1);
            }}
            placeholder="Search by job title or job ID"
            labelPlacement="outside"
            startContent={<FiSearch size={16} className="text-gray-400" />}
            classNames={{
              label: 'font-semibold text-gray-600',
              inputWrapper: 'bg-gray-50 border border-gray-200 shadow-none hover:bg-gray-100',
            }}
          />
          {isUuidV4(candidateSearch) && (
            <p className="mt-1 text-xs font-medium text-primary">Searching by Job ID</p>
          )}
        </div>
      </div>

    </div>
  );

  const renderEmployerFilters = () => (
    <InterviewsListFilters
      filters={employerFilters}
      setFilters={setEmployerFilters}
      handleReset={() => {
        setEmployerFilters(getResetEmployerFilters(initialFilters));
        setPage(1);
      }}
    />
  );

  return (
    <>
      {employerView ? renderEmployerFilters() : renderCandidateControls()}

      <div className="mt-4 overflow-hidden rounded-xl border border-default-200 bg-white">
        <Table
          shadow="none"
          className="w-full table-fixed"
          classNames={{
            wrapper: 'rounded-none bg-transparent shadow-none',
            th: 'bg-default-100 text-default-700 font-semibold text-sm h-12',
            td: 'py-5',
          }}
        >
          <TableHeader>
            <TableColumn className="uppercase">
              {employerView ? 'Candidate' : 'Company'}
            </TableColumn>
            <TableColumn className="w-[18%] uppercase">Position</TableColumn>
            <TableColumn className="uppercase">Interview Details</TableColumn>
            <TableColumn className="uppercase">Interview Date</TableColumn>
            <TableColumn className="uppercase">Status</TableColumn>
            <TableColumn
              align="center"
              className={`uppercase ${employerView ? 'w-[160px] min-w-[160px]' : 'hidden'}`}
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
                className="
                  border-b
                  border-default-200
                  transition-all
                  duration-200
                  hover:bg-primary-50
                  hover:shadow-sm
                  cursor-pointer
                "
                onClick={() => handleRowClick(interview)}
              >
                {employerView ? (
                  <TableCell className="whitespace-nowrap">
                    <div className="flex min-w-[180px] items-center gap-3">
                      <Avatar
                        src={interview?.candidateProfilePhoto || undefined}
                        name={interview?.candidateName || undefined}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-default-900">
                          {interview?.candidateName || 'Unknown candidate'}
                        </p>
                        <p className="text-xs text-gray-500">Candidate</p>
                      </div>
                    </div>
                  </TableCell>
                ) : (
                  <TableCell className="whitespace-nowrap">
                    <div className="flex min-w-[180px] items-center gap-3">
                      <Avatar
                        src={interview?.companyLogo || undefined}
                        name={interview?.companyName || interview?.jobTitle || undefined}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-default-900">
                          {interview?.companyName || 'Unknown company'}
                        </p>
                        <p className="text-xs text-gray-500">Company</p>
                      </div>
                    </div>
                  </TableCell>
                )}
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary">
                      <IoBriefcaseOutline size={17} />
                    </div>
                    <span className="truncate font-medium text-default-900">
                      {interview?.jobTitle}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    {(() => {
                      const { roundLabel, typeLabel, modeLabel } = getInterviewDetails(interview);
                      return (
                        <>
                          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-default-900">
                            <span>{roundLabel}</span>
                            <span className="text-default-400">•</span>
                            <span>{typeLabel}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-default-600">
                            {getInterviewModeIcon(interview.interviewMode)}
                            <span>{modeLabel}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-start gap-2">
                    <FiCalendar className="mt-1 shrink-0 text-default-400" size={14} />
                    <div>
                      <p className="font-medium leading-5 text-default-900">
                        {dayjs(interview.scheduledAt).format('DD MMM YYYY')}
                      </p>
                      <p className="text-xs leading-4 text-default-400">
                        {dayjs(interview.scheduledAt).format('hh:mm A')}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {(() => {
                    const rowStatus = getRowDisplayStatus(interview);
                    const statusColor = CommonUtils.getStatusColor(rowStatus);
                    const isScheduled =
                      rowStatus === InterviewStatus.scheduled ||
                      rowStatus === InterviewStatus.interview_scheduled;
                    const isRescheduled =
                      rowStatus === InterviewStatus.rescheduled ||
                      rowStatus === InterviewStatus.interview_rescheduled;

                    return (
                      <Chip
                        size="sm"
                        variant="flat"
                        color={statusColor}
                        className={`font-medium ${
                          isScheduled
                            ? 'border border-primary-200 bg-primary-50 text-primary'
                            : isRescheduled
                              ? 'border border-secondary/20 bg-secondary text-primary'
                              : ''
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-current" />
                          {CommonUtils.getInterviewStatusLabel(rowStatus)}
                        </span>
                      </Chip>
                    );
                  })()}
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
                        router.push(
                          routePaths.employee.jobs.scheduleInterview(interview.applicationId),
                        )
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
        {totalInterviews > 0 && (
          <TablePagination
            label="interviews"
            totalItems={totalInterviews}
            currentPage={page}
            totalPages={Math.max(1, pageCount)}
            pageSize={10}
            onPageChange={setPage}
          />
        )}
      </div>

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

