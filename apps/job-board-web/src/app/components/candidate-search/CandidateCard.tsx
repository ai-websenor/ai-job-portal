'use client';

import { Avatar, Button, Chip } from '@heroui/react';
import {
  FiBriefcase,
  FiDownload,
  FiEye,
  FiMapPin,
  FiZap,
} from 'react-icons/fi';
import { IoBookmark, IoBookmarkOutline } from 'react-icons/io5';
import useCandidateSearchStore from '@/app/store/useCandidateSearchStore';
import type { CandidateProfileCard } from '@/app/types/candidateSearch';

type Props = {
  candidate: CandidateProfileCard;
};

const parseNumber = (value: string | null) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatExperience = (value: string | null) => {
  const years = parseNumber(value);
  if (years === null) return 'Experience not specified';
  if (years <= 0) return 'Fresher';
  return `${years.toFixed(years % 1 === 0 ? 0 : 1)} Years Experience`;
};

const formatSalaryPart = (value: string | null, currency: string | null) => {
  const parsed = parseNumber(value);
  if (parsed === null) return null;

  if ((currency || 'INR').toUpperCase() === 'INR') {
    return `INR ${(parsed / 100000).toFixed(1)} LPA`;
  }

  return `${currency || 'Salary'} ${parsed.toLocaleString()}`;
};

const formatSalary = (candidate: CandidateProfileCard) => {
  const min = formatSalaryPart(candidate.expectedSalaryMin, candidate.salaryCurrency);
  const max = formatSalaryPart(candidate.expectedSalaryMax, candidate.salaryCurrency);

  if (min && max) return `${min} - ${max}`;
  if (min) return `From ${min}`;
  if (max) return `Up to ${max}`;
  return 'Salary not specified';
};

const CandidateCard = ({ candidate }: Props) => {
  const { actionLoadingIds, toggleSave } = useCandidateSearchStore();
  const candidateName = candidate.name || 'Anonymous Candidate';
  const visibleSkills = candidate.skills.slice(0, 5);
  const extraSkills = candidate.skills.length - visibleSkills.length;

  return (
    <article className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-primary/20 hover:shadow-lg">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar
          src={candidate.profilePhoto || undefined}
          name={candidateName}
          className="h-20 w-20 shrink-0 text-large ring-4 ring-secondary"
          isBordered
          color="primary"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
            <div>
              <h2 className="text-lg font-bold text-gray-950 transition-colors group-hover:text-primary">
                {candidateName}
              </h2>
              <p className="text-sm font-medium text-gray-500">
                {candidate.headline || 'Candidate headline not specified'}
              </p>
            </div>
            <Chip
              size="sm"
              variant="flat"
              color={candidate.isSaved ? 'success' : 'default'}
              className="w-fit font-semibold"
            >
              {candidate.isSaved ? 'Shortlisted' : 'Open'}
            </Chip>
          </div>

          <div className="mt-4 grid gap-2 text-xs font-medium text-gray-600 sm:grid-cols-2 xl:grid-cols-4">
            <span className="flex items-center gap-1.5">
              <FiMapPin className="text-primary" />
              {candidate.location || 'Location not specified'}
            </span>
            <span className="flex items-center gap-1.5">
              <FiBriefcase className="text-primary" />
              {formatExperience(candidate.totalExperienceYears)}
            </span>
            <span className="flex items-center gap-1.5">
              <FiZap className="text-emerald-600" />
              {candidate.availability || 'Availability not specified'}
            </span>
            <span className="flex items-center gap-1.5">{formatSalary(candidate)}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {visibleSkills.length ? (
              <>
                {visibleSkills.map((skill) => (
                  <Chip
                    key={skill}
                    size="sm"
                    variant="flat"
                    color="primary"
                    className="bg-secondary font-semibold text-primary"
                  >
                    {skill}
                  </Chip>
                ))}
                {extraSkills > 0 && (
                  <Chip size="sm" variant="flat" className="font-semibold">
                    +{extraSkills}
                  </Chip>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-400">No skills listed</span>
            )}
          </div>

          <p className="mt-4 text-sm leading-6 text-gray-600">
            {candidate.headline
              ? `${candidate.headline} with ${formatExperience(
                  candidate.totalExperienceYears,
                ).toLowerCase()} and ${candidate.availability || 'availability not specified'}.`
              : 'Candidate profile has limited public information. Use filters to refine matching profiles.'}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Button
              variant="bordered"
              color="primary"
              radius="lg"
              isDisabled
              startContent={<FiEye />}
              className="font-bold"
            >
              View Profile
            </Button>
            <Button
              variant="bordered"
              radius="lg"
              isDisabled
              startContent={<FiDownload />}
              className="font-bold"
            >
              Download Resume
            </Button>
            <Button
              variant={candidate.isSaved ? 'solid' : 'bordered'}
              color={candidate.isSaved ? 'primary' : 'warning'}
              radius="lg"
              isLoading={actionLoadingIds.has(candidate.profileId)}
              startContent={
                candidate.isSaved ? <IoBookmark size={18} /> : <IoBookmarkOutline size={18} />
              }
              onPress={() => toggleSave(candidate)}
              className="font-bold"
            >
              {candidate.isSaved ? 'Saved' : 'Save Candidate'}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default CandidateCard;
