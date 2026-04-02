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
  disabled?: boolean;
  onStepClick?: (stepId: number) => void;
};

const Stepper = ({ steps, activeStep, maxStepReached, disabled, onStepClick }: Props) => {
  return (
    <nav aria-label="Progress" className={clsx('w-full mb-10 transition-opacity', disabled && 'opacity-50 pointer-events-none')}>
      <ol className="flex items-center w-full h-10">
        {steps.map((step, index) => {
          const isCompleted = step.id < activeStep;
          const isActive = step.id === activeStep;
          const isRestricted = step.id > maxStepReached;
          const isClickable = !disabled && !isRestricted && !isActive && onStepClick;

          return (
            <li
              key={step.id}
              className={clsx('relative flex items-center', index !== steps.length - 1 && 'w-full')}
            >
              <button
                type="button"
                disabled={!isClickable && !isActive}
                onClick={() => isClickable && onStepClick(step.id)}
                className={clsx(
                  'group flex flex-col items-center focus:outline-none',
                  isClickable ? 'cursor-pointer' : 'cursor-default',
                  !isClickable && !isActive && 'disabled:cursor-not-allowed',
                )}
              >
                <span
                  className={clsx(
                    'z-10 flex items-center justify-center rounded-full border-2 transition-all duration-500 ease-in-out',
                    isActive ? 'h-10 w-10' : 'h-8 w-8',
                    isCompleted && 'bg-primary border-primary text-white',
                    isActive && 'border-primary bg-primary text-white',
                    !isCompleted && !isActive && 'border-gray-300 bg-white text-gray-500',
                    isRestricted && 'opacity-50',
                    !isRestricted && 'group-hover:border-primary/50',
                  )}
                >
                  {isCompleted ? (
                    <BiCheck className="h-6 w-6" size={24} />
                  ) : (
                    <span className={clsx(isActive ? 'text-sm font-bold' : 'text-xs font-medium')}>{step.id}</span>
                  )}
                </span>

                <span
                  className={clsx(
                    'absolute -bottom-7 text-xs font-semibold capitalize transition-colors duration-500 ease-in-out',
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
