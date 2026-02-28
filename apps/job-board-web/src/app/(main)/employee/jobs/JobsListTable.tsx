'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import ConfirmationDialog from '@/app/components/dialogs/ConfirmationDialog';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import TableDate from '@/app/components/table/TableDate';
import routePaths from '@/app/config/routePaths';
import usePagination from '@/app/hooks/usePagination';
import { IJob } from '@/app/types/types';
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
} from '@heroui/react';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiEdit } from 'react-icons/fi';
import { IoEyeOutline } from 'react-icons/io5';
import { MdOutlineDeleteOutline } from 'react-icons/md';

const JobsListTable = () => {
  const router = useRouter();
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: '',
  });

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

  return (
    <div>
      <Table shadow="none">
        <TableHeader>
          <TableColumn>Job</TableColumn>
          <TableColumn>Category</TableColumn>
          <TableColumn>Salary</TableColumn>
          <TableColumn>Posted Date</TableColumn>
          <TableColumn align="end">Actions</TableColumn>
        </TableHeader>
        <TableBody
          isLoading={loading}
          emptyContent={'No rows to display.'}
          loadingContent={<LoadingProgress />}
        >
          {jobs.map((item, index) => (
            <TableRow key={index}>
              <TableCell>
                <p>{item?.title}</p>
                <p className="text-gray-400 text-xs">
                  Deadline: {item?.deadline ? dayjs(item?.deadline).format('DD MMM YYYY') : 'N/A'}
                </p>
              </TableCell>
              <TableCell className="capitalize">{item?.category?.name}</TableCell>
              <TableCell className="capitalize">
                {CommonUtils.formatSalary(item?.salaryMin, item?.salaryMax)}
              </TableCell>
              <TableCell>
                <TableDate date={item?.createdAt} />
              </TableCell>
              <TableCell align="right" className="flex justify-end items-center gap-2">
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
                  View Application
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  color="default"
                  isIconOnly
                  onPress={() => router.push(routePaths.employee.jobs.preview(item?.id!))}
                >
                  <IoEyeOutline size={14} />
                </Button>
                <Button
                  disabled={!item?.isActive}
                  onPress={() => router.push(`${routePaths.employee.jobs.update(item?.id!)}`)}
                  size="sm"
                  variant="flat"
                  color={item?.isActive ? 'primary' : 'default'}
                  isIconOnly
                >
                  <FiEdit size={14} />
                </Button>
                <Button
                  disabled={!item?.isActive}
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
              </TableCell>
            </TableRow>
          ))}
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
