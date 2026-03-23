'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import useLocalStorage from '@/app/hooks/useLocalStorage';
import { IJob } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import { addToast, Button, Chip, Tab, Tabs, Tooltip } from '@heroui/react';
import clsx from 'clsx';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FiMapPin } from 'react-icons/fi';
import { IoIosBookmark } from 'react-icons/io';
import { IoBookmarkOutline, IoShareSocialOutline } from 'react-icons/io5';
import { MdOutlineWorkOutline } from 'react-icons/md';

type Props = {
  job: IJob | null;
  hideIcons?: boolean;
  refetch?: () => void;
};

const JobDetails = ({ job, hideIcons = false, refetch }: Props) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { getLocalStorage } = useLocalStorage();
  const [activeTab, setActiveTab] = useState('1');

  const toggleJobSave = async () => {
    const token = getLocalStorage('token');
    if (!token) {
      router.push(routePaths.auth.login);
      return;
    }

    try {
      setLoading(true);
      const res: any = job?.isSaved
        ? await http.delete(ENDPOINTS.JOBS.SAVE(job?.id as string))
        : await http.post(ENDPOINTS.JOBS.SAVE(job?.id as string), {});
      addToast({
        color: 'success',
        title: 'Success',
        description: res?.message,
      });
      refetch?.();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-lg w-full">
      <div className="flex gap-10 flex-col sm:flex-row items-start justify-between">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          {job?.company?.logoUrl ? (
            <Image
              src={job?.company?.logoUrl}
              alt={job?.company?.name || 'Anonymous Company'}
              width={80}
              height={80}
              className="w-20 h-20 object-contain"
            />
          ) : (
            <MdOutlineWorkOutline className="text-5xl text-gray-400" />
          )}
          <div className="grid gap-1">
            <p className="text-gray-500">{job?.company?.name || 'Anonymous Company'}</p>
            <h1 className="text-2xl font-medium">{job?.title}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center items-start gap-3 mb-2">
              <p className="text-gray-500 text-sm">
                {job?.showSalary
                  ? CommonUtils.formatSalary(job?.salaryMin!, job?.salaryMax!)
                  : 'Salary Undisclosed'}
              </p>
              <div className="flex gap-1 items-center text-gray-500">
                <FiMapPin size={16} />
                <p className="text-sm">{job?.location}</p>
              </div>
            </div>
            <div className="flex gap-4 flex-wrap">
              {job?.jobType?.map((item) => (
                <Chip key={item} color="primary" size="sm" variant="bordered">
                  {CommonUtils.keyIntoTitle(item)}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        {!hideIcons && (
          <div className="flex items-center gap-3">
            <Tooltip content="Save Job" placement="top">
              <Button onPress={toggleJobSave} isLoading={loading} size="md">
                {job?.isSaved ? <IoIosBookmark size={18} /> : <IoBookmarkOutline size={18} />}
              </Button>
            </Tooltip>
            <Tooltip content="Share" placement="top">
              <Button isLoading={loading} size="md">
                <IoShareSocialOutline size={18} />
              </Button>
            </Tooltip>
            <Button
              onPress={() => router.push(routePaths.jobs.apply(job?.id as string))}
              isLoading={loading}
              size="md"
              color="primary"
              disabled={job?.isApplied}
              className={clsx({ 'cursor-not-allowed': job?.isApplied })}
            >
              {job?.isApplied ? 'Applied' : 'Apply Now'}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-10">
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key.toString())}
          color="primary"
          variant="underlined"
          className="mb-5"
        >
          {tabs.map((tab) => (
            <Tab key={tab.key} title={tab.title} className="font-medium" />
          ))}
        </Tabs>

        <div className="px-2">
          {activeTab === '1' && (
            <div className="flex flex-col gap-8">
              {job?.description && (
                <div>
                  <p className="font-medium text-lg mb-3">Job Description</p>
                  <p className="text-gray-500 whitespace-pre-wrap leading-relaxed">
                    {job?.description}
                  </p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-6 bg-gray-50 border border-gray-100 p-5 rounded-lg">
                {((job?.experienceMin !== null && job?.experienceMin !== undefined) ||
                  (job?.experienceMax !== null && job?.experienceMax !== undefined)) && (
                  <div>
                    <p className="text-gray-800 font-medium mb-1">Experience</p>
                    <p className="text-gray-500 text-sm">
                      {job?.experienceMin ?? 0}{' '}
                      {job?.experienceMax ? `- ${job.experienceMax}` : '+'} Years
                    </p>
                  </div>
                )}

                {job?.jobType && job.jobType.length > 0 && (
                  <div>
                    <p className="text-gray-800 font-medium mb-1">Job Type</p>
                    <div className="flex gap-2 flex-wrap">
                      {job.jobType.map((type) => (
                        <span key={type} className="text-gray-500 text-sm">
                          {CommonUtils.keyIntoTitle(type)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {job?.workMode && job.workMode.length > 0 && (
                  <div>
                    <p className="text-gray-800 font-medium mb-1">Work Mode</p>
                    <div className="flex gap-2 flex-wrap">
                      {job.workMode.map((mode) => (
                        <span key={mode} className="text-gray-500 text-sm">
                          {CommonUtils.keyIntoTitle(mode)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {job?.payRate && (job?.salaryMin !== null || job?.salaryMax !== null) && (
                  <div>
                    <p className="text-gray-800 font-medium mb-1">Salary Component</p>
                    <p className="text-gray-500 text-sm">
                      {job?.showSalary
                        ? `${job.salaryMin ?? 0} - ${job.salaryMax ?? ''}`
                        : 'Undisclosed'}{' '}
                      ({CommonUtils.keyIntoTitle(job.payRate)})
                    </p>
                  </div>
                )}

                {(job?.category?.name || job?.subCategory?.name) && (
                  <div>
                    <p className="text-gray-800 font-medium mb-1">Category</p>
                    <p className="text-gray-500 text-sm">
                      {[job?.category?.name, job?.subCategory?.name].filter(Boolean).join(' - ')}
                    </p>
                  </div>
                )}

                {job?.qualification && (
                  <div>
                    <p className="text-gray-800 font-medium mb-1">Qualification</p>
                    <p className="text-gray-500 text-sm">{job.qualification}</p>
                  </div>
                )}

                {job?.certification && (
                  <div>
                    <p className="text-gray-800 font-medium mb-1">Certification</p>
                    <p className="text-gray-500 text-sm">{job.certification}</p>
                  </div>
                )}

                {job?.travelRequirements && (
                  <div>
                    <p className="text-gray-800 font-medium mb-1">Travel Requirements</p>
                    <p className="text-gray-500 text-sm">{job.travelRequirements}</p>
                  </div>
                )}

                {job?.immigrationStatus && (
                  <div>
                    <p className="text-gray-800 font-medium mb-1">Immigration Status</p>
                    <p className="text-gray-500 text-sm">
                      {CommonUtils.keyIntoTitle(job.immigrationStatus)}
                    </p>
                  </div>
                )}

                {job?.deadline && (
                  <div>
                    <p className="text-gray-800 font-medium mb-1">Application Deadline</p>
                    <p className="text-gray-500 text-sm">
                      {new Date(job.deadline).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {job?.skills && job.skills.length > 0 && (
                <div>
                  <p className="font-medium text-lg mb-3">Skills</p>
                  <div className="flex gap-2 flex-wrap">
                    {job.skills.map((skill) => (
                      <Chip key={skill} color="primary" variant="flat">
                        {skill}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {job?.benefits && (
                <div>
                  <p className="font-medium text-lg mb-3">Benefits</p>
                  <p className="text-gray-500 whitespace-pre-wrap leading-relaxed">
                    {job.benefits}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === '2' && (
            <div className="flex flex-col gap-6">
              {(job?.company as any)?.description && (
                <div>
                  <p className="font-medium text-lg mb-3">About Company</p>
                  <p className="text-gray-500 whitespace-pre-wrap leading-relaxed">
                    {(job?.company as any)?.description}
                  </p>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-100 p-5 rounded-lg grid gap-4">
                {job?.company?.name && (
                  <div className="grid sm:grid-cols-4 grid-cols-2 gap-4">
                    <p className="text-sm text-gray-800 font-medium">Company Name</p>
                    <p className="text-sm text-gray-500">{job.company.name}</p>
                  </div>
                )}
                {job?.employer && (job?.employer?.firstName || job?.employer?.lastName) && (
                  <div className="grid sm:grid-cols-4 grid-cols-2 gap-4">
                    <p className="text-sm text-gray-800 font-medium">Employer Name</p>
                    <p className="text-sm text-gray-500">
                      {[job.employer?.firstName, job.employer?.lastName].filter(Boolean).join(' ')}
                    </p>
                  </div>
                )}
                {job?.employer?.email && (
                  <div className="grid sm:grid-cols-4 grid-cols-2 gap-4">
                    <p className="text-sm text-gray-800 font-medium">Email Address</p>
                    <p className="text-sm text-gray-500">{job.employer.email}</p>
                  </div>
                )}
                {job?.employer?.phone && (
                  <div className="grid sm:grid-cols-4 grid-cols-2 gap-4">
                    <p className="text-sm text-gray-800 font-medium">Contact Number</p>
                    <p className="text-sm text-gray-500">{job.employer.phone}</p>
                  </div>
                )}
                {(job?.company as any)?.location && (
                  <div className="grid sm:grid-cols-4 grid-cols-2 gap-4">
                    <p className="text-sm text-gray-800 font-medium">Headquarters</p>
                    <p className="text-sm text-gray-500">{(job?.company as any)?.location}</p>
                  </div>
                )}
                {(job?.company as any)?.website && (
                  <div className="grid sm:grid-cols-4 grid-cols-2 gap-4">
                    <p className="text-sm text-gray-800 font-medium">Website</p>
                    <a
                      href={(job?.company as any)?.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {(job?.company as any)?.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetails;

const tabs = [
  {
    key: '1',
    title: 'Description',
  },
  {
    key: '2',
    title: 'About Company',
  },
];
