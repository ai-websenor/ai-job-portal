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
import { BsShareFill } from 'react-icons/bs';
import { FiMapPin } from 'react-icons/fi';
import { IoIosBookmark } from 'react-icons/io';
import { IoBookmarkOutline } from 'react-icons/io5';

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
          <Image
            src={job?.company?.logoUrl || '/assets/images/google.png'}
            alt={job?.company?.name || 'Anonymous Company'}
            width={80}
            height={80}
            className="w-20 h-20 object-contain"
          />
          <div className="grid gap-1">
            <p className="text-gray-500">{job?.company?.name || 'Anonymous Company'}</p>
            <h1 className="text-2xl font-medium">{job?.title}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center items-start gap-3 mb-2">
              <p className="text-gray-500 text-sm">
                {job?.showSalary
                  ? CommonUtils.formatSalary(job?.salaryMin, job?.salaryMax)
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
            <Tooltip content="Share Job" placement="top">
              <Button isLoading={loading} size="md">
                <BsShareFill size={12} />
              </Button>
            </Tooltip>
            <Tooltip content="Save Job" placement="top">
              <Button onPress={toggleJobSave} isLoading={loading} size="md">
                {job?.isSaved ? <IoIosBookmark size={18} /> : <IoBookmarkOutline size={18} />}
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
            <div>
              <p className="font-medium text-lg">Job Description</p>
              <p className="text-gray-500 mt-2">{job?.description}</p>
            </div>
          )}

          {activeTab === '2' && (
            <div>
              <p className="font-medium text-lg">About Company</p>
              <p className="text-gray-500 mt-2">
                Reference site about Lorem Ipsum, giving information on its origins, as well as a
                random Lipsum generator. Reference site about Lorem Ipsum, giving information on its
                origins, as well as a random Lipsum generator. Reference site about Lorem Ipsum,
                giving information on its origins, as well as a random Lipsum generator. Reference
                site about Lorem Ipsum, giving information on its origins, as well as a random
                Lipsum generator. Reference site about Lorem Ipsum, giving information on its
                origins, as well as a random Lipsum generator. Reference site about Lorem Ipsum,
                giving information on its origins, as well as a random Lipsum generator.
              </p>

              <div className="mt-5 grid gap-3">
                <div className="grid sm:grid-cols-4 grid-cols-2 gap-10">
                  <p className="text-sm text-gray-600">Company Name</p>
                  <p className="text-sm">{job?.company?.name || 'Anonymous Company'}</p>
                </div>
                <div className="grid sm:grid-cols-4 grid-cols-2 gap-10">
                  <p className="text-sm text-gray-600">Headquarters</p>
                  <p className="text-sm">{job?.company?.location || 'N/A'}</p>
                </div>
                <div className="grid sm:grid-cols-4 grid-cols-2 gap-10">
                  <p className="text-sm text-gray-600">Website</p>
                  <p className="text-sm">N/A</p>
                </div>
                <div className="grid sm:grid-cols-4 grid-cols-2 gap-10">
                  <p className="text-sm text-gray-600">Qualification</p>
                  <p className="text-sm">{job?.qualification ?? 'N/A'}</p>
                </div>
                <div className="grid sm:grid-cols-4 grid-cols-2 gap-10">
                  <p className="text-sm text-gray-600">Certification</p>
                  <p className="text-sm">{job?.certification || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === '3' && (
            <div>
              <div>
                <p className="font-medium text-lg">Skills</p>
                <ul className="grid gap-2 mt-1 ml-5">
                  {job?.skills?.map((skill) => (
                    <li key={skill} className="list-disc">
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <p className="font-medium text-lg">Benefits</p>
                <ul className="grid gap-2 mt-1 ml-5">
                  <li className="list-disc">{job?.benefits}</li>
                </ul>
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
    title: 'About',
  },
  {
    key: '3',
    title: 'Skills',
  },
];
