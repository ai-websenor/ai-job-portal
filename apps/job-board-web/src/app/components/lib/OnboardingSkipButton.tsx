import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import useLocalStorage from '@/app/hooks/useLocalStorage';
import { Button } from '@heroui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

type Props = {
  handleNext?: () => void;
};

const OnboardingSkipButton = ({ handleNext }: Props) => {
  const router = useRouter();
  const params = useSearchParams();
  const defaultStep = params.get('step');
  const { setLocalStorage } = useLocalStorage();
  const [loading, setLoading] = useState(false);

  const handleSkip = async () => {
    try {
      setLoading(true);
      await http.get(ENDPOINTS.CANDIDATE.SKIP_ONBOARDING_STEP);
      setLocalStorage('isOnboardingCompleted', true);
      if (defaultStep == '5') {
        handleNext?.();
      } else {
        router.push(routePaths.videoResume);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="md" isLoading={loading} onPress={handleSkip}>
      Skip for now
    </Button>
  );
};

export default OnboardingSkipButton;
