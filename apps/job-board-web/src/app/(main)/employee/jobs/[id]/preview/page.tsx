'use client';

import { Card, CardBody, Tabs, Tab, Divider, Chip, Button } from '@heroui/react';
import {
  HiOutlineLocationMarker,
  HiOutlineClock,
  HiOutlineEye,
  HiOutlineUsers,
  HiOutlineShare,
  HiOutlineDocumentText,
} from 'react-icons/hi';
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
import { MdOutlineStopCircle, MdOutlineWorkOutline } from 'react-icons/md';
import permissionUtils from '@/app/utils/permissionUtils';
import PublishJobButton from '@/app/components/lib/PublishJobButton';
import FeaturedJobTag from '@/app/components/lib/FeaturedJobTag';
import { JobStatus } from '@/app/types/enum';
import { FaCheck } from 'react-icons/fa';
import ConfirmationDialog from '@/app/components/dialogs/ConfirmationDialog';

function page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<IJob | null>(null);
  const [isReadMore, setIsReadMore] = useState(true);
  const [holdConfirmation, setHoldConfirmation] = useState(false);
  const [analytics, setAnalytics] = useState<Record<string, number> | null>(null);

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

  const getAnalytics = async () => {
    try {
      const response = await http.get(ENDPOINTS.EMPLOYER.JOBS.ANALYTICS(id));
      setAnalytics(response?.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getDetails();
    getAnalytics();
  }, []);

  const toggleReadMore = () => setIsReadMore(!isReadMore);

  const updateJobStatus = async (status: JobStatus) => {
    try {
      setLoading(true);
      await http.patch(ENDPOINTS.EMPLOYER.JOBS.UPDATE_STATUS(id), { status });
      getDetails();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <title>{job?.title}</title>
      <div className="container mx-auto py-6 px-4 md:px-6 space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <BackButton showLabel path={routePaths.employee.jobs.list} />
          {!job?.isActive ? (
            job?.id &&
            permissionUtils.hasPermission('jobs:publish') && (
              <PublishJobButton jobId={id} refetch={getDetails} />
            )
          ) : (
            <Chip size="sm" variant="flat" color={'success'}>
              Published
            </Chip>
          )}
        </div>

        {loading ? (
          <LoadingProgress />
        ) : job?.id ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card shadow="sm" className="border-none bg-white">
                <CardBody className="flex flex-row items-center gap-4 p-4">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <HiOutlineEye className="text-blue-600 text-xl" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-0.5">Total Views</p>
                    <p className="text-xl font-bold text-foreground">
                      {analytics?.totalViews || 0}
                    </p>
                  </div>
                </CardBody>
              </Card>

              <Card shadow="sm" className="border-none bg-white">
                <CardBody className="flex flex-row items-center gap-4 p-4">
                  <div className="p-3 bg-green-50 rounded-xl">
                    <HiOutlineUsers className="text-green-600 text-xl" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-0.5">Unique Views</p>
                    <p className="text-xl font-bold text-foreground">
                      {analytics?.uniqueViews || 0}
                    </p>
                  </div>
                </CardBody>
              </Card>

              <Card shadow="sm" className="border-none bg-white">
                <CardBody className="flex flex-row items-center gap-4 p-4">
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <HiOutlineShare className="text-purple-600 text-xl" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-0.5">Total Shares</p>
                    <p className="text-xl font-bold text-foreground">
                      {analytics?.totalShares || 0}
                    </p>
                  </div>
                </CardBody>
              </Card>

              <Card shadow="sm" className="border-none bg-white">
                <CardBody className="flex flex-row items-center gap-4 p-4">
                  <div className="p-3 bg-orange-50 rounded-xl">
                    <HiOutlineDocumentText className="text-orange-600 text-xl" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-0.5">Applications</p>
                    <p className="text-xl font-bold text-foreground">
                      {analytics?.applicationCount || 0}
                    </p>
                  </div>
                </CardBody>
              </Card>
            </div>

            <Card shadow="sm" className="border-none bg-white p-2">
              <CardBody className="flex flex-row items-start gap-4 p-4">
                {job?.company?.logoUrl || user?.company?.logoUrl ? (
                  <Image
                    src={job?.company?.logoUrl || user?.company?.logoUrl || ''}
                    alt="Company"
                    height={300}
                    width={300}
                    className="w-[100px] h-auto rounded-lg text-large object-contain"
                  />
                ) : (
                  <div className="min-w-[80px] w-[80px] h-[80px] md:min-w-[100px] md:w-[100px] md:h-[100px] border border-gray-100 bg-gray-50 flex items-center justify-center rounded-lg">
                    <MdOutlineWorkOutline size={40} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-3 flex-wrap pb-1 w-full">
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold text-foreground">{job?.title}</h1>
                      {job?.isFeatured && <FeaturedJobTag />}
                    </div>
                    <div className="flex items-center gap-3">
                      {job?.status !== JobStatus.hold ? (
                        <Button
                          size="sm"
                          color="warning"
                          className="text-white"
                          startContent={<MdOutlineStopCircle size={18} />}
                          onPress={() => setHoldConfirmation(true)}
                        >
                          Hold Job
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          color="success"
                          className="text-white"
                          startContent={<FaCheck size={16} />}
                          onPress={() => updateJobStatus(JobStatus.active)}
                        >
                          Active
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-primary">
                    {job?.company?.name || user?.company?.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-gray-500 text-xs">
                    <span className="font-medium">
                      {job?.showSalary
                        ? `${CommonUtils.formatSalary(job?.salaryMin!, job?.salaryMax!)}${job?.payRate ? ` / ${CommonUtils.keyIntoTitle(job.payRate)}` : ''}`
                        : 'Salary Undisclosed'}
                    </span>
                    {job?.location && (
                      <span className="flex items-center gap-1.5 font-medium border-l border-gray-300 pl-4">
                        <HiOutlineLocationMarker className="text-lg text-gray-400" />
                        {job.location}
                      </span>
                    )}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-4">
                      {job?.category?.name && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">Category</p>
                          <p className="text-sm text-gray-900 font-medium capitalize">
                            {job.category.name}{' '}
                            {job.subCategory?.name && (
                              <span className="text-gray-500 font-normal ml-1">
                                ({job.subCategory.name})
                              </span>
                            )}
                          </p>
                        </div>
                      )}

                      {job?.qualification && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">Qualification</p>
                          <p className="text-sm text-gray-900 font-medium capitalize">
                            {job.qualification}
                          </p>
                        </div>
                      )}

                      {job?.certification && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">Certification</p>
                          <p className="text-sm text-gray-900 font-medium capitalize">
                            {job.certification}
                          </p>
                        </div>
                      )}

                      {job?.immigrationStatus && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">
                            Immigration Status
                          </p>
                          <p className="text-sm text-gray-900 font-medium capitalize">
                            {CommonUtils.keyIntoTitle(job.immigrationStatus)}
                          </p>
                        </div>
                      )}

                      {job?.travelRequirements && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">
                            Travel Requirements
                          </p>
                          <p className="text-sm text-gray-900 font-medium capitalize">
                            {job.travelRequirements}
                          </p>
                        </div>
                      )}

                      {job?.deadline && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">
                            Application Deadline
                          </p>
                          <p className="text-sm text-gray-900 font-medium">
                            {new Date(job.deadline).toLocaleDateString()}
                          </p>
                        </div>
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
                        {job?.company?.name || 'This company'} is committed to providing excellent
                        opportunities and fostering a diverse and inclusive workplace.
                      </p>
                    </section>

                    <Card shadow="none" className="border border-gray-100 bg-gray-50/30">
                      <CardBody className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm items-center">
                          <span className="text-gray-500 font-medium">Company Name</span>
                          <span className="text-gray-900 font-semibold">
                            {job?.company?.name || 'N/A'}
                          </span>
                        </div>
                        {job?.location && (
                          <>
                            <Divider className="bg-gray-100" />
                            <div className="grid grid-cols-2 gap-4 text-sm items-center">
                              <span className="text-gray-500 font-medium">Location</span>
                              <span className="text-gray-900 font-semibold text-wrap break-words">
                                {job.location}
                              </span>
                            </div>
                          </>
                        )}
                        {(job?.employer?.firstName ||
                          job?.employer?.email ||
                          job?.employer?.phone) && <Divider className="bg-gray-100" />}
                        {job?.employer?.firstName && (
                          <div className="grid grid-cols-2 gap-4 text-sm items-center mt-3">
                            <span className="text-gray-500 font-medium">Contact Person</span>
                            <span className="text-gray-900 font-semibold text-wrap break-words">
                              {CommonUtils.getFullName(job.employer)}
                            </span>
                          </div>
                        )}
                        {job?.employer?.email && (
                          <>
                            <Divider className="bg-gray-100" />
                            <div className="grid grid-cols-2 gap-4 text-sm items-center mt-3">
                              <span className="text-gray-500 font-medium">Email</span>
                              <span className="text-gray-900 font-semibold text-wrap break-words">
                                {job.employer.email}
                              </span>
                            </div>
                          </>
                        )}
                        {job?.employer?.phone && (
                          <>
                            <Divider className="bg-gray-100" />
                            <div className="grid grid-cols-2 gap-4 text-sm items-center mt-3">
                              <span className="text-gray-500 font-medium">Phone</span>
                              <span className="text-gray-900 font-semibold text-wrap break-words">
                                {job.employer.phone}
                              </span>
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

      {holdConfirmation && (
        <ConfirmationDialog
          color="warning"
          title="Hold Job"
          isOpen={holdConfirmation}
          onClose={() => setHoldConfirmation(false)}
          onConfirm={() => updateJobStatus(JobStatus.hold)}
          message="It will be removed from search results and is no longer visible to new candidates."
        />
      )}
    </>
  );
}

export default withAuth(page);
