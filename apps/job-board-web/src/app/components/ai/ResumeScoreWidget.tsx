'use client';

import ResumeScoreModal from '@/app/components/ai/ResumeScoreModal';
import useResumeScore from '@/app/hooks/useResumeScore';
import useResumeScoreStore from '@/app/store/useResumeScoreStore';
import { Button, Tooltip } from '@heroui/react';
import { HiOutlineSparkles } from 'react-icons/hi2';

type Props = {
  jobId: string;
};

/** Hands focus back to the trigger in the job action row after a close. */
const focusTrigger = () => {
  if (typeof document === 'undefined') return;
  document.querySelector<HTMLElement>('[data-resume-score-trigger] button')?.focus();
};

/**
 * The floating container for the Resume Health Check, mounted once on the job
 * page beside `<Chatbot />`.
 *
 * Position matters. The chatbot owns the corner (`bottom-8 right-8`) and grows
 * a 500px card upwards from it, so anything stacked directly above the corner
 * disappears behind that card the moment someone opens the chat. The minimised
 * bubble therefore sits *beside* the chatbot bubble rather than above it, and
 * the two read as one row of controls.
 *
 * The expanded panel starts above that row so the bubbles stay clickable, and
 * takes `z-[101]` so that if both panels are somehow open at once the stacking
 * is decided here rather than by DOM order. The app's true overlays
 * (NotificationBar, the offline banner, the splash screen) live at `z-[9999]`
 * and must stay on top of both.
 *
 * A fixed card rather than a HeroUI `Modal`: a modal is a portal overlay with
 * no minimised form, and the whole point here is that the panel survives a trip
 * to the profile page and back.
 */
const ResumeScoreWidget = ({ jobId }: Props) => {
  const status = useResumeScoreStore((state) => state.status);
  const open = useResumeScoreStore((state) => state.open);
  const minimise = useResumeScoreStore((state) => state.minimise);
  const close = useResumeScoreStore((state) => state.close);

  const { data, loading, error, check, refresh } = useResumeScore(jobId);

  if (status === 'closed') return null;

  const score = data?.status === 'ok' && typeof data.score === 'number' ? data.score : null;

  const handleClose = () => {
    close();
    focusTrigger();
  };

  return (
    <div
      className={
        status === 'open'
          ? 'fixed bottom-24 right-8 z-[101] flex flex-col items-end gap-4'
          : 'fixed bottom-8 right-24 z-[100] flex flex-col items-end gap-4'
      }
    >
      {status === 'open' ? (
        <ResumeScoreModal
          data={data}
          loading={loading}
          error={error}
          onCheck={check}
          onRefresh={refresh}
          onMinimise={minimise}
          onClose={handleClose}
        />
      ) : (
        <Tooltip content="Resume Health Check" placement="left">
          <Button
            isIconOnly
            radius="full"
            onPress={() => open(jobId)}
            aria-label={
              score === null
                ? 'Open your resume health check'
                : `Open your resume health check. Your score is ${score} out of 100.`
            }
            className="relative shadow-lg w-12 h-12 text-xl animate-appearance-in bg-gradient-to-r from-primary to-secondary text-white"
          >
            <HiOutlineSparkles aria-hidden />
            {score !== null && (
              <span
                className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-white text-[10px] font-semibold text-primary flex items-center justify-center shadow-sm border border-primary/20"
                aria-hidden
              >
                {score}
              </span>
            )}
          </Button>
        </Tooltip>
      )}
    </div>
  );
};

export default ResumeScoreWidget;
