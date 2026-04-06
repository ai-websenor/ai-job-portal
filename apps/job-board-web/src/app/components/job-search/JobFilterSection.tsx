'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import { searchJobDefaultValues } from '@/app/config/data';
import { Button, Chip, Input, Select, SelectItem, Slider } from '@heroui/react';
import { useEffect, useState } from 'react';
import LoadingProgress from '../lib/LoadingProgress';
import clsx from 'clsx';
import CommonUtils from '@/app/utils/commonUtils';

type Option = {
  value: string;
  label: string;
};

type FilterOption = Record<string, Option[]>;

type Props = {
  form: typeof searchJobDefaultValues;
  setForm: (form: typeof searchJobDefaultValues) => void;
  applyFilters: () => void;
  reset: () => void;
};

const JobFilterSection = ({ form, setForm, reset, applyFilters }: Props) => {
  const [loading, setLoading] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOption | null>(null);

  const getFilterOptions = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.JOBS.GET_FILTERS);
      if (response?.data) {
        setFilterOptions(response?.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getFilterOptions();
  }, []);

  const handleChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = ev.target;
    setForm({ ...form, [name]: value });
  };

  const onMultiSelect = (value: string, checked: boolean, name: string) => {
    if (!checked) {
      const values = [...(form[name as keyof typeof form] || []), value];
      setForm({ ...form, [name]: values });
    } else {
      const values = (form?.[name as keyof typeof form] as any)?.filter(
        (item: string) => item !== value,
      ) as any;
      setForm({ ...form, [name]: values });
    }
  };

  return (
    <div className="w-full h-fit p-6 bg-white rounded-2xl border border-gray-100 shadow-sm sticky top-24">
      <div className="flex justify-between items-center mb-6">
        <p className="font-bold text-lg text-gray-800">Filters</p>
        {!loading && (
          <Button
            size="sm"
            variant="light"
            color="danger"
            onPress={reset}
            className="font-medium text-xs px-2 h-8 min-w-0"
          >
            Reset All
          </Button>
        )}
      </div>

      {loading ? (
        <LoadingProgress />
      ) : (
        <>
          <div className="flex flex-col gap-6">
            <div>
              <Input
                size="md"
                label="Company Name"
                placeholder="Search company..."
                labelPlacement="outside"
                value={form?.company}
                name="company"
                onChange={handleChange}
                classNames={{
                  label: 'font-semibold text-gray-700 pb-1 text-sm tracking-wide',
                  inputWrapper:
                    'bg-gray-50 border-gray-200 hover:bg-gray-100 transition-colors shadow-none',
                }}
              />
            </div>

            {filterOptions && filterOptions?.sortBy?.length > 0 && (
              <Select
                size="md"
                label="Sort By"
                labelPlacement="outside"
                placeholder="Select sort by"
                name="sortBy"
                value={form.sortBy}
                selectedKeys={new Set([form.sortBy])}
                onChange={handleChange as any}
                classNames={{
                  label: 'font-semibold text-gray-700 pb-1 text-sm tracking-wide',
                  trigger:
                    'bg-gray-50 border-gray-200 hover:bg-gray-100 transition-colors shadow-none',
                }}
              >
                {filterOptions &&
                  filterOptions?.sortBy?.map((item) => (
                    <SelectItem key={item?.value}>{item?.label}</SelectItem>
                  ))}
              </Select>
            )}

            <Slider
              size="sm"
              hideValue
              step={5000}
              showTooltip
              label="Salary"
              minValue={600000}
              maxValue={1000000}
              formatOptions={{ style: 'currency', currency: 'INR' }}
              value={[Number(form.salaryMin), Number(form.salaryMax)]}
              onChange={(value: number | number[]) => {
                if (Array.isArray(value)) {
                  setForm({ ...form, salaryMin: String(value[0]), salaryMax: String(value[1]) });
                }
              }}
            />

            {filterOptions && filterOptions?.experienceLevel?.length > 0 && (
              <div>
                <p className="font-semibold text-gray-700 pb-2 text-sm tracking-wide">
                  Experience Level
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {filterOptions?.experienceLevel?.map((item, index) => {
                    const isSelected = form.experienceLevels.includes(item?.value as never);
                    return (
                      <Chip
                        size="md"
                        key={index}
                        color={isSelected ? 'primary' : 'default'}
                        className={clsx(
                          'cursor-pointer transition-all',
                          isSelected
                            ? 'shadow-md shadow-primary/20'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-transparent',
                        )}
                        variant="solid"
                        onClick={() => onMultiSelect(item?.value, isSelected, 'experienceLevels')}
                      >
                        {item?.label}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            )}

            {filterOptions && filterOptions?.locationType?.length > 0 && (
              <div>
                <Select
                  size="md"
                  selectionMode="multiple"
                  label="Location Type"
                  labelPlacement="outside"
                  placeholder="Any"
                  name="locationType"
                  classNames={{
                    label: 'font-semibold text-gray-700 pb-1 text-sm tracking-wide',
                    trigger:
                      'bg-gray-50 border-gray-200 hover:bg-gray-100 transition-colors shadow-none',
                  }}
                  selectedKeys={new Set(form.locationType)}
                  onSelectionChange={(keys) => {
                    setForm({ ...form, locationType: Array.from(keys) as never[] });
                  }}
                >
                  {filterOptions &&
                    filterOptions?.locationType?.map((item) => (
                      <SelectItem key={item?.value}>{item?.label}</SelectItem>
                    ))}
                </Select>
              </div>
            )}

            {filterOptions && filterOptions?.payRate?.length > 0 && (
              <div>
                <Select
                  size="md"
                  selectionMode="multiple"
                  label="Pay Type"
                  labelPlacement="outside"
                  placeholder="Select period"
                  name="payRate"
                  classNames={{
                    label: 'font-semibold text-gray-700 pb-1 text-sm tracking-wide',
                    trigger:
                      'bg-gray-50 border-gray-200 hover:bg-gray-100 transition-colors shadow-none',
                  }}
                  selectedKeys={new Set(form.payRate)}
                  onSelectionChange={(keys) => {
                    setForm({ ...form, payRate: Array.from(keys) as never[] });
                  }}
                >
                  {filterOptions &&
                    filterOptions?.payRate?.map((item) => (
                      <SelectItem key={item?.value}>{item?.label}</SelectItem>
                    ))}
                </Select>
              </div>
            )}

            {filterOptions && filterOptions?.postedWithin?.length > 0 && (
              <div>
                <Select
                  size="md"
                  label="Posted Within"
                  labelPlacement="outside"
                  placeholder="Any time"
                  name="postedWithin"
                  value={form.postedWithin}
                  onChange={handleChange as any}
                  classNames={{
                    label: 'font-semibold text-gray-700 pb-1 text-sm tracking-wide',
                    trigger:
                      'bg-gray-50 border-gray-200 hover:bg-gray-100 transition-colors shadow-none',
                  }}
                >
                  {filterOptions &&
                    filterOptions?.postedWithin?.map((item) => (
                      <SelectItem key={item?.value}>{item?.label}</SelectItem>
                    ))}
                </Select>
              </div>
            )}

            {filterOptions && filterOptions?.jobType?.length && (
              <div>
                <p className="font-semibold text-gray-700 pb-2 text-sm tracking-wide">Job Types</p>
                <div className="flex flex-wrap items-center gap-2">
                  {filterOptions?.jobType?.map((item, index) => {
                    const isSelected = form?.jobType?.includes(item?.value as never);
                    return (
                      <Chip
                        size="md"
                        key={index}
                        color={isSelected ? 'primary' : 'default'}
                        className={clsx(
                          'cursor-pointer transition-all',
                          isSelected
                            ? 'shadow-md shadow-primary/20'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-transparent',
                        )}
                        variant="solid"
                        onClick={() => onMultiSelect(item?.value, isSelected, 'jobType')}
                      >
                        {item?.label}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            )}

            {filterOptions && filterOptions?.industry?.length > 0 && (
              <div>
                <p className="font-semibold text-gray-700 pb-2 text-sm tracking-wide">Industries</p>
                <div className="flex flex-wrap items-center gap-2">
                  {filterOptions?.industry?.map((item, index) => {
                    const isSelected = form.industry.includes(item.value as never);
                    return (
                      <Chip
                        size="md"
                        key={index}
                        color={isSelected ? 'primary' : 'default'}
                        className={clsx(
                          'cursor-pointer transition-all',
                          isSelected
                            ? 'shadow-md shadow-primary/20'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-transparent',
                        )}
                        variant="solid"
                        onClick={() => onMultiSelect(item.value, isSelected, 'industry')}
                      >
                        {item?.label}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            )}

            {filterOptions && filterOptions?.companyType?.length > 0 && (
              <div>
                <p className="font-semibold text-gray-700 pb-2 text-sm tracking-wide">
                  Company Types
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {filterOptions?.companyType?.map((item, index) => {
                    const isSelected = form.companyType.includes(item.value as never);

                    return (
                      <Chip
                        size="md"
                        key={index}
                        color={isSelected ? 'primary' : 'default'}
                        className={clsx(
                          'cursor-pointer transition-all',
                          isSelected
                            ? 'shadow-md shadow-primary/20'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-transparent',
                        )}
                        variant="solid"
                        onClick={() => onMultiSelect(item.value, isSelected, 'companyType')}
                      >
                        {item.label}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            )}

            {filterOptions && filterOptions?.work_mode?.length > 0 && (
              <div>
                <p className="font-semibold text-gray-700 pb-2 text-sm tracking-wide">Work Modes</p>
                <div className="flex flex-wrap items-center gap-2">
                  {filterOptions?.work_mode?.map((item, index) => {
                    const isSelected = form?.workModes?.includes(item?.value as never);

                    return (
                      <Chip
                        size="md"
                        key={index}
                        color={isSelected ? 'primary' : 'default'}
                        className={clsx(
                          'cursor-pointer transition-all',
                          isSelected
                            ? 'shadow-md shadow-primary/20'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-transparent',
                        )}
                        variant="solid"
                        onClick={() => onMultiSelect(item?.value, isSelected, 'workModes')}
                      >
                        {CommonUtils.keyIntoTitle(item?.label)}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            )}

            {filterOptions && filterOptions?.department?.length > 0 && (
              <div>
                <p className="font-semibold text-gray-700 pb-2 text-sm tracking-wide">
                  Departments
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {filterOptions?.department?.map((item, index) => {
                    const isSelected = form.department.includes(item?.value as never);

                    return (
                      <Chip
                        size="md"
                        key={index}
                        color={isSelected ? 'primary' : 'default'}
                        className={clsx(
                          'cursor-pointer transition-all',
                          isSelected
                            ? 'shadow-md shadow-primary/20'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-transparent',
                        )}
                        variant="solid"
                        onClick={() => onMultiSelect(item?.value, isSelected, 'department')}
                      >
                        {item.label}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 mt-8 pt-6 border-t border-gray-100">
            <Button size="md" color="primary" onPress={applyFilters}>
              Apply Filters
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default JobFilterSection;
