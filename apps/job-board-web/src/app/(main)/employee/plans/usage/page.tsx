'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import withAuth from '@/app/hoc/withAuth';
import { PlanUsage } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import { Card, CardBody, Divider, Progress } from '@heroui/react';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { FiBriefcase, FiCheckCircle, FiFileText, FiStar } from 'react-icons/fi';

const page = () => {
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<PlanUsage | null>(null);

  const getUsage = async () => {
    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.SUBSCRIPTIONS.USAGE);
      if (response?.data) {
        setUsage(response.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUsage();
  }, []);

  const UsageCard = ({
    title,
    used,
    limit,
    icon: Icon,
    color = 'primary' as const,
  }: {
    title: string;
    used: number;
    limit: number;
    icon: any;
    color?: 'primary' | 'success' | 'warning' | 'danger' | 'secondary' | 'default';
  }) => {
    const percentage = limit > 0 ? (used / limit) * 100 : 0;
    const remaining = limit - used;

    return (
      <Card shadow="none" className="border border-default-100">
        <CardBody className="p-5">
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl bg-${color}/10 text-${color}`}>
              <Icon size={24} />
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400 font-medium">{title}</p>
              <h3 className="text-2xl font-bold">
                {used} <span className="text-sm font-normal text-gray-400">/ {limit}</span>
              </h3>
            </div>
          </div>

          <Progress
            value={percentage}
            color={color}
            size="sm"
            className="mb-3"
            classNames={{
              indicator: percentage >= 90 ? 'bg-danger' : '',
            }}
          />

          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-medium">Usage Progress</span>
            <span className={`font-bold ${remaining <= 1 ? 'text-danger' : 'text-gray-600'}`}>
              {remaining} Remaining
            </span>
          </div>
        </CardBody>
      </Card>
    );
  };

  return (
    <>
      <title>Usage</title>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <BackButton showLabel />

        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mt-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Plan Usage</h1>
            <p className="text-gray-400 mt-1">
              Detailed overview of your current subscription usage and limits
            </p>
          </div>
          {usage?.endDate && (
            <div className="bg-primary/5 px-4 py-2 rounded-lg border border-primary/10">
              <p className="text-xs text-primary font-semibold uppercase tracking-wider">
                Plan expires on
              </p>
              <p className="font-bold text-gray-700">
                {dayjs(usage.endDate).format('DD MMM YYYY')}
              </p>
            </div>
          )}
        </div>

        {loading ? (
          <LoadingProgress />
        ) : usage ? (
          <div className="space-y-8">
            {/* Header Info Card */}
            <Card shadow="none" className="border border-default-100 ">
              <CardBody className="p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                  <div className="col-span-1">
                    <p className="text-sm text-gray-400 font-medium uppercase tracking-wide">
                      Current Plan
                    </p>
                    <h2 className="text-3xl font-black text-primary mt-1">
                      {usage.planName?.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                        Active
                      </span>
                      <span className="text-sm text-gray-500 capitalize">
                        • {CommonUtils.keyIntoTitle(usage.billingCycle)} Billing
                      </span>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-400 font-semibold uppercase">
                        Start Date
                      </span>
                      <span className="font-bold text-gray-700">
                        {dayjs(usage.startDate).format('DD MMMM, YYYY')}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-400 font-semibold uppercase">
                        End Date
                      </span>
                      <span className="font-bold text-gray-700">
                        {dayjs(usage.endDate).format('DD MMMM, YYYY')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Divider className="my-4" />

            <div>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                Limits & Allowances
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <UsageCard
                  title="Job Postings"
                  used={usage.usage.jobPosting.used}
                  limit={usage.usage.jobPosting.limit}
                  icon={FiBriefcase}
                  color="primary"
                />

                <UsageCard
                  title="Featured Jobs"
                  used={usage.usage.featuredJobs.used}
                  limit={usage.usage.featuredJobs.limit}
                  icon={FiStar}
                  color="secondary"
                />

                <UsageCard
                  title="Resume Access"
                  used={usage.usage.resumeAccess.used}
                  limit={usage.usage.resumeAccess.limit}
                  icon={FiFileText}
                  color="success"
                />

                <UsageCard
                  title="Members Limit"
                  used={usage.usage.memberAdding.used}
                  limit={usage.usage.memberAdding.limit}
                  icon={FiCheckCircle}
                  color="warning"
                />
              </div>
            </div>

            {/* Tips/Info Section */}
            <div className="bg-default-50 rounded-2xl p-6 border border-default-100 border-dashed">
              <h4 className="font-bold text-gray-700 mb-2">Need more capacity?</h4>
              <p className="text-sm text-gray-500">
                Upgrade your plan to increase your posting limits and access more premium features
                to find the best talent faster.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-medium">
              No usage data available for the current period.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default withAuth(page);
