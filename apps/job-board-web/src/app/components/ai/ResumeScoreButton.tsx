'use client';

import AiActionButton from '@/app/components/ai/AiActionButton';
import routePaths from '@/app/config/routePaths';
import useLocalStorage from '@/app/hooks/useLocalStorage';
import useResumeScoreStore from '@/app/store/useResumeScoreStore';
import { useRouter } from 'next/navigation';

type Props = {
  jobId: string;
};

/**
 * The trigger in the job page action row. It only flips the shared window
 * state — `ResumeScoreWidget` (mounted once on the page) owns the fetching, so
 * the panel keeps its result when this row re-renders.
 *
 * The `data-resume-score-trigger` attribute is how the panel finds this button
 * again to hand focus back when it is closed.
 */
const ResumeScoreButton = ({ jobId }: Props) => {
  const router = useRouter();
  const { getLocalStorage } = useLocalStorage();
  const open = useResumeScoreStore((state) => state.open);

  const handlePress = () => {
    // Same guard as "Save Job": scoring reads the signed-in candidate's own
    // profile, so there is nothing to score when signed out.
    const token = getLocalStorage('token');
    if (!token) {
      router.push(routePaths.auth.login);
      return;
    }

    open(jobId);
  };

  return (
    <span data-resume-score-trigger className="inline-flex">
      <AiActionButton
        label="Check Resume Score"
        onPress={handlePress}
        tooltip="See how your profile matches this job"
        aria-label="Check how your resume scores against this job"
      />
    </span>
  );
};

export default ResumeScoreButton;
