'use client';

import { Card, CardBody, Tabs, Tab, Avatar, Divider, Chip } from '@heroui/react';
import { HiOutlineLocationMarker, HiOutlineCurrencyDollar, HiOutlineClock } from 'react-icons/hi';
import BackButton from '@/app/components/lib/BackButton';
import withAuth from '@/app/hoc/withAuth';
import { use, useEffect, useState } from 'react';
import { IJob } from '@/app/types/types';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import useUserStore from '@/app/store/useUserStore';
import NoDataFound from '@/app/components/lib/NoDataFound';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';

function page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<IJob | null>(null);

  const getDetails = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.EMPLOYER.JOBS.DETAILS(id!));
      console.log(response?.data);
      setJob(response?.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getDetails();
  }, []);

  return (
    <>
      <title>UI/UX Designer</title>
      <div className="container mx-auto py-6 px-4 md:px-6 space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <BackButton showLabel />
        </div>
        {loading ? (
          <LoadingProgress />
        ) : job?.id ? (
          <>
            <Card shadow="sm" className="border-none bg-white p-2">
              <CardBody className="flex flex-row items-center gap-4 p-4">
                <Avatar
                  isBordered
                  color="primary"
                  src={user?.company?.logoUrl!}
                  className="w-16 h-16 rounded-lg text-large bg-secondary p-2"
                  radius="sm"
                />
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-foreground">UX Designer</h1>
                  <p className="text-sm font-semibold text-primary">Google</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-gray-500 text-xs">
                    <span className="flex items-center gap-1.5">
                      <HiOutlineCurrencyDollar className="text-lg text-gray-400" />
                      120K/yr-130K/yr
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <HiOutlineLocationMarker className="text-lg text-gray-400" />
                      Bengaluru, Karnataka
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <HiOutlineClock className="text-lg text-gray-400" />
                      Full Time
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
                    <section>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Job Description</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        You'll be part of a team working on designing and building Search
                        experiences for New Internet Users and Next Billion Users (NBU), in a team
                        that is research-led and focused on building Search engagement...{' '}
                        <span className="text-primary font-semibold cursor-pointer">Read More</span>
                      </p>
                    </section>

                    <Divider />

                    <section>
                      <h3 className="text-lg font-bold text-gray-900 mb-3">Skills</h3>
                      <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                        <li>
                          Interest or experience in designing for emerging markets and new internet
                          users.
                        </li>
                        <li>
                          Strong core mobile interaction design skills to solve complex user flows
                          and visually organized data and to build cohesive design frameworks.
                        </li>
                        <li>Solid command of typography, layout, and information hierarchy.</li>
                        <li>Strong verbal, written, and visual communication.</li>
                      </ul>
                    </section>

                    <Divider />

                    <section>
                      <h3 className="text-lg font-bold text-gray-900 mb-3">Benefits</h3>
                      <div className="flex flex-wrap gap-2">
                        <Chip
                          variant="flat"
                          color="primary"
                          className="bg-secondary text-primary font-medium"
                        >
                          Financial & Compensation
                        </Chip>
                        <Chip
                          variant="flat"
                          color="primary"
                          className="bg-secondary text-primary font-medium"
                        >
                          Health & Wellness
                        </Chip>
                        <Chip
                          variant="flat"
                          color="primary"
                          className="bg-secondary text-primary font-medium"
                        >
                          Work Flexibility
                        </Chip>
                        <Chip
                          variant="flat"
                          color="primary"
                          className="bg-secondary text-primary font-medium"
                        >
                          Career Growth
                        </Chip>
                      </div>
                    </section>
                  </div>
                </Tab>

                <Tab key="about" title="About Company" className="p-5">
                  <div className="space-y-6 bg-white p-5">
                    <section>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">About company</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        You'll be part of a team working on designing and building Search
                        experiences for New Internet Users and Next Billion Users (NBU), in a team
                        that is research-led and focused on building Search engagement...{' '}
                        <span className="text-primary font-semibold cursor-pointer">Read More</span>
                      </p>
                    </section>

                    <Card shadow="none" className="border border-gray-100 bg-gray-50/30">
                      <CardBody className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <span className="text-gray-500 font-medium">Company Name</span>
                          <span className="text-gray-900 font-semibold">Google</span>
                        </div>
                        <Divider className="bg-gray-100" />
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <span className="text-gray-500 font-medium">Headquarters</span>
                          <span className="text-gray-900 font-semibold">
                            14, Ahmednagar, Bengaluru
                          </span>
                        </div>
                        <Divider className="bg-gray-100" />
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <span className="text-gray-500 font-medium">Website</span>
                          <a
                            href="https://www.google.com"
                            target="_blank"
                            className="text-primary font-semibold hover:underline"
                          >
                            www.google.com
                          </a>
                        </div>
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
