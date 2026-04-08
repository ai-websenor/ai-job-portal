'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import ConfirmationDialog from '@/app/components/dialogs/ConfirmationDialog';
import FeaturedJobTag from '@/app/components/lib/FeaturedJobTag';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import PublishJobButton from '@/app/components/lib/PublishJobButton';
import TableDate from '@/app/components/table/TableDate';
import routePaths from '@/app/config/routePaths';
import usePagination from '@/app/hooks/usePagination';
import { IJob } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import permissionUtils from '@/app/utils/permissionUtils';
import {
  addToast,
  Button,
  Chip,
  Input,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiEdit } from 'react-icons/fi';
import { IoIosSearch } from 'react-icons/io';
import { IoEyeOutline } from 'react-icons/io5';
import { MdOutlineDeleteOutline } from 'react-icons/md';

const JobsListTable = () => {
  const router = useRouter();
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [loading, setLoading] = useState(false);
  const { page, setTotalPages, renderPagination } = usePagination();
  const [debounceTime, setDebounceTime] = useState<NodeJS.Timeout | null>(null);
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: '',
  });

  const getJobs = async (search?: string) => {
    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.EMPLOYER.JOBS.LIST, {
        params: {
          page,
          limit: 10,
          search,
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

  const handleDelete = async () => {
    try {
      await http.delete(ENDPOINTS.EMPLOYER.JOBS.DELETE(deleteModal.id));
      getJobs();
      addToast({
        title: 'Success',
        color: 'success',
        description: 'Job deleted successfully',
      });
      setDeleteModal({
        show: false,
        id: '',
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleSearch = (search: string) => {
    if (debounceTime) {
      clearTimeout(debounceTime);
    }
    setDebounceTime(
      setTimeout(() => {
        getJobs(search?.trim());
      }, 1500),
    );
  };

  return (
    <div>
      <Input
        onChange={(ev) => handleSearch(ev.target.value)}
        labelPlacement="outside"
        placeholder="Search by job title"
        startContent={<IoIosSearch size={16} />}
        classNames={{
          inputWrapper: 'bg-white border',
        }}
      />

      <Table shadow="none" className="mt-3">
        <TableHeader>
          <TableColumn>Job</TableColumn>
          <TableColumn>Category</TableColumn>
          <TableColumn>Salary</TableColumn>
          <TableColumn>Status</TableColumn>
          <TableColumn>Posted Date</TableColumn>
          <TableColumn align="end">Actions</TableColumn>
        </TableHeader>
        <TableBody
          isLoading={loading}
          emptyContent={'No rows to display.'}
          loadingContent={<LoadingProgress />}
        >
          {jobs.map((item, index) => {
            const isExpired = dayjs().isAfter(item?.deadline);

            return (
              <TableRow key={index}>
                <TableCell>
                  <p>{item?.title}</p>
                  {item?.deadline ? (
                    <p
                      className={clsx('text-xs my-1', isExpired ? 'text-danger' : 'text-gray-500')}
                    >
                      {isExpired ? 'Expired' : 'Deadline'}:{' '}
                      {dayjs(item?.deadline).format('DD MMM YYYY')}
                    </p>
                  ) : (
                    <p className="text-xs my-1 text-gray-500">No deadline mentioned</p>
                  )}
                  {item?.isFeatured && <FeaturedJobTag />}
                </TableCell>
                <TableCell className="capitalize">{item?.category?.name}</TableCell>
                <TableCell className="capitalize">
                  {CommonUtils.formatSalary(item?.salaryMin, item?.salaryMax)}
                </TableCell>
                <TableCell>
                  <Chip size="sm" variant="flat" color={item?.isActive ? 'success' : 'warning'}>
                    {item?.isActive ? 'Published' : 'Draft'}
                  </Chip>
                </TableCell>
                <TableCell>
                  <TableDate date={item?.createdAt} />
                </TableCell>
                <TableCell align="right" className="flex justify-end items-center gap-2">
                  {item?.isActive && permissionUtils.hasPermission('applications:read') && (
                    <Button
                      size="sm"
                      color="primary"
                      variant="bordered"
                      onPress={() =>
                        router.push(
                          `${routePaths.employee.jobs.applications(item?.id!)}?title=${item.title}`,
                        )
                      }
                    >
                      View Applicants
                    </Button>
                  )}
                  {permissionUtils.hasPermission('jobs:publish') && !item?.isActive && (
                    <PublishJobButton jobId={item?.id!} refetch={getJobs} />
                  )}
                  {permissionUtils.hasPermission('jobs:read') && (
                    <Button
                      size="sm"
                      variant="flat"
                      color="default"
                      isIconOnly
                      onPress={() => router.push(routePaths.employee.jobs.preview(item?.id!))}
                    >
                      <IoEyeOutline size={14} />
                    </Button>
                  )}
                  {permissionUtils.hasPermission('jobs:update') && (
                    <Button
                      onPress={() => router.push(`${routePaths.employee.jobs.update(item?.id!)}`)}
                      size="sm"
                      variant="flat"
                      color="primary"
                      isIconOnly
                    >
                      <FiEdit size={14} />
                    </Button>
                  )}
                  {permissionUtils.hasPermission('jobs:delete') && (
                    <Button
                      onPress={() =>
                        setDeleteModal({
                          show: true,
                          id: item?.id,
                        })
                      }
                      size="sm"
                      variant="flat"
                      color={'danger'}
                      isIconOnly
                    >
                      <MdOutlineDeleteOutline size={14} />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {renderPagination()}

      {deleteModal.show && (
        <ConfirmationDialog
          isOpen={deleteModal.show}
          color="danger"
          title="Delete Job"
          message="Are you sure you want to delete this job?"
          onConfirm={handleDelete}
          onClose={() => {
            setDeleteModal({
              show: false,
              id: '',
            });
          }}
        />
      )}
    </div>
  );
};

export default JobsListTable;
