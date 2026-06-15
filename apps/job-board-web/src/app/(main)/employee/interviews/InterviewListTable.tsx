'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import CancelInterviewDialog from '@/app/components/dialogs/CancelInterviewDialog';
import CompleteInterviewDialog from '@/app/components/dialogs/CompleteInterviewDialog';
import RescheduleInterviewDialog from '@/app/components/dialogs/RescheduleInterviewDialog';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import TableDate from '@/app/components/table/TableDate';
import TableStatus from '@/app/components/table/TableStatus';
import usePagination from '@/app/hooks/usePagination';
import { InterviewStatus } from '@/app/types/enum';
import { IInterview } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import permissionUtils from '@/app/utils/permissionUtils';
import {
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Select,
  SelectItem,
} from '@heroui/react';
import { useEffect, useState } from 'react';
import InterviewsListFilters from './InterviewsListFilters';
import { interviewListFilterDefaultValues } from '@/app/config/data';
import dayjs from 'dayjs';
import routePaths from '@/app/config/routePaths';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { getLocalTimeZone, today } from '@internationalized/date';
import { useRouter } from 'next/navigation';

dayjs.extend(isSameOrBefore);

type Props = {
  initialFilters?: Partial<InterviewListFilterValues>;
};

type InterviewListFilterValues = {
  status: string;
  fromDate: string | null;
  toDate: string | null;
  candidateName: string;
};

const getInitialFilters = (
  initialFilters?: Partial<InterviewListFilterValues>,
): InterviewListFilterValues => ({
  ...interviewListFilterDefaultValues,
  ...initialFilters,
  fromDate: initialFilters?.fromDate ?? today(getLocalTimeZone()).toString(),
});

const getResetFilters = (
  initialFilters?: Partial<InterviewListFilterValues>,
): InterviewListFilterValues => ({
  ...interviewListFilterDefaultValues,
  ...initialFilters,
  fromDate: null,
  toDate: null,
});

const toUtcIsoDate = (dateString: string) => new Date(`${dateString}T00:00:00.000Z`).toISOString();

type InterviewActionKey = 'reschedule' | 'complete' | 'cancel';

const InterviewActionsSelect = ({
  interview,
  onReschedule,
  onComplete,
  onCancel,
}: {
  interview: IInterview;
  onReschedule: () => void;
  onComplete: () => void;
  onCancel: () => void;
}) => {
  const [selectedKey, setSelectedKey] = useState('');

  const canUpdate = permissionUtils.hasPermission('interviews:update');
  const isFutureInterview = dayjs(interview?.scheduledAt || interview?.rescheduledAt || undefined).isAfter(dayjs());
  const isPastOrNowInterview = dayjs(interview?.scheduledAt || interview?.rescheduledAt || undefined).isSameOrBefore(dayjs());
  const canComplete =
    (interview.status === InterviewStatus.scheduled || interview.status === InterviewStatus.rescheduled) &&
    isPastOrNowInterview;
  const canReschedule =
    (interview.status === InterviewStatus.scheduled || interview.status === InterviewStatus.rescheduled) &&
    isFutureInterview;
  const canCancel =
    (interview.status === InterviewStatus.scheduled || interview.status === InterviewStatus.rescheduled) &&
    isFutureInterview;

  const handleSelectionChange = (keys: any) => {
    const action = Array.from(keys)[0] as InterviewActionKey | undefined;
    if (!action) return;

    setSelectedKey(action);

    if (action === 'reschedule') {
      onReschedule();
    }

    if (action === 'complete') {
      onComplete();
    }

    if (action === 'cancel') {
      onCancel();
    }

    setTimeout(() => setSelectedKey(''), 0);
  };

  if (!canUpdate) {
    return null;
  }

  return (
    <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
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
        {canComplete ? <SelectItem key="complete">Mark as complete</SelectItem> : null}
        {canCancel ? <SelectItem key="cancel">Cancel</SelectItem> : null}
      </Select>
    </div>
  );
};

