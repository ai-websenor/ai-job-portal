import InterviewConflictDialog from '@/app/components/dialogs/InterviewConflictDialog';
import { DialogProps, IInterview, IInterviewConflict } from '@/app/types/types';
import { getLocalTimeZone, now, parseAbsoluteToLocal } from '@internationalized/date';
import {
  addToast,
  Button,
  DatePicker,
  DateValue,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
} from '@heroui/react';
import { I18nProvider } from '@react-aria/i18n';
import { useState } from 'react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import { InterviewStatus } from '@/app/types/enum';
import dayjs from 'dayjs';

interface Props extends DialogProps {
  interview: IInterview;
  refetch: () => void;
}

const RescheduleInterviewDialog = ({ isOpen, onClose, refetch, interview }: Props) => {
  const [loading, setLoading] = useState(false);
  const [conflictDialog, setConflictDialog] = useState<{
    isOpen: boolean;
    conflicts: IInterviewConflict[];
  }>({
    isOpen: false,
    conflicts: [],
  });
  const [pendingPayload, setPendingPayload] = useState<{
    status: InterviewStatus.rescheduled;
    scheduledAt: string;
    reason?: string;
    ignoreConflict?: boolean;
  } | null>(null);
  const [retryLoading, setRetryLoading] = useState(false);

  const initialDate = interview?.scheduledAt ? parseAbsoluteToLocal(interview.scheduledAt) : null;

  const [scheduledAt, setScheduledAt] = useState<DateValue | null>(
    initialDate ?? now(getLocalTimeZone()).add({ hours: 2 }),
  );
  const [reason, setReason] = useState('');

  const closeConflictDialog = () => {
    setConflictDialog({ isOpen: false, conflicts: [] });
    setPendingPayload(null);
  };

  const submitReschedule = async (payload: {
    status: InterviewStatus.rescheduled;
    scheduledAt: string;
    reason?: string;
    ignoreConflict?: boolean;
  }) => {
    await http.put(ENDPOINTS.EMPLOYER.INTERVIEWS.UPDATE(interview.id), payload);
    onClose();
    refetch();
    addToast({
      title: 'success',
      color: 'success',
      description: 'Interview rescheduled successfully',
    });
  };

  const handleReschedule = async () => {
    if (!scheduledAt) {
      addToast({
        title: 'Error',
        color: 'danger',
        description: 'Please select a date',
      });
      return;
    }

    const selectedDateTime = dayjs(scheduledAt.toDate(getLocalTimeZone()));

    if (!selectedDateTime.isAfter(dayjs())) {
      addToast({
        title: 'Error',
        color: 'danger',
        description: 'Please select a future date and time',
      });
      return;
    }

    if (!reason.trim()) {
      addToast({
        title: 'Error',
        color: 'danger',
        description: 'Please enter a reason for rescheduling',
      });
      return;
    }

    const payload: {
      status: InterviewStatus.rescheduled;
      scheduledAt: string;
      reason?: string;
    } = {
      status: InterviewStatus.rescheduled,
      scheduledAt: dayjs(scheduledAt.toDate(getLocalTimeZone())).toISOString(),
      reason: reason.trim() || undefined,
    };

    try {
      setLoading(true);
      await submitReschedule(payload);
    } catch (error: any) {
      if (error?.code === 'INTERVIEW_TIME_CONFLICT') {
        setPendingPayload(payload);
        setConflictDialog({
          isOpen: true,
          conflicts: error?.conflicts || [],
        });
        return;
      }

      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmConflict = async () => {
    if (!pendingPayload) return;

    try {
      setRetryLoading(true);
      await submitReschedule({ ...pendingPayload, ignoreConflict: true });
      closeConflictDialog();
    } catch (error) {
      console.log(error);
    } finally {
      setRetryLoading(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalContent>
          {(closeModal) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Reschedule Interview</ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-4">
                  <I18nProvider locale="en-GB">
                    <DatePicker
                      hideTimeZone
                      granularity="minute"
                      hourCycle={12}
                      value={scheduledAt}
                      labelPlacement="outside"
                      showMonthAndYearPickers
                      label="Reschedule Date & Time"
                      minValue={now(getLocalTimeZone())}
                      onChange={(ev) => setScheduledAt(ev)}
                    />
                  </I18nProvider>
                  <Textarea
                    label="Reason"
                    labelPlacement="outside"
                    placeholder="Reason for rescheduling..."
                    value={reason}
                    onValueChange={setReason}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={closeModal}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  isLoading={loading}
                  disabled={!scheduledAt}
                  onPress={handleReschedule}
                >
                  Reschedule
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <InterviewConflictDialog
        isOpen={conflictDialog.isOpen}
        onClose={closeConflictDialog}
        conflicts={conflictDialog.conflicts}
        onConfirm={handleConfirmConflict}
        loading={retryLoading}
      />
    </>
  );
};

export default RescheduleInterviewDialog;
