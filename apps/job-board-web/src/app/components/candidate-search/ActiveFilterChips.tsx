'use client';

import { Button, Chip } from '@heroui/react';
import { candidateLabelMaps } from '@/app/config/candidateSearch';
import useCandidateSearchStore, {
  createDefaultCandidateFilters,
} from '@/app/store/useCandidateSearchStore';
import type {
  CandidateAvailability,
  CandidateEmploymentType,
  CandidateExperienceLevel,
} from '@/app/types/candidateSearch';

const ActiveFilterChips = () => {
  const {
    filters,
    selectedSkillOptions,
    removeArrayFilter,
    resetFilters,
    setFilter,
    setFilters,
  } = useCandidateSearchStore();

  const defaultFilters = createDefaultCandidateFilters();
  const chips: { key: string; label: string; onClose: () => void }[] = [];

  if (filters.query) {
    chips.push({
      key: 'query',
      label: `Search: ${filters.query}`,
      onClose: () => setFilter('query', ''),
    });
  }

  if (filters.location) {
    chips.push({
      key: 'location',
      label: `Location: ${filters.location}`,
      onClose: () => setFilter('location', ''),
    });
  }

  if (filters.salaryMin != null || filters.salaryMax != null) {
    chips.push({
      key: 'salary',
      label: `Salary: ${filters.salaryMin ?? 0}-${filters.salaryMax ?? 50} LPA`,
      onClose: () =>
        setFilters({
          salaryMin: defaultFilters.salaryMin,
          salaryMax: defaultFilters.salaryMax,
        }),
    });
  }

  filters.experienceLevels.forEach((value) => {
    chips.push({
      key: `exp-${value}`,
      label: candidateLabelMaps.experienceLevels[value as CandidateExperienceLevel],
      onClose: () => removeArrayFilter('experienceLevels', value),
    });
  });

  filters.employmentTypes.forEach((value) => {
    chips.push({
      key: `emp-${value}`,
      label: candidateLabelMaps.employmentTypes[value as CandidateEmploymentType],
      onClose: () => removeArrayFilter('employmentTypes', value),
    });
  });

  filters.availability.forEach((value) => {
    chips.push({
      key: `availability-${value}`,
      label: candidateLabelMaps.availability[value as CandidateAvailability],
      onClose: () => removeArrayFilter('availability', value),
    });
  });

  filters.skillIds.forEach((value) => {
    const skill = selectedSkillOptions.find((item) => item.id === value);
    chips.push({
      key: `skill-${value}`,
      label: `Skill: ${skill?.name ?? value}`,
      onClose: () => removeArrayFilter('skillIds', value),
    });
  });

  if (!chips.length) return null;

  return (
    <div className="mb-4 rounded-2xl border border-primary/10 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <Chip
            key={chip.key}
            variant="flat"
            color="primary"
            onClose={chip.onClose}
            className="font-medium"
          >
            {chip.label}
          </Chip>
        ))}
        <Button
          size="sm"
          variant="light"
          color="danger"
          onPress={resetFilters}
          className="h-8 text-xs font-bold"
        >
          Clear all
        </Button>
      </div>
    </div>
  );
};

export default ActiveFilterChips;
