import { DialogProps, IInterview } from '@/app/types/types';
import { getLocalTimeZone, now } from '@internationalized/date';
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
} from '@heroui/react';
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
  const [scheduledAt, setScheduledAt] = useState<DateValue | null>(
    now(getLocalTimeZone()).add({ hours: 2 }),
  );

  const handleReschedule = async () => {
    if (!scheduledAt) {
      addToast({
        title: 'Error',
        color: 'danger',
        description: 'Please select a date',
      });
      return;
    }

    try {
      setLoading(true);
      await http.put(ENDPOINTS.EMPLOYER.INTERVIEWS.UPDATE(interview.id), {
        status: InterviewStatus.rescheduled,
        scheduledAt: dayjs(scheduledAt.toDate(getLocalTimeZone())).toISOString(),
      });
      onClose();
      refetch();
      addToast({
        title: 'success',
        color: 'success',
        description: 'Interview rescheduled successfully',
      });
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">Reschedule Interview</ModalHeader>
            <ModalBody>
              <div className="flex flex-col gap-4">
                <DatePicker
                  hideTimeZone
                  granularity="minute"
                  value={scheduledAt}
                  labelPlacement="outside"
                  showMonthAndYearPickers
                  label="Reschedule Date & Time"
                  minValue={now(getLocalTimeZone())}
                  onChange={(ev) => setScheduledAt(ev)}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button color="primary" isLoading={loading} onPress={handleReschedule}>
                Reschedule
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default RescheduleInterviewDialog;
