import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import { DialogProps, IInterview } from '@/app/types/types';
import { completeInterviewSchema } from '@/app/utils/validations';
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
import clsx from 'clsx';
import { Controller, useForm } from 'react-hook-form';
import { FaRegStar, FaStar } from 'react-icons/fa';

interface Props extends DialogProps {
  interview: IInterview;
  refetch: () => void;
}

const defaultValues = {
  rating: 3,
  notes: '',
};

const CompleteInterviewDialog = ({ isOpen, onClose, interview, refetch }: Props) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(completeInterviewSchema),
  });

  const onSubmit = async (data: typeof defaultValues) => {
    try {
      await http.post(ENDPOINTS.EMPLOYER.INTERVIEWS.MARK_COMPLETE(interview.id), data);
      addToast({
        title: 'Success',
        color: 'success',
        description: 'Interview has been completed',
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
            <ModalHeader className="flex flex-col gap-1">Complete Interview</ModalHeader>
            <ModalBody className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-default-700">Overall Rating</label>
                <Controller
                  name="rating"
                  control={control}
                  render={({ field }) => (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled = star <= field.value;
                        const Icon = isFilled ? FaStar : FaRegStar;
                        const isLowRating = field.value < 3;

                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => field.onChange(star)}
                            className={clsx(
                              'transition-transform active:scale-90',
                              isFilled
                                ? isLowRating
                                  ? 'text-danger'
                                  : 'text-warning'
                                : 'text-default-400',
                            )}
                          >
                            <Icon size={24} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
                {errors.rating && <p className="text-tiny text-danger">{errors.rating.message}</p>}
              </div>

              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    minRows={8}
                    label="Interview Notes"
                    placeholder="Summarize the candidate's performance..."
                    isInvalid={!!errors.notes}
                    errorMessage={errors.notes?.message}
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
                color="success"
                className="text-white"
                isLoading={isSubmitting}
                onPress={() => handleSubmit(onSubmit)()}
              >
                Complete
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default CompleteInterviewDialog;
