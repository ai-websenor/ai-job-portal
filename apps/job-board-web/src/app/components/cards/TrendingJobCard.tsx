/* eslint-disable @typescript-eslint/no-unused-vars */
import routePaths from '@/app/config/routePaths';
import { IJob } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import { Card, CardHeader, CardBody, CardFooter, Avatar, Chip, Divider } from '@heroui/react';
import { useRouter } from 'next/navigation';
import {
  HiOutlineMapPin,
  HiOutlineCurrencyDollar,
  HiOutlineClock,
  HiOutlineBuildingOffice2,
} from 'react-icons/hi2';

type Props = {
  job: IJob;
};

const getRelativeTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  } catch (e) {
    return 'Recently';
  }
};

const formatSalary = (min?: number | null, max?: number | null, currency = '₹') => {
  if (min && max) {
    return `${currency}${min.toLocaleString()} - ${max.toLocaleString()}`;
  }
  if (min) return `From ${currency}${min.toLocaleString()}`;
  if (max) return `Up to ${currency}${max.toLocaleString()}`;
  return 'Not disclosed';
};

const TrendingJobCard = ({ job }: Props) => {
  const router = useRouter();

  const title = job?.title || 'Untitled Job';
  const location = job?.location || 'Location unspecified';
  const salaryMin = job?.salaryMin;
  const salaryMax = job?.salaryMax;
  const payRate = job?.payRate;
  const showSalary = job?.showSalary !== false;
  const jobType = job?.jobType || [];
  const workMode = job?.workMode || [];
  const createdAt = job?.createdAt as unknown as string;
  const company = job?.company;
  const employer = job?.employer;

  const companyName =
    company?.name ||
    (employer?.firstName ? CommonUtils.getFullName(job.employer) : 'Unknown Company');
  const defaultLogo = companyName ? companyName.charAt(0).toUpperCase() : 'U';
  const logoUrl = company?.logoUrl || employer?.profilePhoto || undefined;

  return (
    <Card
      className="w-full max-w-[360px] relative group cursor-pointer border border-default-200 hover:border-primary/50 bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
      radius="lg"
      shadow="sm"
      isPressable
      as="div"
      onPress={() => router.push(routePaths.jobs.detail(job?.id))}
    >
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-secondary scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300 rounded-t-lg" />

      <CardHeader className="flex gap-4 px-6 pt-6 pb-2 items-start justify-between">
        <div className="flex gap-4 items-start flex-1 min-w-0">
          <Avatar
            radius="md"
            size="md"
            name={defaultLogo}
            src={logoUrl}
            className="bg-primary/10 text-primary font-bold shrink-0"
          />
          <div className="flex flex-col gap-1 flex-1 overflow-hidden">
            <h3 className="text-large font-bold text-default-900 leading-tight truncate group-hover:text-primary transition-colors block">
              {title}
            </h3>
            <div className="flex items-center gap-1 text-small font-medium text-default-500 truncate">
              <HiOutlineBuildingOffice2 size={14} className="shrink-0" />
              <span className="truncate">{companyName}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardBody className="px-6 py-4 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {jobType?.slice(0, 2).map((type, idx) => (
            <Chip
              key={`type-${idx}`}
              size="sm"
              variant="flat"
              color="primary"
              className="capitalize text-tiny font-medium"
            >
              {(type || '').replace('_', ' ')}
            </Chip>
          ))}
          {workMode?.slice(0, 2).map((mode, idx) => (
            <Chip
              key={`mode-${idx}`}
              size="sm"
              variant="flat"
              color="secondary"
              className="capitalize text-tiny font-medium"
            >
              {(mode || '').replace('_', ' ')}
            </Chip>
          ))}
        </div>

        <div className="flex flex-col gap-3 text-small text-default-600 mt-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-default-100 flex items-center justify-center shrink-0">
              <HiOutlineMapPin className="text-default-500" size={14} />
            </div>
            <span className="truncate">{location}</span>
          </div>
          {showSalary && (salaryMin || salaryMax) && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-default-100 flex items-center justify-center shrink-0">
                <HiOutlineCurrencyDollar className="text-default-500" size={14} />
              </div>
              <div className="flex items-baseline gap-1 truncate">
                <span className="font-semibold text-default-700">
                  {formatSalary(salaryMin, salaryMax, '₹')}
                </span>
                {payRate && (
                  <span className="text-default-400 text-tiny capitalize">/{payRate}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </CardBody>

      <Divider className="opacity-50 mx-6 w-auto" />

      <CardFooter className="px-6 py-4 flex justify-between items-center text-default-500">
        <div className="flex items-center gap-1.5 text-tiny font-medium">
          <HiOutlineClock size={14} className="text-default-400" />
          <span>{createdAt ? getRelativeTime(createdAt) : 'Recently'}</span>
        </div>

        <div className="flex items-center gap-1 text-primary font-medium text-small group-hover:translate-x-1 transition-transform">
          Apply Now
          <span className="text-lg leading-none">→</span>
        </div>
      </CardFooter>
    </Card>
  );
};

export default TrendingJobCard;