const InterviewListTable = ({ initialFilters }: Props) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [interviews, setInterviews] = useState<IInterview[]>([]);
  const { page, setTotalPages, renderPagination } = usePagination();
  const [filters, setFilters] = useState<InterviewListFilterValues>(() =>
    getInitialFilters(initialFilters),
  );

  const [rescheduleModal, setRescheduleModal] = useState<any>({
    isOpen: false,
    data: null,
  });

  const [statusModal, setStatusModal] = useState<any>({
    isOpen: false,
    data: null,
    type: InterviewStatus.completed,
  });

  const handleRowClick = (interviewId: string) => {
    router.push(routePaths.employee.interviews.details(interviewId));
  };

  const getInterviews = async (manualFilters?: any) => {
    const params: any = { page, limit: 10 };

    const activeFilters = manualFilters || filters;

    for (const key in activeFilters) {
      const value = activeFilters?.[key as keyof typeof interviewListFilterDefaultValues];
      if (value) {
        if (key === 'fromDate' || key === 'toDate') {
          params[key] = toUtcIsoDate(value);
        } else {
          params[key] = value;
        }
      }
    }

    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.EMPLOYER.INTERVIEWS.LIST, {
        params,
      });
      if (response?.data) {
        setInterviews(response?.data);
        setTotalPages(response?.pagination?.pageCount);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getInterviews();
  }, [page]);

  return (
    <>
      <InterviewsListFilters
        filters={filters}
        setFilters={setFilters}
        handleApply={getInterviews}
        handleReset={() => {
          const resetFilters = getResetFilters(initialFilters);
          setFilters(resetFilters);
          getInterviews(resetFilters);
        }}
      />

      <Table shadow="none">
        <TableHeader>
          <TableColumn>Candidate</TableColumn>
          <TableColumn>Job</TableColumn>
          <TableColumn>Interview Type</TableColumn>
          <TableColumn>Interview Mode</TableColumn>
          <TableColumn>Interview Date</TableColumn>
          <TableColumn>Current Status</TableColumn>
          <TableColumn align="center" className="w-[160px] min-w-[160px]">
            Actions
          </TableColumn>
        </TableHeader>

        <TableBody
          isLoading={loading}
          emptyContent={'No rows to display.'}
          loadingContent={<LoadingProgress />}
        >
          {interviews?.map((interview) => (
            <TableRow
              key={interview.id}
              className="cursor-pointer transition-colors hover:bg-gray-50/80"
              onClick={() => handleRowClick(interview.id)}
            >
              <TableCell className="flex items-center gap-2">
                <Avatar
                  src={interview?.candidateProfilePhoto || undefined}
                  name={interview?.candidateName || undefined}
                />
                <p>{interview?.candidateName || 'Unknown candidate'}</p>
              </TableCell>
              <TableCell>{interview?.jobTitle}</TableCell>
              <TableCell>
                {CommonUtils.interviewTypeLabel(interview.interviewType, interview.customType)}
                {interview.roundName ? (
                  <span className="block text-xs text-default-400">{interview.roundName}</span>
                ) : null}
              </TableCell>
              <TableCell>{CommonUtils.keyIntoTitle(interview.interviewMode)}</TableCell>
              <TableCell>
                <TableDate date={interview.scheduledAt} />
              </TableCell>
              <TableCell>
                <TableStatus status={interview.status} />
              </TableCell>

              <TableCell align="right" className="flex justify-end items-center gap-2">
                <Button
                  size="sm"
                  variant="flat"
                  color="default"
                  isIconOnly
                  as={Link}
                  href={routePaths.employee.interviews.details(interview.id)}
                >
                  <IoEyeOutline size={14} />
                </Button>

                {permissionUtils.hasPermission('interviews:update') && (
                  <>
                    {dayjs(interview?.scheduledAt || interview?.rescheduledAt).isAfter(dayjs()) && (
                      <Tooltip
                        content="Reschedule"
                        color="primary"
                        size="sm"
                        delay={500}
                        closeDelay={0}
                      >
                        <Button
                          isIconOnly
                          size="sm"
                          color="primary"
                          variant="flat"
                          onPress={() => setRescheduleModal({ isOpen: true, data: interview })}
                        >
                          <HiRefresh size={18} />
                        </Button>
                      </Tooltip>
                    )}

                    {(interview.status === InterviewStatus.scheduled ||
                      interview.status === InterviewStatus.rescheduled) &&
                      dayjs(interview.scheduledAt || interview.rescheduledAt).isSameOrBefore(
                        dayjs(),
                      ) && (
                        <Tooltip
                          content="Mark as complete"
                          size="sm"
                          color="success"
                          className="text-white"
                          delay={500}
                        >
                          <Button
                            isIconOnly
                            size="sm"
                            color="success"
                            variant="flat"
                            onPress={() =>
                              setStatusModal({
                                isOpen: true,
                                data: interview,
                                type: InterviewStatus.completed,
                              })
                            }
                          >
                            <HiCheck size={18} />
                          </Button>
                        </Tooltip>
                      )}

                    {(interview.status === InterviewStatus.scheduled ||
                      interview.status === InterviewStatus.rescheduled) &&
                      dayjs(interview?.scheduledAt || interview?.rescheduledAt).isAfter(
                        dayjs(),
                      ) && (
                        <Tooltip content="Cancel" size="sm" color="danger" delay={500}>
                          <Button
                            isIconOnly
                            size="sm"
                            color="danger"
                            variant="flat"
                            onPress={() =>
                              setStatusModal({
                                isOpen: true,
                                data: interview,
                                type: 'cancel',
                              })
                            }
                          >
                            <MdClose size={18} />
                          </Button>
                        </Tooltip>
                      )}
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {renderPagination()}

      {rescheduleModal.isOpen && (
        <RescheduleInterviewDialog
          isOpen={rescheduleModal.isOpen}
          onClose={() => setRescheduleModal({ ...rescheduleModal, isOpen: false })}
          interview={rescheduleModal.data}
          refetch={getInterviews}
        />
      )}

      {statusModal.isOpen && statusModal.type === 'completed' ? (
        <CompleteInterviewDialog
          isOpen={statusModal.isOpen}
          onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
          interview={statusModal.data}
          refetch={getInterviews}
        />
      ) : (
        <CancelInterviewDialog
          isOpen={statusModal.isOpen}
          onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
          interview={statusModal.data}
          refetch={getInterviews}
        />
      )}
    </>
  );
};

export default InterviewListTable;
