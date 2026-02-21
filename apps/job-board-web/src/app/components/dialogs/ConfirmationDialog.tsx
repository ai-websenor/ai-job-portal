import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { DialogProps } from "@/app/types/types";

interface ConfirmationDialogProps extends DialogProps {
  onConfirm: () => void;
  title: string;
  message: string;
  color: "primary" | "danger" | "warning" | "success";
}

const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  color = "primary",
  message,
}: ConfirmationDialogProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">{title}</ModalHeader>
            <ModalBody>
              <p>{message}</p>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button
                color={color}
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
