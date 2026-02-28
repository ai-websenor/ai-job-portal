'use client';

import FileUploader from '@/app/components/form/FileUploader';
import Resumes from './steps/Resumes';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import useLocalStorage from '@/app/hooks/useLocalStorage';

type Props = {
  errors: any;
  watchedValues: any;
  refetch?: () => void;
  setLoading: (val: boolean) => void;
};

const OnboardingResume = ({ setLoading, refetch, errors, watchedValues }: Props) => {
  const { setLocalStorage } = useLocalStorage();

  const handleChangeFile = async (file: File) => {
    if (!file?.name) return;
    try {
      setLoading(true);
      const payload = new FormData();
      payload.append('file', file);
      const response = await http.post(ENDPOINTS.CANDIDATE.UPLOAD_RESUME, payload);
      if (response?.data) {
        refetch?.();
        setLocalStorage('resumeData', JSON.stringify(response?.data?.structuredData));
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FileUploader accept="application/*" onChange={handleChangeFile} />
      {errors?.resume && <p className="text-red-500 text-sm">{errors?.resume?.message}</p>}

      {watchedValues?.resumes?.length > 0 && (
        <Resumes resumes={watchedValues?.resumes} refetch={refetch} isDeletable />
      )}
    </>
  );
};

export default OnboardingResume;
