import { Button, Card, CardBody, Chip } from '@heroui/react';
import clsx from 'clsx';
import { IoCheckmarkCircle } from 'react-icons/io5';
import { IPlan } from '@/app/types/types';

type Props = {
  selectedPlan: string;
  plan: IPlan & { isPopular?: boolean };
  setSelectedPlan: (id: string) => void;
  handleUpgrade: () => void;
};

const PlanCard = ({ plan, selectedPlan, setSelectedPlan, handleUpgrade }: Props) => {
  const isSelected = selectedPlan === plan.id;
  const isHotVacancy = plan.slug === 'hot-vacancy';
  const isFree = plan.slug === 'free';

  return (
    <Card
      as="div"
      radius="lg"
      isPressable
      shadow="sm"
      onPress={() => {
        if (isFree) return;
        setSelectedPlan(plan.id);
      }}
      className={clsx(
        'relative overflow-hidden p-1 transition-all duration-500 hover:translate-y-[-8px]',
        {
          'ring-4 ring-primary ring-offset-2': isSelected,
          'border-none': isHotVacancy,
          'bg-white border border-gray-100': !isHotVacancy,
          'cursor-not-allowed': isFree,
        },
      )}
    >
      {isHotVacancy && <div className="absolute inset-0 bg-gradient-to-br  opacity-90" />}

      <CardBody
        className={clsx('relative z-10 flex flex-col gap-6 h-full p-6 rounded-[20px]', {
          'bg-white/95 backdrop-blur-md': isHotVacancy,
          'bg-white': !isHotVacancy,
        })}
      >
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <h2 className="font-bold text-2xl tracking-tight text-gray-900">{plan.name}</h2>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-widest">
              {plan.billingCycle === 'one_time' ? 'One Time Payment' : 'Subscription'}
            </p>
          </div>
          {isHotVacancy && (
            <Chip variant="flat" color="primary" size="sm" className="font-bold animate-pulse">
              MOST POPULAR
            </Chip>
          )}
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-gray-500 text-xl font-medium">{plan.currency}</span>
          <span className="text-5xl font-black tracking-tighter text-primary">
            {parseInt(plan.price).toLocaleString()}
          </span>
        </div>

        <p className="text-gray-600 text-sm leading-relaxed min-h-[40px]">{plan.description}</p>

        <div className="flex flex-col gap-4 flex-grow">
          <div className="h-px bg-gray-100 w-full" />

          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Features</p>
            <div className="grid gap-3">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3 group">
                  <IoCheckmarkCircle
                    className={clsx('flex-shrink-0 mt-0.5 transition-colors text-primary')}
                    size={18}
                  />
                  <p className="text-gray-700 text-sm font-medium group-hover:text-black transition-colors">
                    {feature}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto space-y-4">
            <div className="grid grid-cols-3 gap-2 py-3 bg-gray-50 rounded-xl px-2">
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Jobs</p>
                <p className="text-sm font-bold text-gray-900">{plan.jobPostLimit}</p>
              </div>
              <div className="text-center border-x border-gray-200">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Resumes</p>
                <p className="text-sm font-bold text-gray-900">{plan.resumeAccessLimit}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Featured</p>
                <p className="text-sm font-bold text-gray-900">{plan.featuredJobs}</p>
              </div>
            </div>

            {selectedPlan === plan?.id && !isFree && (
              <Button fullWidth className="font-medium" color="primary" onPress={handleUpgrade}>
                Upgrade
              </Button>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default PlanCard;
