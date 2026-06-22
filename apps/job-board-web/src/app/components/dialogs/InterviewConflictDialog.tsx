import { DialogProps, IInterviewConflict } from '@/app/types/types';
import dayjs from 'dayjs';
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@heroui/react';
import { BsExclamationTriangleFill } from 'react-icons/bs';

interface Props extends DialogProps {
  conflicts: IInterviewConflict[];
  onConfirm: () => void;
  loading?: boolean;
}

const InterviewConflictDialog = ({
  isOpen,
  onClose,
  conflicts,
  onConfirm,
  loading = false,
}: Props) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        {(closeModal) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/15 text-warning">
                  <BsExclamationTriangleFill size={18} />
                </div>
                <div>
                  <p className="text-base font-semibold">Interview time conflict</p>
                  <p className="text-sm text-default-500 font-normal">
                    You already have interview(s) in this slot.
                  </p>
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="space-y-4">
              <p className="text-sm text-default-600">
                The selected time overlaps with another interview for this employer. Review the
                conflicting interview(s) below, then choose whether to continue anyway.
              </p>

              <div className="space-y-3">
                {conflicts.length > 0 ? (
                  conflicts.map((conflict) => (
                    <div
                      key={conflict.interviewId}
                      className="rounded-2xl border border-warning/20 bg-warning/5 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">
                            {conflict.candidateName || 'Unknown candidate'}
                          </p>
                          <p className="text-sm text-default-500">
                            {conflict.jobTitle || 'Untitled job'}
                          </p>
                        </div>
                        <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">
                          {conflict.status}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-default-600">
                        <span>{dayjs(conflict.scheduledAt).format('DD MMM YYYY, h:mm A')}</span>
                        <span>{conflict.duration} mins</span>
                        <span className="break-all">{conflict.interviewType}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4 text-sm text-default-600">
                    Another interview already exists in this time slot.
                  </div>
                )}
              </div>
            </ModalBody>

            <ModalFooter>
              <Button color="danger" variant="light" onPress={closeModal}>
                Cancel
              </Button>
              <Button color="warning" isLoading={loading} onPress={onConfirm}>
                Schedule anyway
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default InterviewConflictDialog;
