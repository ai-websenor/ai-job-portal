import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import { DialogProps, IInterview } from '@/app/types/types';
import { cancelInterviewSchema } from '@/app/utils/validations';
import {
  addToast,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
} from '@heroui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import { Controller, useForm } from 'react-hook-form';

interface Props extends DialogProps {
  interview: IInterview;
  refetch: () => void;
}

const defaultValues = {
  reason: '',
};

const CancelInterviewDialog = ({ isOpen, onClose, interview, refetch }: Props) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(cancelInterviewSchema),
  });

  const onSubmit = async (data: typeof defaultValues) => {
    try {
      await http.post(ENDPOINTS.EMPLOYER.INTERVIEWS.CANCEL(interview.id), data);
      addToast({
        title: 'Success',
        color: 'success',
        description: 'Interview has been cancelled',
      });
      onClose();
      refetch();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">Cancel Interview</ModalHeader>
            <ModalBody className="flex flex-col gap-5">
              <Controller
                name="reason"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    minRows={8}
                    label="Cancellation Reason"
                    placeholder="Type your reason..."
                    isInvalid={!!errors.reason}
                    errorMessage={errors.reason?.message}
                  />
                )}
              />
            </ModalBody>

            <ModalFooter>
              <Button size="sm" color="danger" variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                color="danger"
                className="text-white"
                isLoading={isSubmitting}
                onPress={() => handleSubmit(onSubmit)()}
              >
                Cancel
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default CancelInterviewDialog;
