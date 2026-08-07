'use client';

import { useEffect, useState } from 'react';
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Checkbox,
  Chip,
  Input,
  Slider,
} from '@heroui/react';
import { FiMapPin, FiSearch } from 'react-icons/fi';
import {
  candidateAvailabilityOptions,
  candidateEmploymentOptions,
  candidateExperienceOptions,
} from '@/app/config/candidateSearch';
import { getCandidateSkillOptions } from '@/app/api/candidateSearch';
import useDebouncedValue from '@/app/hooks/useDebouncedValue';
import useCandidateSearchStore from '@/app/store/useCandidateSearchStore';
import type {
  CandidateAvailability,
  CandidateEmploymentType,
  CandidateExperienceLevel,
  CandidateSkillOption,
} from '@/app/types/candidateSearch';

type Props = {
  onApply: () => void;
};

const FilterSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0">
    <p className="mb-3 text-sm font-bold text-gray-800">{title}</p>
    {children}
  </div>
);

const FilterSidebar = ({ onApply }: Props) => {
  const {
    filters,
    selectedSkillOptions,
    addSkillFilter,
    removeArrayFilter,
    resetFilters,
    setFilter,
    setFilters,
    toggleArrayFilter,
  } = useCandidateSearchStore();

  const [skillQuery, setSkillQuery] = useState('');
  const [skillOptions, setSkillOptions] = useState<CandidateSkillOption[]>([]);
  const [isSearchingSkills, setIsSearchingSkills] = useState(false);
  const debouncedSkillQuery = useDebouncedValue(skillQuery, 350);

  useEffect(() => {
    let ignore = false;

    const searchSkills = async () => {
      if (debouncedSkillQuery.trim().length < 2) {
        setSkillOptions([]);
        return;
      }

      try {
        setIsSearchingSkills(true);
        const options = await getCandidateSkillOptions(debouncedSkillQuery);
        if (!ignore) {
          setSkillOptions(options);
        }
      } catch (error) {
        if (!ignore) {
          setSkillOptions([]);
        }
      } finally {
        if (!ignore) {
          setIsSearchingSkills(false);
        }
      }
    };

    searchSkills();

    return () => {
      ignore = true;
    };
  }, [debouncedSkillQuery]);

  const salaryValue = [filters.salaryMin ?? 0, filters.salaryMax ?? 50];

  return (
    <aside className="h-fit rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-lg font-bold text-gray-950">Filters</p>
        <Button
          size="sm"
          variant="light"
          color="danger"
          onPress={resetFilters}
          className="h-8 min-w-0 px-2 text-xs font-medium"
        >
          Reset All
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        <FilterSection title="Search">
          <div className="flex flex-col gap-3">
            <Input
              size="sm"
              placeholder="Name, skill, job title"
              value={filters.query}
              onValueChange={(value) => setFilter('query', value)}
              startContent={<FiSearch className="text-primary" />}
              classNames={{ inputWrapper: 'bg-gray-50 shadow-none border border-gray-100' }}
            />
            <Input
              size="sm"
              placeholder="Candidate location"
              value={filters.location}
              onValueChange={(value) => setFilter('location', value)}
              startContent={<FiMapPin className="text-primary" />}
              classNames={{ inputWrapper: 'bg-gray-50 shadow-none border border-gray-100' }}
            />
          </div>
        </FilterSection>

        <FilterSection title="Experience Level">
          <div className="flex flex-col gap-3">
            {candidateExperienceOptions.map((item) => (
              <Checkbox
                key={item.value}
                size="sm"
                isSelected={filters.experienceLevels.includes(item.value)}
                onValueChange={() =>
                  toggleArrayFilter('experienceLevels', item.value as CandidateExperienceLevel)
                }
              >
                <span className="text-sm text-gray-600">{item.label}</span>
              </Checkbox>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="Expected Salary">
          <Slider
            aria-label="Expected salary range"
            size="sm"
            hideValue
            minValue={0}
            maxValue={50}
            step={1}
            value={salaryValue}
            onChange={(value) => {
              if (Array.isArray(value)) {
                setFilters({
                  salaryMin: Number(value[0]),
                  salaryMax: Number(value[1]),
                });
              }
            }}
            classNames={{
              track: 'bg-secondary',
              filler: 'bg-primary',
            }}
          />
          <div className="mt-2 flex justify-between text-xs font-medium text-gray-500">
            <span>{salaryValue[0]} LPA</span>
            <span>{salaryValue[1]} LPA+</span>
          </div>
        </FilterSection>

        <FilterSection title="Employment Type">
          <div className="flex flex-col gap-3">
            {candidateEmploymentOptions.map((item) => (
              <Checkbox
                key={item.value}
                size="sm"
                isSelected={filters.employmentTypes.includes(item.value)}
                onValueChange={() =>
                  toggleArrayFilter('employmentTypes', item.value as CandidateEmploymentType)
                }
              >
                <span className="text-sm text-gray-600">{item.label}</span>
              </Checkbox>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="Availability">
          <div className="flex flex-col gap-3">
            {candidateAvailabilityOptions.map((item) => (
              <Checkbox
                key={item.value}
                size="sm"
                isSelected={filters.availability.includes(item.value)}
                onValueChange={() =>
                  toggleArrayFilter('availability', item.value as CandidateAvailability)
                }
              >
                <span className="text-sm text-gray-600">{item.label}</span>
              </Checkbox>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="Skills">
          <Autocomplete
            aria-label="Skill filter"
            size="sm"
            items={skillOptions}
            inputValue={skillQuery}
            isLoading={isSearchingSkills}
            placeholder="Search skill names"
            onInputChange={setSkillQuery}
            selectedKey={null}
            onSelectionChange={(key) => {
              const skill = skillOptions.find((item) => item.id === key);
              if (skill) {
                addSkillFilter(skill);
                setSkillQuery('');
                setSkillOptions([]);
              }
            }}
            classNames={{
              base: 'w-full',
            }}
          >
            {(item) => (
              <AutocompleteItem key={item.id} textValue={item.name}>
                {item.name}
              </AutocompleteItem>
            )}
          </Autocomplete>

          <div className="mt-3 flex min-h-9 flex-wrap gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-2">
            {selectedSkillOptions.length ? (
              selectedSkillOptions.map((skill) => (
                <Chip
                  key={skill.id}
                  size="sm"
                  variant="flat"
                  color="primary"
                  onClose={() => removeArrayFilter('skillIds', skill.id)}
                >
                  {skill.name}
                </Chip>
              ))
            ) : (
              <span className="text-xs text-gray-400">No skill filters selected</span>
            )}
          </div>
        </FilterSection>

        <Button
          color="primary"
          variant="bordered"
          radius="lg"
          onPress={onApply}
          className="h-11 font-bold"
        >
          Apply Filters
        </Button>
      </div>
    </aside>
  );
};

export default FilterSidebar;
