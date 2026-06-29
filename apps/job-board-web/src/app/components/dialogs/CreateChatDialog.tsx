import { startConversation } from '@/app/api/chat';
import routePaths from '@/app/config/routePaths';
import useUserStore from '@/app/store/useUserStore';
import { InterviewStatus, Roles } from '@/app/types/enum';
import { DialogProps } from '@/app/types/types';
import {
  Button,
  Textarea,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Alert,
} from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

interface Props extends DialogProps {
  data: {
    status: string;
    companyName: string;
    recipientId: string;
    application?: {
      applicationId: string;
    } | null;
    job?: {
      id: string;
    } | null;
  };
}

const CreateChatDialog = ({ isOpen, onClose, data }: Props) => {
  const router = useRouter();
  const { user } = useUserStore();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendError, setSendError] = useState('');

  const restrictionMessage = useMemo(() => {
    if (user?.role === Roles.candidate) {
      const restrictedStatuses: string[] = [
        InterviewStatus.applied,
        InterviewStatus.rejected,
        InterviewStatus.viewed,
      ];

      if (restrictedStatuses.includes(data?.status as string)) {
        return 'You can only message the recruiter once your application has moved to the next stage.';
      }
    }

    const terminalStatuses: string[] = [
      InterviewStatus.rejected,
      InterviewStatus.withdrawn,
      'offer_rejected',
    ];

    if (terminalStatuses.includes(data?.status as string)) {
      return 'Chat is not available for this candidate.';
    }

    return '';
  }, [data?.status, user?.role]);

  const isRestricted = Boolean(restrictionMessage);

  const title = data?.companyName || 'Conversation';

  const handleSend = async () => {
    const trimmedMessage = message.trim();

    if (trimmedMessage.length === 0 || isRestricted || !data?.recipientId || loading) return;

    try {
      setLoading(true);
      setSendError('');

      const response = await startConversation({
        recipient: { userId: data.recipientId },
        application: data.application ?? null,
        job: data.application ? null : data.job ?? null,
        body: trimmedMessage,
      });

      const threadId = response?.data?.thread?.id;

      if (threadId) {
        setMessage('');
        onClose();
        router.push(routePaths.chat.chatDetail(threadId));
      }
    } catch (error) {
      const errorMessage =
        (error as { message?: string })?.message || 'Unable to start this conversation.';
      setSendError(errorMessage);
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col -gap-3">
              <h3>Message</h3>
              <p className="text-sm font-medium">{title}</p>
            </ModalHeader>

            <ModalBody>
              {isRestricted ? (
                <Alert color="warning" title="Messaging Restricted" description={restrictionMessage} />
              ) : (
                <>
                  {sendError && (
                    <Alert color="danger" title="Message not sent" description={sendError} />
                  )}
                  <Textarea
                    minRows={8}
                    autoFocus
                    value={message}
                    label="Message"
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your message..."
                  />
                </>
              )}
            </ModalBody>

            <ModalFooter>
              <Button size="sm" color="danger" variant="light" onPress={onClose}>
                Cancel
              </Button>
              {!isRestricted && (
                <Button size="sm" color="primary" isLoading={loading} onPress={handleSend}>
                  Send
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default CreateChatDialog;
