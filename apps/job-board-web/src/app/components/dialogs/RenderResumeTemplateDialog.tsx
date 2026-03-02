import { DialogProps } from '@/app/types/types';
import { Modal, ModalBody, ModalContent, ModalHeader } from '@heroui/react';

interface Props extends DialogProps {
  html: {
    renderedHtml: string;
    renderConfig: any;
  };
}

const RenderResumeTemplateDialog = ({ isOpen, onClose, html }: Props) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">Preview</ModalHeader>
            <ModalBody></ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default RenderResumeTemplateDialog;
