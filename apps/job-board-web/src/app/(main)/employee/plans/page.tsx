'use client';

import clsx from 'clsx';
import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import PlanCard from '@/app/components/cards/PlanCard';
import PlanPreviewDialog from '@/app/components/dialogs/PlanPreviewDialog';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import StripePaymentModal from '@/app/components/stripe/StripePaymentModal';
import routePaths from '@/app/config/routePaths';
import withAuth from '@/app/hoc/withAuth';
import useGetProfile from '@/app/hooks/useGetProfile';
import permissionUtils from '@/app/utils/permissionUtils';
import { IPlan } from '@/app/types/types';
import { Button } from '@heroui/react';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { AiOutlineTransaction } from 'react-icons/ai';
import { HiOutlineChartBar, HiOutlineClock } from 'react-icons/hi';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';

type ModalType = {
  open: boolean;
  data: any;
};

const page = () => {
  const { getProfile } = useGetProfile();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<IPlan[]>([]);
  const [planPreview, setPlanPreview] = useState<ModalType>({ open: false, data: null });
  const [stripeModal, setStripeModal] = useState<ModalType>({ data: null, open: false });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -420, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 420, behavior: 'smooth' });
    }
  };

  const canPurchase = permissionUtils.hasPermission('subscriptions:plans-manage');
  const visibleNavigations = navigations.filter((item) =>
    permissionUtils.hasPermission(item.permission),
  );

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
      const response = await http.post(ENDPOINTS.SUBSCRIPTIONS.SUBSCRIBE, {
        planId,
        provider: 'stripe',
      });
      if (response?.data) {
        setStripeModal({ data: response?.data, open: true });
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <title>Subscriptions</title>

      <div className="container mx-auto py-8 px-4 md:px-8 max-w-7xl">
        <BackButton showLabel />
        
        <div className="flex items-start justify-between flex-col md:flex-row mt-6 mb-6 gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Subscription Plans</h1>
            <p className="text-gray-500 text-sm font-medium">
              Choose the perfect plan to post jobs, find the right talent and grow your team.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {visibleNavigations.map((item) => (
              <Button
                key={item.path}
                as={Link}
                href={item.path}
                size="sm"
                className="bg-white border border-gray-200 text-gray-700 shadow-sm font-semibold px-4"
                startContent={
                  <span className={clsx(
                    item.label === 'View Usage' ? 'text-[#8070EF]' : '',
                    item.label === 'Subscription History' ? 'text-gray-600' : '',
                    item.label === 'All Transactions' ? 'text-gray-600' : ''
                  )}>
                    {item.startContent}
                  </span>
                }
              >
                {item.label}
              </Button>
            ))}
            
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center w-full">
            <LoadingProgress />
          </div>
        ) : (
          <div className="relative mt-2">
            {!loading && plans?.length > 0 && (
              <div className="mb-4 flex justify-end gap-2 pr-1">
                <Button
                  isIconOnly
                  variant="flat"
                  size="sm"
                  onPress={scrollLeft}
                  className="bg-gray-100 text-gray-700"
                  aria-label="Scroll plans left"
                >
                  <FiArrowLeft size={20} />
                </Button>
                <Button
                  isIconOnly
                  variant="flat"
                  size="sm"
                  onPress={scrollRight}
                  className="bg-gray-100 text-gray-700"
                  aria-label="Scroll plans right"
                >
                  <FiArrowRight size={20} />
                </Button>
              </div>
            )}

            <div 
              ref={scrollContainerRef}
              className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-8 px-1 w-full"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* Sorting plans to ensure consistent order based on the 'rank' or 'sortOrder' from API */}
              {plans?.sort((a, b) => a.sortOrder - b.sortOrder).map((plan) => (
                <div key={plan.id} className="w-[320px] sm:w-[400px] flex-none snap-start flex flex-col mt-4">
                  <PlanCard
                    plan={plan}
                    handleUpgrade={() => setPlanPreview({ open: true, data: plan })}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {stripeModal?.open && (
        <StripePaymentModal
          orderId={stripeModal.data?.orderId}
          paymentId={stripeModal.data?.paymentId}
          amount={stripeModal.data?.amount}
          clientSecret={stripeModal.data?.clientSecret}
          currency={stripeModal.data?.currency}
          isOpen={stripeModal.open}
          onClose={() => setStripeModal({ data: null, open: false })}
        />
      )}

      {planPreview.open && (
        <PlanPreviewDialog
          plan={planPreview.data}
          isOpen={planPreview.open}
          canPurchase={canPurchase}
          onConfirm={() => handleUpgrade(planPreview.data.id)}
          onClose={() => setPlanPreview({ data: null, open: false })}
        />
      )}
    </>
  );
};

export default withAuth(page);

const navigations = [
  {
    label: 'View Usage',
    variant: 'warning',
    path: routePaths.employee.plans.usage,
    permission: 'subscriptions:usage-read',
    startContent: <HiOutlineChartBar size={18} />,
  },
  {
    label: 'Subscription History',
    variant: 'primary',
    path: routePaths.employee.plans.history,
    permission: 'subscriptions:history-read',
    startContent: <HiOutlineClock size={18} />,
  },
  {
    label: 'All Transactions',
    variant: 'success',
    path: routePaths.employee.transactions.list,
    permission: 'subscriptions:transactions-read',
    startContent: <AiOutlineTransaction size={18} />,
  },
];
