import clsx from 'clsx';
import { BiCheck } from 'react-icons/bi';

type Step = {
  id: number;
  title: string;
};

type Props = {
  steps: Step[];
  activeStep: number;
  maxStepReached: number;
};

const Stepper = ({ steps, activeStep, maxStepReached }: Props) => {
  return (
    <nav aria-label="Progress" className="w-full mb-14">
      <ol className="flex items-center w-full">
        {steps.map((step, index) => {
          const isCompleted = step.id < activeStep;
          const isActive = step.id === activeStep;
          const isRestricted = step.id > maxStepReached;

          return (
            <li
              key={step.id}
              className={clsx('relative flex items-center', index !== steps.length - 1 && 'w-full')}
            >
              <button
                type="button"
                disabled={!isActive}
                className="group flex flex-col items-center focus:outline-none disabled:cursor-not-allowed cursor-default"
              >
                <span
                  className={clsx(
                    'z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors duration-200',
                    isCompleted && 'bg-primary border-primary text-white',
                    isActive && 'border-primary bg-white text-primary ring-4 ring-primary/10',
                    !isCompleted && !isActive && 'border-gray-300 bg-white text-gray-500',
                    isRestricted && 'opacity-50',
                    !isRestricted && 'group-hover:border-primary/50',
                  )}
                >
                  {isCompleted ? (
                    <BiCheck className="h-6 w-6" size={24} />
                  ) : (
                    <span className="text-xs font-medium">{step.id}</span>
                  )}
                </span>

                <span
                  className={clsx(
                    'absolute -bottom-[44px] text-xs font-medium uppercase tracking-wider',
                    isActive ? 'text-primary' : 'text-gray-500',
                    isRestricted && 'opacity-40',
                  )}
                >
                  {step.title}
                </span>
              </button>

              {index !== steps.length - 1 && (
                <div
                  className={clsx(
                    'mx-2 h-0.5 w-full transition-colors duration-500',
                    step.id < activeStep ? 'bg-primary' : 'bg-gray-200',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Stepper;
