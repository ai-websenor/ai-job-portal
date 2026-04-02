'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import { IResume } from '@/app/types/types';
import { addToast, Button, Card, CardBody } from '@heroui/react';
import clsx from 'clsx';
import { useState } from 'react';
import { HiOutlineDocumentText, HiOutlineDownload, HiOutlineExternalLink, HiOutlineTrash } from 'react-icons/hi';
import ConfirmationDialog from '@/app/components/dialogs/ConfirmationDialog';

type Props = {
  refetch?: () => void;
  resumes: IResume[];
  selected?: string;
  onSelect?: (id: string) => void;
  isDownloadable?: boolean;
  isDeletable?: boolean;
};

const Resumes = ({ resumes, selected, onSelect, isDownloadable, isDeletable, refetch }: Props) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string }>({ show: false, id: '' });
  const [openConfirm, setOpenConfirm] = useState<{ show: boolean; id: string }>({ show: false, id: '' });

  const onDelete = async (id: string) => {
    try {
      setLoadingAction(`delete-${id}`);
      await http.delete(ENDPOINTS.CANDIDATE.DELETE_RESUME(id));
      refetch?.();
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingAction(null);
    }
  };

  const markPrimary = async (id: string) => {
    try {
      setLoadingAction(`primary-${id}`);
      await http.post(ENDPOINTS.CANDIDATE.MARK_AS_PRIMARY(id), {});
      refetch?.();
      addToast({
        color: 'success',
        title: 'Success',
        description: 'Resume has been marked as primary successfully.',
      });
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      setLoadingAction(`open-${id}`);
      const response = await http.get(ENDPOINTS.CANDIDATE.RESUME_DOWNLOAD(id));
      if (response?.data?.url) {
        window.open(response?.data?.url, '_blank');
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="my-5 space-y-3">
      {openConfirm.show && (
        <ConfirmationDialog
          isOpen={openConfirm.show}
          onClose={() => setOpenConfirm({ show: false, id: '' })}
          onConfirm={() => handleDownload(openConfirm.id)}
          title="Open Resume"
          color="primary"
          message="This will open your resume file in a new browser tab."
        />
      )}
      {deleteConfirm.show && (
        <ConfirmationDialog
          isOpen={deleteConfirm.show}
          onClose={() => setDeleteConfirm({ show: false, id: '' })}
          onConfirm={() => onDelete(deleteConfirm.id)}
          title="Delete Resume"
          color="danger"
          message={
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2"><span className="mt-0.5">&#x2022;</span>This resume file will be permanently deleted from your profile.</li>
              <li className="flex gap-2"><span className="mt-0.5">&#x2022;</span>Pre-filled data (personal info, education, skills, experience) will remain saved.</li>
              <li className="flex gap-2"><span className="mt-0.5">&#x2022;</span>Employers will no longer be able to download this file.</li>
              <li className="flex gap-2"><span className="mt-0.5">&#x2022;</span>Uploading a new resume later will overwrite your existing details with newly parsed data.</li>
            </ul>
          }
        />
      )}
      {resumes?.map((file) => {
        return (
          <Card
            as="div"
            isPressable
            key={file.id}
            shadow="none"
            radius="sm"
            onClick={() => onSelect ? onSelect(file?.id) : setOpenConfirm({ show: true, id: file.id })}
            className={clsx('bg-neutral-100 cursor-pointer hover:bg-secondary', {
              'border-primary bg-secondary border': selected === file.id,
            })}
          >
            <CardBody className="flex flex-row items-center justify-between py-3 px-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <HiOutlineDocumentText className="text-primary text-xl flex-shrink-0" />
                <span className="text-sm font-medium truncate text-neutral-800 hover:underline">
                  {file.fileName}
                </span>
                {file?.isDefault && (
                  <div className="bg-secondary text-xs text-primary font-medium px-2 py-1 rounded-full">
                    Default
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="primary"
                  aria-label="Open resume in new tab"
                  isLoading={loadingAction === `open-${file.id}`}
                  onPress={() => setOpenConfirm({ show: true, id: file.id })}
                >
                  <HiOutlineExternalLink size={20} />
                </Button>

                {!file?.isDefault && selected === file.id && (
                  <Button
                    size="sm"
                    variant="bordered"
                    color="primary"
                    radius="full"
                    className="h-8 text-xs px-4"
                    isLoading={loadingAction === `primary-${file.id}`}
                    onPress={() => markPrimary(file.id)}
                  >
                    Set as Primary
                  </Button>
                )}

                {isDownloadable && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="primary"
                    aria-label="Download resume"
                    isLoading={loadingAction === `open-${file.id}`}
                    onPress={() => handleDownload(file.id)}
                  >
                    <HiOutlineDownload size={20} />
                  </Button>
                )}

                {isDeletable && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    aria-label="Delete resume"
                    isLoading={loadingAction === `delete-${file.id}`}
                    onPress={() => setDeleteConfirm({ show: true, id: file.id })}
                  >
                    <HiOutlineTrash size={20} />
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
};

export default Resumes;
