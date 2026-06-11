'use client';

import { useEffect, useState } from 'react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import { Button, Skeleton } from '@heroui/react';
import {
  FiArrowRight,
  FiBriefcase,
  FiUsers,
  FiCheckCircle,
  FiCalendar,
  FiXCircle,
  FiAward,
} from 'react-icons/fi';

type EmployeeAnalytics = {
  jobsCreated?: number;
  totalApplications?: number;
  shortlisted?: number;
  upcomingInterviews?: number;
  rejected?: number;
  hired?: number;
};

const EmployeeAnalyticsSection = () => {
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<EmployeeAnalytics | null>(null);

  const getAnalytics = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.EMPLOYER.APPLICATIONS.ANALYTICS);
      setAnalytics(response?.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAnalytics();
  }, []);

  const stats = [
    {
      title: 'Jobs Created',
      value: analytics?.jobsCreated || 0,
      icon: FiBriefcase,
      tone: 'text-blue-600 bg-blue-50',
      action: 'Manage',
    },
    {
      title: 'Total Applications',
      value: analytics?.totalApplications || 0,
      icon: FiUsers,
      tone: 'text-violet-600 bg-violet-50',
      action: 'Review',
    },
    {
      title: 'Shortlisted',
      value: analytics?.shortlisted || 0,
      icon: FiCheckCircle,
      tone: 'text-emerald-600 bg-emerald-50',
      action: 'View',
    },
    {
      title: 'Upcoming Interviews',
      value: analytics?.upcomingInterviews || 0,
      icon: FiCalendar,
      tone: 'text-orange-600 bg-orange-50',
      action: 'Schedule',
    },
    {
      title: 'Rejected',
      value: analytics?.rejected || 0,
      icon: FiXCircle,
      tone: 'text-red-600 bg-red-50',
      action: 'Review',
    },
    {
      title: 'Selected',
      value: analytics?.hired || 0,
      icon: FiAward,
      tone: 'text-primary bg-secondary',
      action: 'View',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, index) => (
          <Skeleton key={index} className="h-[136px] w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.title}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-950">{item.value}</p>
                <p className="text-xs font-medium leading-5 text-gray-500">{item.title}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="light"
              color="primary"
              className="h-7 min-w-0 px-0 text-xs font-bold"
              endContent={<FiArrowRight size={14} />}
            >
              {item.action}
            </Button>
          </div>
        );
      })}
    </div>
  );
};

export default EmployeeAnalyticsSection;
