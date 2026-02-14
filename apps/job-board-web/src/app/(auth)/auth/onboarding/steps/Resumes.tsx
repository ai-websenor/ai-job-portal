"use client";

import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";
import { IResume } from "@/app/types/types";
import { addToast, Button, Card, CardBody, Tooltip } from "@heroui/react";
import clsx from "clsx";
import { useState } from "react";
import {
  HiOutlineDocumentText,
  HiOutlineDownload,
  HiOutlineTrash,
} from "react-icons/hi";
import { IoMdStar } from "react-icons/io";

type Props = {
  refetch?: () => void;
  resumes: IResume[];
  selected?: string;
  onSelect?: (id: string) => void;
  isDownloadable?: boolean;
  isDeletable?: boolean;
};

const Resumes = ({
  resumes,
  selected,
  onSelect,
  isDownloadable,
  isDeletable,
  refetch,
}: Props) => {
  const [loading, setLoading] = useState(false);

  const onDelete = async (id: string) => {
    try {
      setLoading(true);
      await http.delete(ENDPOINTS.CANDIDATE.DELETE_RESUME(id));
      refetch?.();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const markPrimary = async (id: string) => {
    try {
      setLoading(true);
      await http.post(ENDPOINTS.CANDIDATE.MARK_AS_PRIMARY(id), {});
      refetch?.();
      addToast({
        color: "success",
        title: "Success",
        description: "Resume has been marked as primary successfully.",
      });
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-5 space-y-3">
      {resumes?.map((file) => {
        return (
          <Card
            as="div"
            isPressable
            key={file.id}
            shadow="none"
            radius="sm"
            onClick={() => onSelect?.(file?.id)}
            className={clsx("bg-neutral-100", {
              "border-primary bg-secondary border": selected === file.id,
              "cursor-pointer hover:bg-secondary": onSelect,
            })}
          >
            <CardBody className="flex flex-row items-center justify-between py-3 px-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <HiOutlineDocumentText className="text-primary text-xl flex-shrink-0" />
                <span className="text-sm font-medium truncate text-neutral-800">
                  {file.fileName}
                </span>
                {file?.isDefault && (
                  <div className="bg-secondary text-xs text-primary font-medium px-2 py-1 rounded-full">
                    Primary
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                {isDownloadable && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="primary"
                    aria-label="Download resume"
                    onPress={() => window.open(file.filePath)}
                  >
                    <HiOutlineDownload size={20} />
                  </Button>
                )}

                {!file?.isDefault && (
                  <Tooltip size="sm" content="Mark as Primary">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="primary"
                      aria-label="Delete resume"
                      isLoading={loading}
                      onPress={() => markPrimary(file.id)}
                    >
                      <IoMdStar size={20} />
                    </Button>
                  </Tooltip>
                )}

                {!isDeletable && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    aria-label="Delete resume"
                    isLoading={loading}
                    onPress={() => onDelete(file.id)}
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
