'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import ConfirmationDialog from '@/app/components/dialogs/ConfirmationDialog';
import RescheduleInterviewDialog from '@/app/components/dialogs/RescheduleInterviewDialog';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import TableDate from '@/app/components/table/TableDate';
import TableStatus from '@/app/components/table/TableStatus';
import usePagination from '@/app/hooks/usePagination';
import { InterviewStatus } from '@/app/types/enum';
import { IInterview } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import {
  addToast,
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
import { IoMdClose } from 'react-icons/io';

const InterviewListTable = () => {
  const [loading, setLoading] = useState(false);
  const [interviews, setInterviews] = useState<IInterview[]>([]);
  const { page, setTotalPages, renderPagination } = usePagination();

  const [rescheduleModal, setRescheduleModal] = useState<any>({
    isOpen: false,
    data: null,
  });

  const [confirmationModal, setConfirmationModal] = useState<any>({
    type: '',
    data: null,
    isOpen: false,
    message: '',
    variant: 'danger',
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

  const clickOnAction = (type: string, data: IInterview) => {
    setConfirmationModal({
      type,
      data,
      isOpen: true,
      variant: type === InterviewStatus.hired ? 'success' : 'danger',
      message: `Are you sure you want to ${type} ${data.application?.jobSeeker?.firstName} ${data.application?.jobSeeker?.lastName}?`,
    });
  };

  const handleChangeStatus = async () => {
    try {
      setLoading(true);
      await http.put(
        ENDPOINTS.EMPLOYER.INTERVIEWS.UPDATE_STATUS(confirmationModal.data.application.id),
        {
          status: confirmationModal.type,
        },
      );
      addToast({
        title: 'Success',
        color: 'success',
        description: 'Status updated successfully',
      });
      getInterviews();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

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
              <TableCell>
                <p>{`${interview?.application?.jobSeeker?.firstName} ${interview?.application?.jobSeeker?.lastName}`}</p>
                <p className="text-xs text-default-400">
                  {interview?.application?.jobSeeker?.email}
                </p>
              </TableCell>
              <TableCell>{interview?.application?.job?.title}</TableCell>
              <TableCell>{CommonUtils.keyIntoTitle(interview.interviewType)}</TableCell>
              <TableCell>{CommonUtils.keyIntoTitle(interview.interviewMode)}</TableCell>
              <TableCell>
                <TableDate date={interview.scheduledAt} />
              </TableCell>
              <TableCell>
                <TableStatus status={interview.application.status} />
              </TableCell>
              <TableCell align="right" className="flex justify-end items-center gap-2">
                <Tooltip content="Reschedule" size="sm" delay={500} closeDelay={0}>
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

                {interview.application.status === InterviewStatus.interview_scheduled && (
                  <>
                    <Tooltip content="Reject" size="sm" color="danger" delay={500}>
                      <Button
                        isIconOnly
                        size="sm"
                        color="danger"
                        variant="flat"
                        onPress={() => clickOnAction(InterviewStatus.rejected, interview)}
                      >
                        <IoMdClose size={18} />
                      </Button>
                    </Tooltip>

                    <Tooltip content="Hire" size="sm" color="success" delay={500}>
                      <Button
                        isIconOnly
                        size="sm"
                        color="success"
                        variant="flat"
                        onPress={() => clickOnAction(InterviewStatus.hired, interview)}
                      >
                        <HiCheck size={18} />
                      </Button>
                    </Tooltip>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {renderPagination()}

      {confirmationModal.isOpen && (
        <ConfirmationDialog
          onConfirm={handleChangeStatus}
          isOpen={confirmationModal.isOpen}
          message={confirmationModal.message}
          title={`${CommonUtils.keyIntoTitle(confirmationModal.type)}`}
          onClose={() => setConfirmationModal({ ...confirmationModal, isOpen: false })}
        />
      )}

      {rescheduleModal.isOpen && (
        <RescheduleInterviewDialog
          isOpen={rescheduleModal.isOpen}
          onClose={() => setRescheduleModal({ ...rescheduleModal, isOpen: false })}
          interview={rescheduleModal.data}
          refetch={getInterviews}
        />
      )}
    </div>
  );
};

export default InterviewListTable;
