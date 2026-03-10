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
  Button,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tooltip,
} from '@heroui/react';
import { useEffect, useState } from 'react';
import { HiCheck, HiRefresh } from 'react-icons/hi';
import { MdClose } from 'react-icons/md';

const InterviewListTable = () => {
  const [loading, setLoading] = useState(false);
  const [interviews, setInterviews] = useState<IInterview[]>([]);
  const { page, setTotalPages, renderPagination } = usePagination();

  const [rescheduleModal, setRescheduleModal] = useState<any>({
    isOpen: false,
    data: null,
  });

  const [statusModal, setStatusModal] = useState<any>({
    isOpen: false,
    data: null,
    type: InterviewStatus.completed,
  });

  const getInterviews = async () => {
    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.EMPLOYER.INTERVIEWS.LIST, {
        params: {
          page,
          limit: 10,
        },
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
    <div>
      <Table shadow="none">
        <TableHeader>
          <TableColumn>Candidate</TableColumn>
          <TableColumn>Job</TableColumn>
          <TableColumn>Interview Type</TableColumn>
          <TableColumn>Interview Mode</TableColumn>
          <TableColumn>Interview Date</TableColumn>
          <TableColumn>Status</TableColumn>
          <TableColumn align="end">Actions</TableColumn>
        </TableHeader>

        <TableBody
          isLoading={loading}
          emptyContent={'No rows to display.'}
          loadingContent={<LoadingProgress />}
        >
          {interviews?.map((interview) => (
            <TableRow key={interview.id}>
              <TableCell className="flex items-center gap-2">
                <Avatar src={interview?.candidateProfilePhoto} name={interview?.candidateName} />
                <p>{interview?.candidateName}</p>
              </TableCell>
              <TableCell>{interview?.jobTitle}</TableCell>
              <TableCell>{CommonUtils.keyIntoTitle(interview.interviewType)}</TableCell>
              <TableCell>{CommonUtils.keyIntoTitle(interview.interviewMode)}</TableCell>
              <TableCell>
                <TableDate date={interview.scheduledAt} />
              </TableCell>
              <TableCell>
                <TableStatus status={interview.status} />
              </TableCell>

              <TableCell align="right" className="flex justify-end items-center gap-2">
                {permissionUtils.hasPermission('interviews:update') && (
                  <>
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

                    {interview.status === InterviewStatus.scheduled && (
                      <>
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
                      </>
                    )}

                    {interview.status === InterviewStatus.scheduled && (
                      <>
                        <Tooltip content="Cancel" size="sm" color="danger" delay={500}>
                          <Button
                            isIconOnly
                            size="sm"
                            color="danger"
                            variant="flat"
                            onPress={() =>
                              setStatusModal({ isOpen: true, data: interview, type: 'cancel' })
                            }
                          >
                            <MdClose size={18} />
                          </Button>
                        </Tooltip>
                      </>
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
    </div>
  );
};

export default InterviewListTable;
