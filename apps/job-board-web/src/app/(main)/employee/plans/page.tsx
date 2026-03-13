'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import PlanCard from '@/app/components/cards/PlanCard';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import routePaths from '@/app/config/routePaths';
import withAuth from '@/app/hoc/withAuth';
import useGetProfile from '@/app/hooks/useGetProfile';
import { IPlan } from '@/app/types/types';
import { addToast, Button } from '@heroui/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { HiOutlineChartBar, HiOutlineClock } from 'react-icons/hi';

const page = () => {
  const { getProfile } = useGetProfile();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<IPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState(plans?.[0]?.id);

  const getPlans = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.SUBSCRIPTIONS.GET_ALL);
      setPlans(response?.data);
      await getProfile();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getPlans();
  }, []);

  const handleUpgrade = async (planId: string) => {
    try {
      setLoading(true);
      await http.post(ENDPOINTS.SUBSCRIPTIONS.UPGRADE, {
        planId,
      });
      addToast({
        title: 'Success',
        color: 'success',
        description: 'Plan subscribed successfully',
      });
      getPlans();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <title>Subscriptions</title>

      <div className="container mx-auto py-8 px-4 md:px-6">
        <BackButton showLabel />
        <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
          <h1 className="text-2xl font-bold mt-1">Subscriptions</h1>
          <div className="flex items-center gap-3">
            {navigations.map((item) => (
              <Button
                key={item.path}
                as={Link}
                href={item.path}
                size="sm"
                className="text-white"
                color={item.variant as any}
                startContent={item.startContent}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingProgress />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 items-stretch mt-7 w-full">
            {plans?.map((plan) => (
              <PlanCard
                plan={plan}
                key={plan.id}
                selectedPlan={selectedPlan}
                setSelectedPlan={setSelectedPlan}
                handleUpgrade={() => handleUpgrade(plan.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default withAuth(page);

const navigations = [
  {
    label: 'View Usage',
    variant: 'warning',
    path: routePaths.employee.plans.usage,
    startContent: <HiOutlineChartBar size={18} />,
  },
  {
    label: 'Subscription History',
    variant: 'primary',
    path: routePaths.employee.plans.history,
    startContent: <HiOutlineClock size={18} />,
  },
];
