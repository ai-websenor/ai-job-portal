'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import ConfirmationDialog from '@/app/components/dialogs/ConfirmationDialog';
import FeaturedJobTag from '@/app/components/lib/FeaturedJobTag';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import PublishJobButton from '@/app/components/lib/PublishJobButton';
import TablePagination from '@/app/components/table/TablePagination';
import routePaths from '@/app/config/routePaths';
import usePagination from '@/app/hooks/usePagination';
import useUserStore from '@/app/store/useUserStore';
import { Roles } from '@/app/types/enum';
import { IJob } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import permissionUtils from '@/app/utils/permissionUtils';
import {
  addToast,
  Avatar,
  Button,
  Chip,
  Input,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tooltip,
} from '@heroui/react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FiCalendar, FiEdit, FiFilter } from 'react-icons/fi';
import { HiArrowUturnRight } from 'react-icons/hi2';
import { IoIosSearch } from 'react-icons/io';
import { IoBriefcaseOutline, IoPricetagOutline } from 'react-icons/io5';
import { MdOutlineDeleteOutline } from 'react-icons/md';
import { JobStatus } from '@/app/types/enum';

const PENDING_JOB_SHARE_KEY = 'pendingJobShare';

const JobsListTable = () => {
  const router = useRouter();
  const { user } = useUserStore();
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [loading, setLoading] = useState(false);
  const { page, setPage, setTotalPages } = usePagination();
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobStatus, setJobStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [totalJobs, setTotalJobs] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [categories, setCategories] = useState<{ key: string; label: string }[]>([]);
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: '',
  });
  const isSuperEmployer = user?.role === Roles.super_employer;
  const tableColumns = [
    { key: 'job', label: 'Job', className: 'w-[18%]' },
    ...(isSuperEmployer ? [{ key: 'createdBy', label: 'Created By' }] : []),
    { key: 'category', label: 'Category' },
    { key: 'salary', label: 'Salary' },
    { key: 'status', label: 'Status' },
    { key: 'postedDate', label: 'Posted Date' },
    { key: 'actions', label: 'Actions', align: 'center' as const },
  ];

  const getJobs = async (params?: { search?: string; status?: string; categoryId?: string }) => {
    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.EMPLOYER.JOBS.LIST, {
        params: {
          page,
          limit: pageSize,
          ...(params?.search ? { search: params.search } : {}),
          ...(params?.status ? { status: params.status } : {}),
          ...(params?.categoryId ? { categoryId: params.categoryId } : {}),
        },
      });
      if (response?.data) {
        setJobs(response?.data);
        const nextPageCount = response?.pagination?.pageCount ?? 1;
        setTotalPages(nextPageCount);
        setPageCount(nextPageCount);
        setTotalJobs(response?.pagination?.totalJobs ?? response?.data?.length ?? 0);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getJobs({
      search: searchQuery,
      status: jobStatus,
      categoryId,
    });
  }, [page, pageSize, searchQuery, jobStatus, categoryId]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response: any = await http.get(ENDPOINTS.EMPLOYER.JOBS.CATEGORIES);
        if (response?.data) {
          setCategories(response.data.map((item: any) => ({ key: item.id, label: item.name })));
        }
      } catch (error) {
        console.log(error);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const handleDelete = async () => {
    try {
      await http.delete(ENDPOINTS.EMPLOYER.JOBS.DELETE(deleteModal.id));
      getJobs({
        search: searchQuery,
        status: jobStatus,
        categoryId,
      });
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
    setSearchValue(search);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(search?.trim());
      setPage(1);
    }, 1500);
  };

  const handleShareJob = async (job: IJob) => {
    if (!job?.id || typeof window === 'undefined') return;

    const jobUrl = `${window.location.origin}${routePaths.jobs.detail(job.id)}`;
    const sharePayload = {
      jobId: job.id,
      jobTitle: job.title || 'Job',
      url: jobUrl,
      message: `Please check this job: ${jobUrl}`,
    };

    try {
      await navigator.clipboard.writeText(jobUrl);
      window.sessionStorage.setItem(PENDING_JOB_SHARE_KEY, JSON.stringify(sharePayload));

      addToast({
        title: 'Job link copied',
        color: 'success',
        description: 'Select candidates in chat to send this job.',
      });

      router.push(`${routePaths.chat.list}?shareJobId=${encodeURIComponent(job.id)}`);
    } catch (error) {
      console.log(error);
      addToast({
        title: 'Could not copy job link',
        color: 'danger',
        description: 'Please allow clipboard access and try again.',
      });
    }
  };

  const resetFilters = () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    setSearchValue('');
    setSearchQuery('');
    setJobStatus('');
    setCategoryId('');
    setPage(1);
  };

  return (
    <div>
      <div className="mt-3 mb-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-wrap items-end gap-3">
            <div className="min-w-[180px] flex-1 lg:max-w-[220px]">
              <Select
                label="All Status"
                labelPlacement="outside"
                placeholder="All Status"
                selectedKeys={jobStatus ? [jobStatus] : []}
                onSelectionChange={(keys: any) => {
                  setJobStatus(String(Array.from(keys)[0] || ''));
                  setPage(1);
                }}
                classNames={{
                  label: 'font-semibold text-gray-600',
                  trigger: 'bg-gray-50 border border-gray-200 shadow-none hover:bg-gray-100',
                }}
              >
                {[JobStatus.active, JobStatus.inactive, JobStatus.hold, JobStatus.featured].map(
                  (status) => (
                    <SelectItem key={status}>{CommonUtils.keyIntoTitle(status)}</SelectItem>
                  ),
                )}
              </Select>
            </div>

            <div className="min-w-[180px] flex-1 lg:max-w-[260px]">
              <Select
                label="All Categories"
                labelPlacement="outside"
                placeholder="All Categories"
                selectedKeys={categoryId ? [categoryId] : []}
                onSelectionChange={(keys: any) => {
                  setCategoryId(String(Array.from(keys)[0] || ''));
                  setPage(1);
                }}
                classNames={{
                  label: 'font-semibold text-gray-600',
                  trigger: 'bg-gray-50 border border-gray-200 shadow-none hover:bg-gray-100',
                }}
              >
                {categories.map((category) => (
                  <SelectItem key={category.key}>{category.label}</SelectItem>
                ))}
              </Select>
            </div>

            <div className="flex items-center gap-2 pb-0.5">
              <Button
                size="sm"
                variant="flat"
                color="default"
                startContent={<FiFilter size={14} />}
                className="font-medium px-4 text-primary"
                onPress={resetFilters}
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="w-full lg:max-w-[360px] lg:shrink-0">
            <Input
              value={searchValue}
              onChange={(ev) => handleSearch(ev.target.value)}
              labelPlacement="outside"
              placeholder="Search by job title"
              startContent={<IoIosSearch size={16} />}
              classNames={{
                inputWrapper:
                  'bg-gray-50 border border-black/20 shadow-none hover:bg-gray-100 data-[focus=true]:border-primary transition-colors',
              }}
            />
          </div>
        </div>
      </div>

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
            {tableColumns.map((column) => (
              <TableColumn key={column.key} align={column.align} className={column.className}>
                {column.label}
              </TableColumn>
            ))}
          </TableHeader>
          <TableBody
            isLoading={loading}
            emptyContent={'No rows to display.'}
            loadingContent={<LoadingProgress />}
            className="border border-black"
          >
            {jobs.map((item, index) => {
              const isExpired = dayjs().isAfter(item?.deadline);
              const fullName = CommonUtils.getFullName(item?.createdBy || item?.employer);
              const initials = CommonUtils.getInitials(fullName);
              const rowCells = [
                <TableCell key="job">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary">
                      <IoBriefcaseOutline size={17} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-default-900">{item?.title}</p>
                      {item?.deadline ? (
                        <p
                          className={clsx(
                            'text-xs my-1',
                            isExpired ? 'text-danger' : 'text-gray-500',
                          )}
                        >
                          {isExpired ? 'Expired' : 'Deadline'}:{' '}
                          {dayjs(item?.deadline).format('DD MMM YYYY')}
                        </p>
                      ) : (
                        <p className="text-xs my-1 text-gray-500">No deadline mentioned</p>
                      )}
                      {item?.isFeatured && <FeaturedJobTag />}
                    </div>
                  </div>
                </TableCell>,
                ...(isSuperEmployer
                  ? [
                      <TableCell key="createdBy" className="whitespace-nowrap">
                        <div className="flex min-w-[180px] items-center gap-3">
                          <Avatar
                            size="sm"
                            name={initials || 'U'}
                            className="h-10 w-10 shrink-0"
                            radius="full"
                            color="primary"
                            showFallback
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-default-900">
                              {fullName || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500">Employer</p>
                          </div>
                        </div>
                      </TableCell>,
                    ]
                  : []),
                <TableCell key="category" className="capitalize whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <IoPricetagOutline className="text-default-400 shrink-0" size={15} />
                    <span className="truncate">{item?.category?.name}</span>
                  </div>
                </TableCell>,
                <TableCell key="salary" className="capitalize whitespace-nowrap">
                  {CommonUtils.formatSalary(item?.salaryMin, item?.salaryMax)}
                </TableCell>,
                <TableCell key="status" className="whitespace-nowrap">
                  <Chip
                    size="sm"
                    variant="flat"
                    color={CommonUtils.getStatusColor(item?.status)}
                    className="font-medium"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-current" />
                      {CommonUtils.keyIntoTitle(item?.status)}
                    </span>
                  </Chip>
                </TableCell>,
                <TableCell key="postedDate" className="whitespace-nowrap">
                  <div className="flex items-start gap-2">
                    <FiCalendar className="mt-1 shrink-0 text-default-400" size={14} />
                    <div>
                      <p className="font-medium leading-5 text-default-900">
                        {dayjs(item?.createdAt).format('DD MMM YYYY')}
                      </p>
                      <p className="text-xs leading-4 text-default-400">
                        {dayjs(item?.createdAt).format('hh:mm A')}
                      </p>
                    </div>
                  </div>
                </TableCell>,
                <TableCell
                  key="actions"
                  align="center"
                  className="flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {item?.isActive && permissionUtils.hasPermission('applications:read') && (
                    <Button
                      size="sm"
                      color="primary"
                      variant="bordered"
                      className="font-medium"
                      onClick={(event) => event.stopPropagation()}
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
                    <div onClick={(event) => event.stopPropagation()}>
                      <PublishJobButton jobId={item?.id!} refetch={getJobs} />
                    </div>
                  )}
                  {permissionUtils.hasPermission('jobs:read') && (
                    <>
                      <Tooltip content="Share job" size="sm">
                        <Button
                          size="sm"
                          variant="flat"
                          color="default"
                          isIconOnly
                          onClick={(event) => event.stopPropagation()}
                          onPress={() => handleShareJob(item)}
                        >
                          <HiArrowUturnRight size={14} />
                        </Button>
                      </Tooltip>
                    </>
                  )}
                  {permissionUtils.hasPermission('jobs:update') && (
                    <Tooltip content="Edit job" size="sm">
                      <Button
                        onPress={() => router.push(`${routePaths.employee.jobs.update(item?.id!)}`)}
                        size="sm"
                        variant="flat"
                        color="default"
                        className="bg-default-100 text-default-600"
                        isIconOnly
                        onClick={(event) => event.stopPropagation()}
                      >
                        <FiEdit size={14} />
                      </Button>
                    </Tooltip>
                  )}
                  {permissionUtils.hasPermission('jobs:delete') && (
                    <Tooltip content="Delete job" size="sm">
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
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MdOutlineDeleteOutline size={14} />
                      </Button>
                    </Tooltip>
                  )}
                </TableCell>,
              ];

              return (
                <TableRow
                  key={item?.id || index}
                  onClick={() => router.push(routePaths.employee.jobs.preview(item?.id!))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      router.push(routePaths.employee.jobs.preview(item?.id!));
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  className="
    border-b
    border-default-200
    transition-all
    duration-200
    hover:bg-primary-50
    hover:shadow-sm
    cursor-pointer
  "
                >
                  {rowCells}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {totalJobs > 0 && (
          <TablePagination
            label="jobs"
            totalItems={totalJobs}
            currentPage={page}
            totalPages={Math.max(1, pageCount)}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </div>

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
