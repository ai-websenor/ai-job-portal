'use client';

import { Card, CardBody, Tabs, Tab, Divider, Chip } from '@heroui/react';
import { HiOutlineLocationMarker, HiOutlineClock } from 'react-icons/hi';
import BackButton from '@/app/components/lib/BackButton';
import withAuth from '@/app/hoc/withAuth';
import { use, useEffect, useState } from 'react';
import { IJob } from '@/app/types/types';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import useUserStore from '@/app/store/useUserStore';
import NoDataFound from '@/app/components/lib/NoDataFound';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import CommonUtils from '@/app/utils/commonUtils';
import routePaths from '@/app/config/routePaths';
import Image from 'next/image';
import { MdOutlineWorkOutline } from 'react-icons/md';

function page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<IJob | null>(null);
  const [isReadMore, setIsReadMore] = useState(true);

  const getDetails = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.EMPLOYER.JOBS.DETAILS(id!));
      setJob(response?.data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getDetails();
  }, []);

  const toggleReadMore = () => setIsReadMore(!isReadMore);

  return (
    <>
      <title>{job?.title}</title>
      <div className="container mx-auto py-6 px-4 md:px-6 space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <BackButton showLabel path={routePaths.employee.jobs.list} />
        </div>

        {loading ? (
          <LoadingProgress />
        ) : job?.id ? (
          <>
            <Card shadow="sm" className="border-none bg-white p-2">
              <CardBody className="flex flex-row items-start gap-4 p-4">
                {user?.company?.logoUrl ? (
                  <Image
                    src={user?.company?.logoUrl!}
                    alt="Company"
                    height={300}
                    width={300}
                    className="w-[100px] rounded-lg text-large object-contain"
                  />
                ) : (
                  <MdOutlineWorkOutline size={20} className="text-gray-600" />
                )}
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-foreground">{job?.title}</h1>
                  <p className="text-sm font-semibold text-primary">{user?.company?.name}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-gray-500 text-xs">
                    {CommonUtils.formatSalary(job?.salaryMin!, job?.salaryMax!)}
                    <span className="flex items-center gap-1.5 font-medium">
                      <HiOutlineLocationMarker className="text-lg text-gray-400" />
                      {job?.location}
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>

            <div className="w-full">
              <Tabs
                aria-label="Job details"
                variant="light"
                fullWidth
                className="bg-secondary rounded-lg"
              >
                <Tab key="description" title="Description" className="p-5">
                  <div className="space-y-6 bg-white p-5">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-gray-500 text-xs">
                      {job?.experienceMin !== undefined && job?.experienceMax !== undefined && (
                        <span className="flex items-center gap-1.5 font-medium">
                          <HiOutlineClock className="text-lg text-gray-400" />
                          {job.experienceMin}-{job.experienceMax} Years Exp.
                        </span>
                      )}
                      {job?.jobType && job.jobType.length > 0 && (
                        <span className="flex items-center gap-1.5 font-medium capitalize">
                          <HiOutlineClock className="text-lg text-gray-400" />
                          {CommonUtils.keyIntoTitle(job.jobType.join(', '))}
                        </span>
                      )}
                      {job?.workMode && job.workMode.length > 0 && (
                        <Chip
                          size="sm"
                          variant="flat"
                          color="secondary"
                          className="text-[10px] h-5 capitalize"
                        >
                          {CommonUtils.keyIntoTitle(job.workMode.join(', '))}
                        </Chip>
                      )}
                    </div>

                    <Divider />

                    {job?.description && (
                      <section>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Job Description</h3>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                          {isReadMore ? job.description.slice(0, 400) : job.description}
                          {job.description.length > 400 && (
                            <span
                              onClick={toggleReadMore}
                              className="text-primary font-semibold cursor-pointer ml-1"
                            >
                              {isReadMore ? '...Read More' : ' Read Less'}
                            </span>
                          )}
                        </p>
                      </section>
                    )}

                    {job?.skills && job.skills.length > 0 && (
                      <>
                        <Divider />
                        <section>
                          <h3 className="text-lg font-bold text-gray-900 mb-3">Skills</h3>
                          <div className="flex flex-wrap gap-2">
                            {job.skills.map((skill, index) => (
                              <Chip key={index} variant="flat" size="sm" color="primary">
                                {skill}
                              </Chip>
                            ))}
                          </div>
                        </section>
                      </>
                    )}

                    {job?.benefits && (
                      <>
                        <Divider />
                        <section>
                          <h3 className="text-lg font-bold text-gray-900 mb-3">Benefits</h3>
                          <p className="text-sm text-gray-600 leading-relaxed">{job?.benefits}</p>
                        </section>
                      </>
                    )}
                  </div>
                </Tab>

                <Tab key="about" title="About Company" className="p-5">
                  <div className="space-y-6 bg-white p-5">
                    <section>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">About company</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {job?.company?.name || 'Company Name'} is committed to providing excellent
                        opportunities...
                      </p>
                    </section>

                    <Card shadow="none" className="border border-gray-100 bg-gray-50/30">
                      <CardBody className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <span className="text-gray-500 font-medium">Company Name</span>
                          <span className="text-gray-900 font-semibold">
                            {job?.company?.name || 'N/A'}
                          </span>
                        </div>
                        {job?.location && (
                          <>
                            <Divider className="bg-gray-100" />
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <span className="text-gray-500 font-medium">Location</span>
                              <span className="text-gray-900 font-semibold">{job.location}</span>
                            </div>
                          </>
                        )}
                      </CardBody>
                    </Card>
                  </div>
                </Tab>
              </Tabs>
            </div>
          </>
        ) : (
          <NoDataFound />
        )}
      </div>
    </>
  );
}

export default withAuth(page);
