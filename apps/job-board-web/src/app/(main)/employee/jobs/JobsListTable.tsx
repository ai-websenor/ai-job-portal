'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import TableDate from '@/app/components/table/TableDate';
import TableStatus from '@/app/components/table/TableStatus';
import routePaths from '@/app/config/routePaths';
import usePagination from '@/app/hooks/usePagination';
import { IJob } from '@/app/types/types';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IoMdMore } from 'react-icons/io';

const JobsListTable = () => {
  const router = useRouter();
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [loading, setLoading] = useState(false);
  const { page, setTotalPages, renderPagination } = usePagination();

  const getJobs = async () => {
    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.EMPLOYER.JOBS.LIST, {
        params: {
          page,
          limit: 10,
        },
      });
      if (response?.data) {
        setJobs(response?.data);
        setTotalPages(response?.pagination?.pageCount);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getJobs();
  }, [page]);

  return (
    <div>
      <Table shadow="none">
        <TableHeader>
          <TableColumn>Job</TableColumn>
          <TableColumn>Applications</TableColumn>
          <TableColumn>Status</TableColumn>
          <TableColumn>Posted Date</TableColumn>
        </TableHeader>
        <TableBody
          isLoading={loading}
          emptyContent={'No rows to display.'}
          loadingContent={<LoadingProgress />}
        >
          {jobs.map((job, index) => (
            <TableRow key={index}>
              <TableCell>
                <p>{job?.title}</p>
                <p className="text-gray-400 text-xs pl-4 mt-1 flex gap-1">
                  {/* <li className="list-disc">{job?.remaining}</li> */}
                  <span>- {job.jobType}</span>
                </p>
              </TableCell>
              <TableCell>
                <TableStatus status={job?.status} />
              </TableCell>
              <TableCell>
                <TableDate date={job?.createdAt} />
              </TableCell>
              <TableCell align="right" className="flex justify-end items-center gap-2">
                <Button
                  size="sm"
                  color="primary"
                  variant="bordered"
                  onPress={() =>
                    `${router.push(routePaths.employee.jobs.applications('uid'))}?job=${job?.title}`
                  }
                >
                  View Application
                </Button>
                <Button size="sm" isIconOnly variant="light">
                  <IoMdMore size={20} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {renderPagination()}
    </div>
  );
};

export default JobsListTable;
