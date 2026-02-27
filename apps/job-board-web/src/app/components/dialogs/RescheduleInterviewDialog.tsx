import { DialogProps, IInterview } from '@/app/types/types';
import { getLocalTimeZone, today } from '@internationalized/date';
import {
  addToast,
  Button,
  DatePicker,
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

interface Props extends DialogProps {
  interview: IInterview;
  refetch: () => void;
}

const RescheduleInterviewDialog = ({ isOpen, onClose, refetch, interview }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleReschedule = async () => {
    try {
      setLoading(true);
      await http.put(ENDPOINTS.EMPLOYER.INTERVIEWS.UPDATE(interview.id), {
        status: InterviewStatus.rescheduled,
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
                  label="Reschedule To"
                  placeholderValue={today(getLocalTimeZone())}
                  minValue={today(getLocalTimeZone())}
                  labelPlacement="outside"
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
