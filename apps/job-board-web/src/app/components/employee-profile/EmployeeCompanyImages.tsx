'use client';

import useSignedUrl from '@/app/hooks/useSignedUrl';
import FileUploader from '../form/FileUploader';
import ENDPOINTS from '@/app/api/endpoints';
import { Control, useWatch } from 'react-hook-form';
import Image from 'next/image';
import { BiTrash } from 'react-icons/bi';
import { useState } from 'react';
import LoadingProgress from '../lib/LoadingProgress';
import http from '@/app/api/http';
import { HiOutlineDocumentText, HiOutlineDownload } from 'react-icons/hi';
import { Button, Card, CardBody } from '@heroui/react';
import CommonUtils from '@/app/utils/commonUtils';

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

  const handleUploadLogoBanner = async (file: File, key: 'logo' | 'banner') => {
    const payload = new FormData();
    payload.append('file', file);

    try {
      setLoading(true);

      const url =
        key === 'logo'
          ? ENDPOINTS.EMPLOYER.COMPANY_LOGO_UPLOAD
          : ENDPOINTS.EMPLOYER.COMPANY_BANNER_UPLOAD;

      await http.post(url, payload);

      refetch();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

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
                onChange={(file) => handleUploadLogoBanner(file, 'logo')}
              />
            )}
          </div>

          <div>
            <h3 className="font-medium mb-3">GST Document</h3>
            {gstDocumentUrl ? (
              <Card
                as="div"
                isPressable
                shadow="none"
                radius="sm"
                className={'border-primary bg-secondary border cursor-pointer hover:bg-secondary'}
              >
                <CardBody className="flex flex-row items-center justify-between py-3 px-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <HiOutlineDocumentText className="text-primary text-xl flex-shrink-0" />
                    <p className="text-sm font-medium truncate text-neutral-800">asdsad</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="primary"
                      aria-label="Download resume"
                      onPress={() => window.open(gstDocumentUrl)}
                    >
                      <HiOutlineDownload size={20} />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="danger"
                      aria-label="Delete resume"
                      onPress={() => handleRemove('gstDocumentUrl')}
                    >
                      <BiTrash size={20} />
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ) : (
              <FileUploader
                accept="application/*"
                onChange={(file) => handleUpload({ fileKey: 'gstDocumentUrl', file, duration: 0 })}
              />
            )}
          </div>

          <div>
            <h3 className="font-medium mb-3">Company Banner</h3>
            {bannerUrl ? (
              <div className="relative w-full">
                <Image
                  src={bannerUrl}
                  alt="banner"
                  width={800}
                  height={800}
                  className="rounded-lg w-full h-[300px] object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemove('bannerUrl')}
                  className="absolute top-1 right-1 p-1 text-white bg-danger rounded-full"
                >
                  <BiTrash size={13} />
                </button>
              </div>
            ) : (
              <FileUploader
                accept="image/*"
                onChange={(v) => handleUploadLogoBanner(v, 'banner')}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeCompanyImages;
