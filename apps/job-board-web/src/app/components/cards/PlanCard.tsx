import { Button, Card, CardBody } from '@heroui/react';
import clsx from 'clsx';
import { IoCheckmarkCircle } from 'react-icons/io5';
import { FiGift, FiStar, FiSpeaker, FiAward } from 'react-icons/fi';
import { HiOutlineDocumentText, HiOutlineUserGroup, HiOutlineUsers } from 'react-icons/hi';
import { IPlan } from '@/app/types/types';
import useUserStore from '@/app/store/useUserStore';
import { AiFillRocket } from 'react-icons/ai';
import { IconType } from 'react-icons';

type Props = {
  plan: IPlan;
  handleUpgrade: () => void;
};

// Keep the card accents tied to the active app theme.
const planThemeMap: Record<string, { bg: string; text: string; icon: IconType }> = {
  free: {
    bg: 'bg-[var(--secondary-color)]',
    text: 'text-primary',
    icon: FiGift,
  },
  'premium-plan': {
    bg: 'bg-[var(--secondary-color)]',
    text: 'text-primary',
    icon: FiAward,
  },
  classified: {
    bg: 'bg-[var(--secondary-color)]',
    text: 'text-primary',
    icon: FiSpeaker,
  },
  standard: {
    bg: 'bg-[var(--secondary-color)]',
    text: 'text-primary',
    icon: FiAward,
  },
  'hot-vacancy': {
    bg: 'bg-[var(--secondary-color)]',
    text: 'text-primary',
    icon: AiFillRocket,
  },
};

const PlanCard = ({ plan, handleUpgrade }: Props) => {
  const { user } = useUserStore();
  const activePlan = user?.activeSubscription?.planId === plan?.id;
  const isHotVacancy = plan.slug === 'hot-vacancy';

  const theme = planThemeMap[plan.slug] || planThemeMap.free;
  const Icon = theme.icon;

  return (
    <Card
      as="div"
      radius="lg"
      shadow="sm"
      className={clsx(
        'relative overflow-visible transition-all duration-300 w-full bg-white h-full flex flex-col p-4',
        {
          'border-2': activePlan,
          'border-transparent': !activePlan,
        }
      )}
      style={{
        borderColor: activePlan ? 'var(--primary-color)' : 'transparent',
      }}
    >
      {activePlan && (
        <div
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-[11px] font-bold flex items-center gap-1.5 z-20 shadow-sm uppercase tracking-wider"
          style={{ backgroundColor: 'var(--primary-color)' }}
        >
          <FiStar size={12} className="fill-white" />
          CURRENT PLAN
        </div>
      )}

      {isHotVacancy && !activePlan && (
        <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full text-primary bg-[var(--secondary-color)] text-[10px] font-bold flex items-center gap-1 z-20 uppercase tracking-wider">
          <span className="animate-pulse">🔥</span> MOST POPULAR
        </div>
      )}

      <CardBody className="relative z-10 flex flex-col gap-3 p-4.5 h-full">
        <div className="flex items-center gap-2.5">
          <div
            className={clsx(
              'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
              theme.bg
            )}
            style={{ color: 'var(--primary-color)' }}
          >
            <Icon size={22} className={theme.text} />
          </div>

          <div className="flex flex-col">
            <h2 className="font-extrabold text-xl text-gray-900 leading-tight">{plan.name}</h2>
            <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mt-0.5">
              {plan.billingCycle === 'one_time' ? 'One-time payment' : 'Subscription'}
            </p>
          </div>
        </div>

        <div className="flex items-end gap-1 mt-0">
          <span className={clsx('text-xl font-bold mb-1', theme.text)}>
            {plan.currency === 'INR' ? 'INR' : plan.currency}
          </span>
          <span className={clsx('text-3xl font-extrabold tracking-tight leading-none', theme.text)}>
            {parseInt(plan.price).toLocaleString()}
          </span>
          <div className="flex flex-col ml-1 mb-1">
            {plan.price !== '0.00' ? (
              <span className="text-gray-400 text-[11px] font-bold uppercase">
                {plan.billingCycle === 'one_time' ? 'One-time' : '/ month'}
              </span>
            ) : (
              <span className="text-gray-400 text-[11px] font-bold uppercase">Forever</span>
            )}
          </div>
        </div>

        <p className="text-gray-600 text-[13px] leading-snug line-clamp-2">
          {plan.description || 'Perfect for growing companies with advanced hiring needs.'}
        </p>

        <div className="w-full h-px bg-gray-100" />

        <div className="flex flex-col gap-1.5 flex-grow mt-0">
          {plan.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-2.5">
              <IoCheckmarkCircle className={clsx('flex-shrink-0 mt-0.5', theme.text)} size={16} />
              <p className="text-gray-600 text-[13px]">{feature}</p>
            </div>
          ))}
        </div>

        <div className="mt-2.5 flex flex-col gap-2.5">
          <div className={clsx('grid grid-cols-4 py-2 rounded-xl px-1', theme.bg)}>
            <div className="flex flex-col items-center text-center px-1">
              <div className="flex items-center gap-1 text-gray-500 mb-0">
                <HiOutlineDocumentText size={12} />
                <span className="text-[10px] font-medium">Jobs</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{plan.jobPostLimit}</span>
            </div>
            <div className="flex flex-col items-center text-center px-1">
              <div className="flex items-center gap-1 text-gray-500 mb-0">
                <HiOutlineUsers size={12} />
                <span className="text-[10px] font-medium">Profiles</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{plan.profileAccessLimit}</span>
            </div>
            <div className="flex flex-col items-center text-center px-1">
              <div className="flex items-center gap-1 text-gray-500 mb-0">
                <FiStar size={12} />
                <span className="text-[10px] font-medium">Featured</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{plan.featuredJobs}</span>
            </div>
            <div className="flex flex-col items-center text-center px-1">
              <div className="flex items-center gap-1 text-gray-500 mb-0">
                <HiOutlineUserGroup size={12} />
                <span className="text-[10px] font-medium">Members</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{plan.memberAddingLimit}</span>
            </div>
          </div>

          <Button
            fullWidth
            className="font-semibold shadow-sm"
            style={{
              backgroundColor: activePlan ? 'var(--primary-color)' : 'var(--secondary-color)',
              color: activePlan ? '#ffffff' : 'var(--primary-color)',
            }}
            variant={activePlan ? 'solid' : 'flat'}
            onPress={activePlan ? undefined : handleUpgrade}
            disabled={activePlan}
          >
            {activePlan && <IoCheckmarkCircle size={18} />}
            {activePlan ? 'Current Plan' : plan.price === '0.00' ? 'Get Started Free' : 'Purchase Now'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

export default PlanCard;
