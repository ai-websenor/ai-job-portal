"use client";

import { companySearchFilters } from "@/app/config/data";
import {
  Button,
  ButtonGroup,
  Checkbox,
  CheckboxGroup,
  Radio,
  RadioGroup,
} from "@heroui/react";

const CompanyFilterSection = () => {
  return (
    <div className="w-full h-fit p-6 bg-white rounded-2xl border border-gray-100 shadow-sm sticky top-24">
      <div className="flex justify-between items-center mb-6">
        <p className="font-bold text-lg text-gray-800">Filters</p>
        <Button
          size="md"
          variant="light"
          color="danger"
          className="font-medium text-xs px-2 h-8 min-w-0"
        >
          Reset All
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        {companySearchFilters.map((filter) => (
          <div key={filter.category} className="flex flex-col gap-3">
            <p className="font-semibold text-gray-700 text-sm tracking-wide">
              {filter.category}
            </p>

            {filter.category === "Salary" && (
              <ButtonGroup size="md" variant="flat" className="mb-2">
                <Button fullWidth>Hourly</Button>
                <Button fullWidth>Monthly</Button>
                <Button fullWidth color="primary">
                  Yearly
                </Button>
              </ButtonGroup>
            )}

            {filter.type === "radio" ? (
              <RadioGroup
                size="md"
                defaultValue={filter.defaultValue as string}
                color="primary"
              >
                {filter.options.map((opt) => (
                  <Radio
                    key={opt}
                    value={opt.toLowerCase().replace(/\s/g, "-")}
                  >
                    {opt}
                  </Radio>
                ))}
              </RadioGroup>
            ) : (
              <CheckboxGroup
                size="md"
                defaultValue={filter.defaultValue as string[]}
                color="primary"
              >
                {filter.options.map((opt) => (
                  <Checkbox
                    key={opt}
                    value={opt.toLowerCase().replace(/\s/g, "-")}
                  >
                    {opt}
                  </Checkbox>
                ))}
              </CheckboxGroup>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompanyFilterSection;
