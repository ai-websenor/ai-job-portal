'use client';

import useSignedUrl from '@/app/hooks/useSignedUrl';
import FileUploader from '../form/FileUploader';
import ENDPOINTS from '@/app/api/endpoints';
import { Control, useWatch } from 'react-hook-form';
import Image from 'next/image';
import { BiTrash } from 'react-icons/bi';
import { useState } from 'react';
import LoadingProgress from '../lib/LoadingProgress';

type Props = {
  control: Control<any>;
  refetch: () => void;
  setValue: (key: string, value: any) => void;
};

const EmployeeCompanyImages = ({ control, refetch, setValue }: Props) => {
  const [loading, setLoading] = useState(false);
  const { logoUrl, bannerUrl, gstDocumentUrl } = useWatch({ control });

  const { handleUpload, loading: uploadLoading } = useSignedUrl({
    onSuccess: () => {
      refetch();
    },
    endpoints: {
      preSignedEndpoint: ENDPOINTS.EMPLOYER.GST_DOCUMENT.PRE_SIGNED_URL,
      confirmUploadEndpoint: ENDPOINTS.EMPLOYER.GST_DOCUMENT.CONFIRM_UPLOAD,
    },
  });

  const handleRemove = (key: 'logoUrl' | 'bannerUrl' | 'gstDocumentUrl') => setValue(key, '');

  return (
    <div className="bg-white p-5 sm:p-10 rounded-lg w-full ">
      <h3 className="font-medium text-xl mb-5">Images</h3>
      {loading || uploadLoading ? (
        <LoadingProgress />
      ) : (
        <div className="grid gap-7">
          <div>
            <h3 className="font-medium mb-3">Company Logo</h3>
            {logoUrl ? (
              <div className="relative w-fit">
                <Image src={logoUrl} alt="logo" width={100} height={100} className="rounded-full" />
                <button
                  type="button"
                  onClick={() => handleRemove('logoUrl')}
                  className="absolute top-1 right-1 p-1 text-white bg-danger rounded-full"
                >
                  <BiTrash size={13} />
                </button>
              </div>
            ) : (
              <FileUploader
                accept="image/*"
                onChange={(file) => handleUpload({ fileKey: 'logoUrl', file, duration: 0 })}
              />
            )}
          </div>

          <div>
            <h3 className="font-medium mb-3">GST Document</h3>
            <FileUploader accept="application/*" onChange={(v) => {}} />
          </div>

          <h3 className="font-medium mb-3">Company Banner</h3>
          <FileUploader accept="image/*" onChange={(v) => {}} />
        </div>
      )}
    </div>
  );
};

export default EmployeeCompanyImages;
