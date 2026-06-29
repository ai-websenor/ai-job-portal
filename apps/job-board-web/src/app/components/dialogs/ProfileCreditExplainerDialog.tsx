'use client';

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react';
import { FiCheckCircle } from 'react-icons/fi';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  remaining?: number;
  limit?: number;
};

const ProfileCreditExplainerDialog = ({ isOpen, onClose, remaining, limit }: Props) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        {(closeModal) => (
          <>
            <ModalHeader className="flex items-center gap-2">
               <span aria-hidden>🪙</span>
              Heads up - this uses 1 profile credit
            </ModalHeader>
            <ModalBody>
              <p className="text-sm text-gray-600">
                Your plan includes a set number of candidate unlocks. Here&apos;s how it works:
              </p>
              <ul className="mt-1 flex flex-col gap-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <FiCheckCircle className="mt-0.5 flex-shrink-0 text-primary" />
                  <span>
                    <strong>1 credit unlocks 1 candidate.</strong> Viewing their profile or
                    downloading their resume costs the same single credit.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <FiCheckCircle className="mt-0.5 flex-shrink-0 text-primary" />
                  <span>
                    <strong>Unlock once, it&apos;s yours.</strong> After unlocking, viewing and
                    downloading that candidate again is <strong>free</strong>.
                  </span>
                </li>
              </ul>
              {typeof remaining === 'number' && typeof limit === 'number' && limit > 0 ? (
                <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                  You have {remaining} of {limit} credits left this cycle.
                </p>
              ) : null}
            </ModalBody>
            <ModalFooter>
              <Button color="primary" className="font-bold" onPress={closeModal}>
                Got it
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ProfileCreditExplainerDialog;
