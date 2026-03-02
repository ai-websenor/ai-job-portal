import { DialogProps } from '@/app/types/types';
import { Modal, ModalBody, ModalContent, ModalHeader } from '@heroui/react';

interface Props extends DialogProps {
  renderedHtml: string;
}

const RenderResumeTemplateDialog = ({ isOpen, onClose, renderedHtml }: Props) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" scrollBehavior="inside">
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">Reschedule Interview</ModalHeader>
            <ModalBody>
              <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default RenderResumeTemplateDialog;
