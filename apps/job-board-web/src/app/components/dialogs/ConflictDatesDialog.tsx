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
import CommonUtils from '@/app/utils/commonUtils';

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
                className="border border-warning/20 items-start mb-2"
              />

              <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2">
                {conflicts?.map((conflict, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-default-50 border border-default-200 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-warning/10 text-warning flex items-center justify-center text-[10px] font-bold">
                        {index + 1}
                      </div>
                      <span className="text-xs font-semibold text-default-600">
                        Conflict Details
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(conflict).map(([key, value]) => {
                        if (!value) return null;

                        if (key === 'id') return null;

                        return (
                          <div key={key} className="flex flex-col gap-0.5">
                            <span className="text-[10px] uppercase text-default-400 font-bold tracking-tight">
                              {CommonUtils.keyIntoTitle(key)}
                            </span>
                            <span className="text-sm text-default-700 font-medium line-clamp-2">
                              {value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ModalBody>
            <ModalFooter className="pt-2 border-t border-default-100">
              <Button size="sm" color="default" variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                color="warning"
                variant="solid"
                onPress={handleSubmit}
                className="text-white font-semibold"
              >
                Submit Anyway
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ConflictDatesDialog;
