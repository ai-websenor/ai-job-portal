import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import { Button } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const OnboardingSkipButton = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSkip = async () => {
    try {
      setLoading(true);
      await http.get(ENDPOINTS.CANDIDATE.SKIP_ONBOARDING_STEP);
      router.push(routePaths.videoResume);
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
