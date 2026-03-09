import { employeeDashboardAnalyticsData } from '@/app/config/data';
import EmployeeDashboardAnalyticsCard from '../cards/EmployeeDashboardAnalyticsCard';
import { useEffect, useState } from 'react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';

const EmployeeAnalyticsSection = () => {
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);

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

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
      {employeeDashboardAnalyticsData.map((item, index) => (
        <EmployeeDashboardAnalyticsCard {...item} key={index} icon={item.icon} />
      ))}
    </div>
  );
};

export default EmployeeAnalyticsSection;
