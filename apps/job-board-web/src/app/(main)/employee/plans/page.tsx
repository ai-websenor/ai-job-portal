'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import PlanCard from '@/app/components/cards/PlanCard';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import withAuth from '@/app/hoc/withAuth';
import { IPlan } from '@/app/types/types';
import { useEffect, useState } from 'react';

const page = () => {
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<IPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState(plans?.[0]?.id);

  const getPlans = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.SUBSCRIPTIONS.GET_ALL);
      setPlans(response?.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getPlans();
  }, []);

  return (
    <>
      <title>Subscriptions</title>

      <div className="container mx-auto py-8 px-4 md:px-6">
        <BackButton showLabel />
        <h1 className="text-2xl font-bold mt-1">Subscriptions</h1>

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
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default withAuth(page);
