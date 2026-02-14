"use client";

import {
  companyTypeOptions,
  filterIndustryOptions,
  jobSearchExperiences,
  locationTypeOptions,
  payRateOptions,
  postedWithinOptions,
  searchJobDefaultValues,
} from "@/app/config/data";
import { JobTypes } from "@/app/types/enum";
import CommonUtils from "@/app/utils/commonUtils";
import { Button, Chip, Input, Select, SelectItem } from "@heroui/react";

type Props = {
  form: typeof searchJobDefaultValues;
  setForm: (form: typeof searchJobDefaultValues) => void;
  applyFilters: () => void;
  reset: () => void;
};

const JobFilterSection = ({ form, setForm, reset, applyFilters }: Props) => {
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
        <Button
          size="sm"
          variant="light"
          color="danger"
          onPress={reset}
          className="font-medium text-xs px-2 h-8 min-w-0"
        >
          Reset All
        </Button>
      </div>

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
              label: "font-semibold text-gray-700 pb-1 text-sm tracking-wide",
              inputWrapper:
                "bg-gray-50 border-gray-200 hover:bg-gray-100 transition-colors shadow-none",
            }}
          />
        </div>

        <div>
          <Input
            size="md"
            type="number"
            label="Salary Range"
            placeholder="Min Salary"
            labelPlacement="outside"
            value={form.salaryMin}
            name="salaryMin"
            onChange={handleChange}
            classNames={{
              label: "font-semibold text-gray-700 pb-1 text-sm tracking-wide",
              inputWrapper:
                "bg-gray-50 border-gray-200 hover:bg-gray-100 transition-colors shadow-none",
            }}
            endContent={
              <div className="pointer-events-none flex items-center">
                <span className="text-default-400 text-small">$</span>
              </div>
            }
          />
          <div className="mt-2">
            <Input
              size="md"
              type="number"
              placeholder="Max Salary"
              aria-label="Max Salary"
              name="salaryMax"
              value={form.salaryMax}
              onChange={handleChange}
              classNames={{
                inputWrapper:
                  "bg-gray-50 border-gray-200 hover:bg-gray-100 transition-colors shadow-none",
              }}
              endContent={
                <div className="pointer-events-none flex items-center">
                  <span className="text-default-400 text-small">$</span>
                </div>
              }
            />
          </div>
        </div>

        <div>
          <p className="font-semibold text-gray-700 pb-2 text-sm tracking-wide">
            Experience Level
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {jobSearchExperiences.map((item, index) => {
              const isSelected = form.experienceLevels.includes(item);
              return (
                <Chip
                  size="md"
                  key={index}
                  color={isSelected ? "primary" : "default"}
                  className={`cursor-pointer transition-all ${isSelected ? "shadow-md shadow-primary/20" : "bg-gray-100 hover:bg-gray-200 text-gray-600 border-transparent"}`}
                  variant="solid"
                  onClick={() =>
                    onMultiSelect(item, isSelected, "experienceLevels")
                  }
                >
                  {item}
                </Chip>
              );
            })}
          </div>
        </div>

        <div>
          <Select
            size="md"
            label="Location Type"
            labelPlacement="outside"
            placeholder="Any"
            name="locationType"
            value={form.locationType}
            onChange={handleChange as any}
            classNames={{
              label: "font-semibold text-gray-700 pb-1 text-sm tracking-wide",
              trigger:
                "bg-gray-50 border-gray-200 hover:bg-gray-100 transition-colors shadow-none",
            }}
          >
            {locationTypeOptions.map((item) => (
              <SelectItem key={item?.value}>{item?.label}</SelectItem>
            ))}
          </Select>
        </div>

        <div>
          <Select
            size="md"
            label="Pay Rate Period"
            labelPlacement="outside"
            placeholder="Select period"
            name="payRate"
            value={form.payRate}
            onChange={handleChange as any}
            classNames={{
              label: "font-semibold text-gray-700 pb-1 text-sm tracking-wide",
              trigger:
                "bg-gray-50 border-gray-200 hover:bg-gray-100 transition-colors shadow-none",
            }}
          >
            {payRateOptions.map((item) => (
              <SelectItem key={item?.value}>{item?.label}</SelectItem>
            ))}
          </Select>
        </div>

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
              label: "font-semibold text-gray-700 pb-1 text-sm tracking-wide",
              trigger:
                "bg-gray-50 border-gray-200 hover:bg-gray-100 transition-colors shadow-none",
            }}
          >
            {postedWithinOptions.map((item) => (
              <SelectItem key={item?.value}>{item?.label}</SelectItem>
            ))}
          </Select>
        </div>

        <div>
          <p className="font-semibold text-gray-700 pb-2 text-sm tracking-wide">
            Job Types
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {Object.values(JobTypes).map((item, index) => {
              const isSelected = form?.jobType?.includes(item);
              return (
                <Chip
                  size="md"
                  key={index}
                  color={isSelected ? "primary" : "default"}
                  className={`cursor-pointer transition-all ${isSelected ? "shadow-md shadow-primary/20" : "bg-gray-100 hover:bg-gray-200 text-gray-600 border-transparent"}`}
                  variant="solid"
                  onClick={() => onMultiSelect(item, isSelected, "jobType")}
                >
                  {CommonUtils.keyIntoTitle(item)}
                </Chip>
              );
            })}
          </div>
        </div>

        <div>
          <p className="font-semibold text-gray-700 pb-2 text-sm tracking-wide">
            Industries
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {filterIndustryOptions.map((item, index) => {
              const isSelected = form.industry === item;
              return (
                <Chip
                  size="md"
                  key={index}
                  color={isSelected ? "primary" : "default"}
                  className={`cursor-pointer transition-all ${isSelected ? "shadow-md shadow-primary/20" : "bg-gray-100 hover:bg-gray-200 text-gray-600 border-transparent"}`}
                  variant="solid"
                  onClick={() => setForm({ ...form, industry: item })}
                >
                  {CommonUtils.keyIntoTitle(item)}
                </Chip>
              );
            })}
          </div>
        </div>

        <div>
          <p className="font-semibold text-gray-700 pb-2 text-sm tracking-wide">
            Company Types
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {companyTypeOptions.map((item, index) => (
              <Chip
                size="md"
                key={index}
                color={index === 0 ? "primary" : "default"}
                className={`cursor-pointer transition-all ${index === 0 ? "shadow-md shadow-primary/20" : "bg-gray-100 hover:bg-gray-200 text-gray-600 border-transparent"}`}
                variant="solid"
              >
                {CommonUtils.keyIntoTitle(item.label)}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 mt-8 pt-6 border-t border-gray-100">
        <Button size="md" color="primary" onPress={applyFilters}>
          Apply Filters
        </Button>
      </div>
    </div>
  );
};

export default JobFilterSection;
