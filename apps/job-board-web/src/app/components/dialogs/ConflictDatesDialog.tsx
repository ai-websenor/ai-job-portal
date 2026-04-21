import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Alert,
} from '@heroui/react';
import { DialogProps } from '@/app/types/types';
import { FiAlertCircle } from 'react-icons/fi';

interface Props extends DialogProps {
  message: string;
  onSubmit: () => void;
  conflicts: {
    degree?: string;
    institution?: string;
    startDate?: string;
    endDate?: string;
    companyName?: string;
    jobTitle?: string;
  }[];
}

const ConflictDatesDialog = ({ isOpen, onClose, message, onSubmit, conflicts }: Props) => {
  const handleSubmit = () => {
    onSubmit();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      backdrop="blur"
      placement="center"
      className="max-w-md"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 pb-2">
              <div className="flex items-center gap-2 text-warning font-bold">
                <FiAlertCircle size={22} />
                <span>Conflict</span>
              </div>
            </ModalHeader>
            <ModalBody>
              <Alert
                color="warning"
                variant="flat"
                title="Conflict Warning"
                description={message}
                className="border border-warning/20 items-start"
              />
            </ModalBody>
            <ModalFooter className="pt-2">
              <Button size="sm" color="default" variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                color="warning"
                variant="solid"
                onPress={handleSubmit}
                className="text-white"
              >
                Submit
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ConflictDatesDialog;
