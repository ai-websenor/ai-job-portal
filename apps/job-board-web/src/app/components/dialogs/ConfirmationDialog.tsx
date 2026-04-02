import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import { DialogProps } from '@/app/types/types';
import { ReactNode } from 'react';

interface ConfirmationDialogProps extends DialogProps {
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  color?: 'primary' | 'danger' | 'warning' | 'success';
}

const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  color = 'primary',
  message,
}: ConfirmationDialogProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} hideCloseButton>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">{title}</ModalHeader>
            <ModalBody>
              <div className="text-sm text-gray-600">{message}</div>
            </ModalBody>
            <ModalFooter>
              <Button color="default" variant="flat" onPress={onClose}>
                Cancel
              </Button>
              <Button
                color={color}
                variant="solid"
                onPress={() => {
                  onConfirm();
                  onClose();
                }}
              >
                Confirm
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ConfirmationDialog;
