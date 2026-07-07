'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import ConfirmationDialog from '@/app/components/dialogs/ConfirmationDialog';
import AppDateRangePicker from '@/app/components/lib/AppDateRangePicker';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import TablePagination from '@/app/components/table/TablePagination';
import routePaths from '@/app/config/routePaths';
import usePagination from '@/app/hooks/usePagination';
import { IUser } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import permissionUtils from '@/app/utils/permissionUtils';
import {
  Autocomplete,
  AutocompleteItem,
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
  Tooltip,
} from '@heroui/react';
import { I18nProvider } from '@react-aria/i18n';
import { parseDate } from '@internationalized/date';
import { useEffect, useRef, useState } from 'react';
import { FiBriefcase, FiCalendar, FiEdit, FiFilter, FiGrid } from 'react-icons/fi';
import { IoIosSearch } from 'react-icons/io';
import { MdOutlineDeleteOutline } from 'react-icons/md';
import { useRouter } from 'next/navigation';

const MembersListTable = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<IUser[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [designationOptions, setDesignationOptions] = useState<string[]>([]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: '',
  });

  const { page, setPage, setTotalPages } = usePagination();

  const fetchList = async (params?: {
    search?: string;
    status?: string;
    department?: string;
    designation?: string;
    fromDate?: string;
    toDate?: string;
  }) => {
    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.EMPLOYER.MEMBERS.LIST, {
        params: {
          page,
          limit: pageSize,
          ...(params?.search ? { search: params.search } : {}),
          ...(params?.status ? { status: params.status } : {}),
          ...(params?.department ? { department: params.department } : {}),
          ...(params?.designation ? { designation: params.designation } : {}),
          ...(params?.fromDate ? { fromDate: params.fromDate } : {}),
          ...(params?.toDate ? { toDate: params.toDate } : {}),
        },
      });
      if (response?.data) {
        setMembers(response?.data);
        const nextPageCount = response?.pagination?.pageCount ?? 1;
        setTotalPages(nextPageCount);
        setPageCount(nextPageCount);
        setTotalMembers(response?.pagination?.totalEmployers ?? response?.data?.length ?? 0);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList({
      search: searchQuery,
      status: statusFilter,
      department: departmentFilter,
      designation: designationFilter,
      fromDate,
      toDate,
    });
  }, [page, pageSize, searchQuery, statusFilter, departmentFilter, designationFilter, fromDate, toDate]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const response: any = await http.get(ENDPOINTS.EMPLOYER.MEMBERS.FILTER_OPTIONS);
        const data = response?.data ?? {};
        setDesignationOptions(data.designations ?? []);
        setDepartmentOptions(data.departments ?? []);
      } catch (error) {
        console.log(error);
      }
    };

    loadFilterOptions();
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
      await http.delete(ENDPOINTS.EMPLOYER.MEMBERS.DELETE(deleteModal.id));
      fetchList({
        search: searchQuery,
        status: statusFilter,
        department: departmentFilter,
        designation: designationFilter,
        fromDate,
        toDate,
      });
      setDeleteModal({
        show: false,
        id: '',
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(value.trim());
      setPage(1);
    }, 1200);
  };

  const resetFilters = () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    setSearchValue('');
    setSearchQuery('');
    setStatusFilter('all');
    setDepartmentFilter('');
    setDesignationFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const dateRangeValue =
    fromDate && toDate
      ? {
          start: parseDate(fromDate),
          end: parseDate(toDate),
        }
      : null;

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
                selectedKeys={statusFilter ? [statusFilter] : []}
                onSelectionChange={(keys: any) => {
                  setStatusFilter(String(Array.from(keys)[0] || ''));
                  setPage(1);
                }}
                classNames={{
                  label: 'font-semibold text-gray-600',
                  trigger: 'bg-gray-50 border border-gray-200 shadow-none hover:bg-gray-100',
                }}
              >
                {['all', 'active', 'inactive'].map((status) => (
                  <SelectItem key={status}>
                    {status === 'all' ? 'All' : status === 'active' ? 'Active' : 'Inactive'}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="min-w-[180px] flex-1 lg:max-w-[260px]">
              <Autocomplete
                label="All Departments"
                labelPlacement="outside"
                placeholder="All Departments"
                selectedKey={departmentFilter || null}
                isClearable
                onSelectionChange={(key) => {
                  setDepartmentFilter(key ? String(key) : '');
                  setPage(1);
                }}
                classNames={{
                  base: 'w-full',
                }}
              >
                {departmentOptions.map((department) => (
                  <AutocompleteItem key={department} textValue={department}>
                    {department}
                  </AutocompleteItem>
                ))}
              </Autocomplete>
            </div>

            <div className="min-w-[180px] flex-1 lg:max-w-[260px]">
              <Autocomplete
                label="All Designations"
                labelPlacement="outside"
                placeholder="All Designations"
                selectedKey={designationFilter || null}
                isClearable
                onSelectionChange={(key) => {
                  setDesignationFilter(key ? String(key) : '');
                  setPage(1);
                }}
                classNames={{
                  base: 'w-full',
                }}
              >
                {designationOptions.map((designation) => (
                  <AutocompleteItem key={designation} textValue={designation}>
                    {designation}
                  </AutocompleteItem>
                ))}
              </Autocomplete>
            </div>

            <div className="min-w-[260px] flex-[1.5] lg:max-w-[360px]">
              <I18nProvider locale="en-GB">
                <AppDateRangePicker
                  label={
                    <span className="inline-flex items-center gap-1.5">
                      <FiCalendar size={14} />
                      Date Range
                    </span>
                  }
                  labelPlacement="outside"
                  value={dateRangeValue as any}
                  onChange={(value: any) => {
                    if (!value) {
                      setFromDate('');
                      setToDate('');
                      setPage(1);
                      return;
                    }

                    setFromDate(value.start ? value.start.toString() : '');
                    setToDate(value.end ? value.end.toString() : '');
                    setPage(1);
                  }}
                  classNames={{
                    label: 'font-semibold text-gray-600',
                    inputWrapper: 'bg-gray-50 shadow-none hover:bg-gray-100',
                    separator: 'text-gray-400',
                    selectorButton: 'text-gray-500',
                  }}
                />
              </I18nProvider>
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
              placeholder="Search by name or email"
              startContent={<IoIosSearch size={16} className="text-gray-400" />}
              classNames={{
                label: 'font-semibold text-gray-600',
                inputWrapper:
                  'bg-gray-50 border border-gray-200 shadow-none hover:bg-gray-100 data-[focus=true]:border-primary transition-colors',
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-default-200 bg-white">
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
              <LoadingProgress />
            </div>
          )}
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
            <TableColumn>Member</TableColumn>
            <TableColumn>Designation</TableColumn>
            <TableColumn>Department</TableColumn>
            <TableColumn>Status</TableColumn>
            <TableColumn>Created At</TableColumn>
            <TableColumn align="end">Actions</TableColumn>
          </TableHeader>
          <TableBody
            isLoading={loading}
            loadingContent={<LoadingProgress />}
            emptyContent={'No rows to display.'}
          >
            {members?.map((item) => (
              <TableRow
                key={item.id}
                className="
                  border-b
                  border-default-200
                  transition-all
                  duration-200
                  hover:bg-primary-50
                  hover:shadow-sm
                "
              >
                <TableCell className="whitespace-nowrap">
                  <div className="flex min-w-[180px] items-center gap-3">
                    <Avatar
                      name={CommonUtils.getInitials(
                        `${item?.firstName || ''} ${item?.lastName || ''}`,
                      )}
                      fallback={CommonUtils.getInitials(
                        `${item?.firstName || ''} ${item?.lastName || ''}`,
                      )}
                      className="h-10 w-10 shrink-0 bg-primary-50 text-primary"
                      radius="full"
                      showFallback
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-default-900">
                        {item?.firstName} {item?.middleName} {item?.lastName}
                      </p>
                      <p className="mt-1 flex gap-1 text-xs text-gray-400">
                        {item?.isActive ? item?.email : 'Has been deleted'}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
                      <FiBriefcase size={14} />
                    </div>
                    <span className="truncate font-medium text-default-900">
                      {item?.designation || '-'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
                      <FiGrid size={14} />
                    </div>
                    <span className="truncate font-medium text-default-900">
                      {item?.department || '-'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
                      item?.isActive
                        ? 'bg-success-50 text-success border border-success-200'
                        : 'bg-danger-50 text-danger border border-danger-200'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        item?.isActive ? 'bg-success' : 'bg-danger'
                      }`}
                    />
                    {CommonUtils.keyIntoTitle(item?.isActive ? 'active' : 'inactive')}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-start gap-2">
                    <FiCalendar className="mt-1 shrink-0 text-default-400" size={14} />
                    <div>
                      <p className="font-medium leading-5 text-default-900">
                        {new Date(item?.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-xs leading-4 text-default-400">
                        {new Date(item?.createdAt).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell align="right" className="flex items-center justify-end gap-2">
                  {permissionUtils.hasPermission('employers:update') && (
                    <Tooltip content="Edit member" size="sm">
                      <Button
                        disabled={!item?.isActive}
                        onPress={() =>
                          router.push(`${routePaths.employee.members.update(item?.userId!)}`)
                        }
                        size="sm"
                        variant="flat"
                        color={item?.isActive ? 'primary' : 'default'}
                        className="bg-primary-50 text-primary hover:bg-primary-100"
                        isIconOnly
                      >
                        <FiEdit size={14} />
                      </Button>
                    </Tooltip>
                  )}
                  {permissionUtils.hasPermission('employers:delete') && (
                    <Tooltip content="Delete member" size="sm">
                      <Button
                        disabled={!item?.isActive}
                        onPress={() =>
                          setDeleteModal({
                            show: true,
                            id: item?.userId,
                          })
                        }
                        size="sm"
                        variant="flat"
                        color={item?.isActive ? 'danger' : 'default'}
                        isIconOnly
                      >
                        <MdOutlineDeleteOutline size={14} />
                      </Button>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        {totalMembers > 0 && (
          <TablePagination
            label="members"
            totalItems={totalMembers}
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
          title="Delete Member"
          message="Are you sure you want to delete this member?"
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

export default MembersListTable;
