import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import { DialogProps } from '@/app/types/types';
import { HiOutlineSparkles } from 'react-icons/hi2';

const AiParsingAlert = ({ isOpen, onClose }: DialogProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center" backdrop="blur">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 items-center pt-8">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                <HiOutlineSparkles className="w-6 h-6 text-blue-600 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Review AI Parsing</h3>
            </ModalHeader>
            <ModalBody className="text-center px-8 pb-6">
              <p className="text-gray-600 text-base leading-relaxed">
                AI can make mistakes, please verify changes before proceeding
              </p>
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <p className="text-xs text-yellow-700 italic">
                  Tip: Check dates and job titles carefully for accuracy.
                </p>
              </div>
            </ModalBody>
            <ModalFooter className="flex flex-col gap-2 pb-8 px-8">
              <Button 
                color="primary" 
                variant="solid"
                className="w-full font-semibold h-12 text-md shadow-lg shadow-blue-200" 
                onPress={onClose}
              >
                I Understand, Let's Review
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default AiParsingAlert;

