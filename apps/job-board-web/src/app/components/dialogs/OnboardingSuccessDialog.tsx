'use client';

import { DialogProps } from '@/app/types/types';
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react';
import { FiCheckCircle } from 'react-icons/fi';

interface Props extends DialogProps {
  onProceed: () => void;
}

const OnboardingSuccessDialog = ({ isOpen, onClose, onProceed }: Props) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} hideCloseButton size="lg" backdrop="blur">
      <ModalContent className="overflow-hidden rounded-[28px] border border-success-100">
        {(closeModal) => (
          <>
            <ModalHeader className="flex flex-col gap-2 bg-gradient-to-r from-success-50 via-emerald-50 to-background px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success-100 text-success shadow-sm">
                  <FiCheckCircle size={26} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-success-600">
                    Registration complete
                  </p>
                  <h2 className="text-2xl font-bold text-foreground">Welcome aboard</h2>
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="px-6 py-5 text-sm leading-6 text-default-600">
              <p>
                Your company registration is complete. Finish your profile to improve visibility,
                build trust with candidates, and attract better matches faster.
              </p>
              <div className="mt-4 rounded-2xl border border-default-200 bg-default-50 p-4">
                <p className="font-semibold text-default-800">What to do next</p>
                <ul className="mt-2 space-y-2">
                  <li>Complete the remaining company profile details.</li>
                  <li>Add your branding and workplace information.</li>
                  <li>Increase your chances of receiving the right applicants.</li>
                </ul>
              </div>
            </ModalBody>

            <ModalFooter className="px-6 pb-6">
              {/* <Button variant="flat" color="default" onPress={closeModal}>
                Stay here
              </Button> */}
              <Button
                color="primary"
                onPress={() => {
                  closeModal();
                  onProceed();
                }}
              >
                Continue to profile
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default OnboardingSuccessDialog;