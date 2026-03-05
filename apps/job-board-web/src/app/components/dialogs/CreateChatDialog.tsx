import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import { DialogProps } from '@/app/types/types';
import {
  Button,
  Textarea,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props extends DialogProps {
  data: {
    companyName: string;
    recipientId: string;
    applicationId: string;
  };
}

const CreateChatDialog = ({ isOpen, onClose, data }: Props) => {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (message.trim().length === 0) return;
    try {
      setLoading(true);
      const response = await http.post(ENDPOINTS.MESSAGES.THREADS.CREATE, {
        recipientId: data.recipientId,
        applicationId: data.applicationId,
        body: message,
      });
      if (response?.data) {
        onClose();
        router.push(routePaths.chat.chatDetail(response.data.thread.id));
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col -gap-3">
              <h3>Message</h3>
              <p className="text-sm font-medium">{data.companyName}</p>
            </ModalHeader>
            <ModalBody>
              <Textarea
                minRows={8}
                autoFocus
                value={message}
                label="Message"
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message..."
              />
            </ModalBody>

            <ModalFooter>
              <Button size="sm" color="danger" variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button size="sm" color="primary" isLoading={loading} onPress={handleSend}>
                Send
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default CreateChatDialog;
