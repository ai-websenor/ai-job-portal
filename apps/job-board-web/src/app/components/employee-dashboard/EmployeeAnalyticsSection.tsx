'use client';

import { useEffect, useState } from 'react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import { Skeleton } from '@heroui/react';
import {
  FiBriefcase,
  FiUsers,
  FiCheckCircle,
  FiCalendar,
  FiXCircle,
  FiAward,
} from 'react-icons/fi';
import EmployeeDashboardAnalyticsCard from '../cards/EmployeeDashboardAnalyticsCard';

const EmployeeAnalyticsSection = () => {
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

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
    },
    {
      title: 'Total Applications',
      value: analytics?.totalApplications || 0,
      icon: FiUsers,
    },
    {
      title: 'Shortlisted',
      value: analytics?.shortlisted || 0,
      icon: FiCheckCircle,
    },
    {
      title: 'Upcoming Interviews',
      value: analytics?.upcomingInterviews || 0,
      icon: FiCalendar,
    },
    {
      title: 'Rejected',
      value: analytics?.rejected || 0,
      icon: FiXCircle,
    },
    {
      title: 'Hired',
      value: analytics?.hired || 0,
      icon: FiAward,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, index) => (
          <Skeleton key={index} className="rounded-2xl h-[120px] w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {stats.map((item, index) => (
        <EmployeeDashboardAnalyticsCard
          key={index}
          title={item.title}
          value={item.value.toString()}
          icon={item.icon}
        />
      ))}
    </div>
  );
};

export default EmployeeAnalyticsSection;
