'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import TableDate from '@/app/components/table/TableDate';
import TableStatus from '@/app/components/table/TableStatus';
import usePagination from '@/app/hooks/usePagination';
import { IInterview } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react';
import { useEffect, useState } from 'react';

const InterviewListTable = () => {
  const [loading, setLoading] = useState(false);
  const [interviews, setInterviews] = useState<IInterview[]>([]);
  const { page, setTotalPages, renderPagination } = usePagination();

  const getInterviews = async () => {
    try {
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
              <TableCell>
                <p>{`${interview?.application?.jobSeeker?.firstName} ${interview?.application?.jobSeeker?.lastName}`}</p>
                <p className="text-xs text-default-500">
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
                <TableStatus status={interview.status} />
              </TableCell>
              <TableCell align="right" className="flex justify-end items-center gap-2">
                test
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {renderPagination()}
    </div>
  );
};

export default InterviewListTable;
