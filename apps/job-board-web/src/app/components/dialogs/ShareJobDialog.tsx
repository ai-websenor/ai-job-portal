import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  Divider,
  Tooltip,
  addToast,
} from '@heroui/react';
import { DialogProps } from '@/app/types/types';
import { IoCloseOutline } from 'react-icons/io5';
import { FiCopy } from 'react-icons/fi';
import { useState } from 'react';
import { shareJobOptions } from '@/app/config/data';
import Image from 'next/image';
import CommonUtils from '@/app/utils/commonUtils';
import LoadingProgress from '../lib/LoadingProgress';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import { ShareChannel } from '@/app/types/enum';

interface Props extends DialogProps {
  jobId: string;
}

const ShareJobDialog = ({ isOpen, jobId, onClose }: Props) => {
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async (shareChannel: string) => {
    if (loading || !shareChannel) return;

    try {
      setLoading(true);
      const response = await http.post(ENDPOINTS.JOBS.SHARE(jobId), {
        shareChannel,
      });

      const shareLinks = response?.data?.shareLinks;

      let url = '';
      if (shareChannel === ShareChannel.copy_link && typeof window !== 'undefined') {
        url = shareLinks?.jobUrl;
      } else {
        url = shareLinks?.[shareChannel];
      }

      if (url) {
        setLink(url);
      } else {
        addToast({
          title: 'Error',
          color: 'danger',
          description: 'Failed to generate share link',
        });
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} hideCloseButton size="lg">
      <ModalContent className="rounded-[32px]">
        {(onClose) => (
          <>
            <ModalHeader className="flex justify-between items-center px-6 pt-6 pb-2">
              <h2 className="text-[22px] font-semibold text-gray-900">Share with friends</h2>
              <Button
                isIconOnly
                variant="light"
                onPress={onClose}
                className="text-gray-400 hover:text-gray-600 min-w-8 w-8 h-8"
              >
                <IoCloseOutline size={28} />
              </Button>
            </ModalHeader>

            <ModalBody className="px-6 py-4">
              <div className="flex flex-col gap-6">
                <div>
                  <label className="text-sm font-semibold text-[#808080] mb-4 block">
                    Share this link via
                  </label>
                  <div className="flex gap-5">
                    {shareJobOptions.map((option) => (
                      <Tooltip
                        size="sm"
                        key={option.channel}
                        content={CommonUtils.keyIntoTitle(option.channel)}
                      >
                        <div
                          onClick={() => handleShare(option.channel)}
                          className="flex flex-col items-center gap-2 cursor-pointer"
                        >
                          <Image
                            src={option.iconPath}
                            alt={option.channel}
                            width={400}
                            height={400}
                            className="max-w-[35px] object-contain"
                          />
                        </div>
                      </Tooltip>
                    ))}
                  </div>
                </div>

                {link && <Divider className="bg-[#EBEBEB]" />}

                {loading ? (
                  <LoadingProgress />
                ) : link ? (
                  <div>
                    <label className="text-sm font-semibold text-gray-800 mb-3 block">
                      Copy the Link
                    </label>
                    <div className="flex items-center gap-2 bg-[#F3F4F6] rounded-xl px-4 py-3 border border-transparent">
                      <span className="text-[14px] text-gray-600 truncate flex-1 font-medium">
                        {link}
                      </span>
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        isLoading={loading}
                        onPress={handleCopy}
                        className="min-w-6 w-fit h-6 text-gray-500 hover:text-gray-700"
                      >
                        {copied ? (
                          <span className="text-[10px] text-success font-bold">Copied</span>
                        ) : (
                          <FiCopy size={20} />
                        )}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </ModalBody>
            <div className="pb-4" />
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ShareJobDialog;
