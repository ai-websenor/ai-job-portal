'use client';

import {
  Avatar,
  Button,
  Checkbox,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from '@heroui/react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  FiBriefcase,
  FiCheckCircle,
  FiDownload,
  FiEye,
  FiLock,
  FiMapPin,
  FiZap,
} from 'react-icons/fi';
import { IoBookmark, IoBookmarkOutline } from 'react-icons/io5';
import { downloadCandidateResume } from '@/app/api/candidateSearch';
import routePaths from '@/app/config/routePaths';
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

const openResumeUrl = (url: string, fileName: string) => {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

const CandidateCard = ({ candidate }: Props) => {
  const { actionLoadingIds, toggleSave, profileAccess, acknowledgeNotice } =
    useCandidateSearchStore();
  const router = useRouter();
  const upgradeModal = useDisclosure();
  const explainerModal = useDisclosure();
  const [resumeLoading, setResumeLoading] = useState(false);
  // The action queued behind the first-time explainer modal.
  const [pendingAction, setPendingAction] = useState<'view' | 'download' | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const candidateName = candidate.name || 'Anonymous Candidate';
  const visibleSkills = candidate.skills.slice(0, 5);
  const extraSkills = candidate.skills.length - visibleSkills.length;
  const hasKnownNoResume = candidate.resume === null;

  // A candidate already unlocked stays free. Otherwise, when the quota is loaded and
  // exhausted (free plan or no credits left), block navigation and prompt to upgrade.
  const isLockedByQuota =
    !candidate.isUnlocked && profileAccess != null && profileAccess.remaining <= 0;
  // Show the one-time explainer only when this action will actually spend a credit
  // (candidate not yet unlocked, quota available) and the employer hasn't dismissed it.
  const willSpendCredit = !candidate.isUnlocked && !isLockedByQuota;
  const shouldExplain = willSpendCredit && profileAccess?.creditNoticeAcknowledged === false;

  const goToProfile = () =>
    router.push(routePaths.employee.candidates.profile(candidate.profileId));

  const doResumeDownload = async () => {
    if (resumeLoading || hasKnownNoResume) return;

    try {
      setResumeLoading(true);
      const response = await downloadCandidateResume(candidate.profileId);
      const resume = response?.data;

      if (resume?.url) {
        openResumeUrl(resume.url, resume.fileName || 'resume');
      }
    } catch (error) {
      console.log(error);
    } finally {
      setResumeLoading(false);
    }
  };

  const handleViewProfile = () => {
    if (isLockedByQuota) {
      upgradeModal.onOpen();
      return;
    }
    if (shouldExplain) {
      setPendingAction('view');
      explainerModal.onOpen();
      return;
    }
    goToProfile();
  };

  const handleResumeDownload = () => {
    if (resumeLoading || hasKnownNoResume) return;
    if (isLockedByQuota) {
      upgradeModal.onOpen();
      return;
    }
    if (shouldExplain) {
      setPendingAction('download');
      explainerModal.onOpen();
      return;
    }
    void doResumeDownload();
  };

  const handleExplainerContinue = async () => {
    explainerModal.onClose();
    if (dontShowAgain) void acknowledgeNotice();
    if (pendingAction === 'download') {
      void doResumeDownload();
    } else if (pendingAction === 'view') {
      goToProfile();
    }
    setPendingAction(null);
  };

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
              onPress={handleViewProfile}
              variant="bordered"
              color="primary"
              radius="lg"
              startContent={isLockedByQuota ? <FiLock /> : <FiEye />}
              className="font-bold"
            >
              View Profile
            </Button>
            <Button
              variant="bordered"
              radius="lg"
              isLoading={resumeLoading}
              isDisabled={hasKnownNoResume}
              startContent={<FiDownload />}
              onPress={handleResumeDownload}
              className="font-bold"
            >
              {hasKnownNoResume ? 'No Resume' : 'Download Resume'}
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

          <p
            className={clsx(
              'mt-2 flex items-center gap-1.5 text-xs font-medium',
              candidate.isUnlocked ? 'text-emerald-600' : 'text-gray-400',
            )}
          >
            {candidate.isUnlocked ? (
              <>
                <FiCheckCircle /> Already unlocked · free to view &amp; download
              </>
            ) : (
              <>
                <FiEye /> Uses 1 profile credit to unlock
              </>
            )}
          </p>
        </div>
      </div>

      <Modal isOpen={upgradeModal.isOpen} onOpenChange={upgradeModal.onOpenChange} size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <FiLock className="text-warning" />
                No profile views left
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-gray-600">
                  You&apos;ve used all your profile views for the current plan. Upgrade your
                  subscription to view more candidate profiles and unlock their contact details.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Not now
                </Button>
                <Button
                  color="primary"
                  className="font-bold"
                  onPress={() => {
                    onClose();
                    router.push(routePaths.employee.plans.list);
                  }}
                >
                  Upgrade now
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={explainerModal.isOpen} onOpenChange={explainerModal.onOpenChange} size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <span aria-hidden>🪙</span>
                Heads up — this uses 1 profile credit
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-gray-600">
                  Your plan includes a set number of candidate unlocks. Here&apos;s how it works:
                </p>
                <ul className="mt-1 flex flex-col gap-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <FiCheckCircle className="mt-0.5 flex-shrink-0 text-primary" />
                    <span>
                      <strong>1 credit unlocks 1 candidate.</strong> Viewing their profile or
                      downloading their resume costs the same single credit.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FiCheckCircle className="mt-0.5 flex-shrink-0 text-primary" />
                    <span>
                      <strong>Unlock once, it&apos;s yours.</strong> After unlocking, viewing and
                      downloading that candidate again is <strong>free</strong>.
                    </span>
                  </li>
                </ul>
                {profileAccess && profileAccess.limit > 0 && (
                  <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                    You have {profileAccess.remaining} of {profileAccess.limit} credits left this
                    cycle.
                  </p>
                )}
                <Checkbox
                  size="sm"
                  isSelected={dontShowAgain}
                  onValueChange={setDontShowAgain}
                  className="mt-3"
                >
                  <span className="text-sm text-gray-600">Don&apos;t show this again</span>
                </Checkbox>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" className="font-bold" onPress={handleExplainerContinue}>
                  Continue &amp; unlock
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </article>
  );
};

export default CandidateCard;
