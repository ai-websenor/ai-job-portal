import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import { DialogProps, IInterview } from '@/app/types/types';
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
import clsx from 'clsx';
import { useState } from 'react';
import { FaRegStar, FaStar } from 'react-icons/fa';

interface Props extends DialogProps {
  interview: IInterview;
  refetch: () => void;
}

const InProgressInterviewDialog = ({ isOpen, onClose, interview, refetch }: Props) => {
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    try {
      setLoading(true);
      await http.post(ENDPOINTS.EMPLOYER.INTERVIEWS.MARK_IN_PROGRESS(interview.id), {
        rating: rating || undefined,
        notes: notes.trim() || undefined,
      });
      addToast({
        title: 'Success',
        color: 'success',
        description: 'Interview round marked as in progress',
      });
      onClose();
      refetch();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">Mark Round In Progress</ModalHeader>
            <ModalBody className="flex flex-col gap-5">
              <p className="text-sm text-default-500">
                Use this when a round is done but more rounds are expected. You can schedule the
                next round afterwards.
              </p>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-default-700">
                  Overall Rating (optional)
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= rating;
                    const Icon = isFilled ? FaStar : FaRegStar;
                    const isLowRating = rating < 3;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star === rating ? 0 : star)}
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
              </div>

              <Textarea
                minRows={6}
                label="Round Notes (optional)"
                placeholder="Summarize this round's outcome..."
                value={notes}
                onValueChange={setNotes}
              />
            </ModalBody>

            <ModalFooter>
              <Button size="sm" color="danger" variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                color="warning"
                className="text-white"
                isLoading={loading}
                onPress={onSubmit}
              >
                Mark In Progress
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default InProgressInterviewDialog;
