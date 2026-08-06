import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem, Textarea, addToast } from '@heroui/react';
import { DialogProps } from '@/app/types/types';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { createTicketSchema } from '@/app/utils/validations';
import { createTicket } from '@/app/api/support';
import { useRouter } from 'next/navigation';
import routePaths from '@/app/config/routePaths';
import { SUPPORT_CATEGORIES } from '@/app/config/data';
import { BiSupport } from 'react-icons/bi';
import { uploadSupportAttachment } from '@/app/api/support';
import ChatAttachmentUpload from '@/app/components/chats/ChatAttachmentUpload';
import { useState } from 'react';

interface CreateTicketModalProps extends DialogProps {
  onSuccess?: () => void;
}

const PRIORITIES = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
];

const defaultValues = {
  subject: '',
  category: 'other',
  priority: 'medium',
  message: '',
};

const CreateTicketModal = ({ isOpen, onClose, onSuccess }: CreateTicketModalProps) => {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { control, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
    defaultValues,
    resolver: yupResolver(createTicketSchema) as any,
  });

  const handleClose = () => {
    reset();
    setSelectedFile(null);
    onClose();
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      let attachmentKey = '';
      if (selectedFile) {
        attachmentKey = await uploadSupportAttachment(selectedFile);
      }

      const newTicket = await createTicket({
        subject: data.subject,
        message: data.message,
        category: data.category || undefined,
        priority: data.priority,
        ...(attachmentKey ? { attachments: [attachmentKey] } : {}),
      });
      addToast({ title: 'Ticket created', color: 'success' });
      handleClose();
      if (onSuccess) onSuccess();
      router.push(routePaths.helpCenter.detail(newTicket.id));
    } catch (error) {
      console.error(error);
      addToast({ title: 'Failed to create ticket', color: 'danger' });
    }
  });

  return (
    <Modal isOpen={isOpen} onClose={handleClose} hideCloseButton>
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex items-center gap-2">
              <BiSupport className="text-xl" />
              Create Support Ticket
            </ModalHeader>
            <ModalBody>
              <form className="flex flex-col gap-4">
                <Controller
                  name="subject"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Subject"
                      placeholder="Brief description of the issue"
                      labelPlacement="outside"
                      variant="flat"
                      radius="sm"
                      isInvalid={!!errors.subject}
                      errorMessage={errors.subject?.message}
                      isRequired
                    />
                  )}
                />
                <div className="flex gap-4">
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <Select
                        name={field.name}
                        onBlur={field.onBlur}
                        label="Category"
                        placeholder="Select category"
                        labelPlacement="outside"
                        variant="flat"
                        radius="sm"
                        className="w-1/2"
                        selectedKeys={field.value ? [field.value] : []}
                        onChange={(e: any) => field.onChange(e.target.value)}
                        isInvalid={!!errors.category}
                        errorMessage={errors.category?.message}
                      >
                        {SUPPORT_CATEGORIES.map((c) => (
                          <SelectItem key={c.value}>{c.label}</SelectItem>
                        ))}
                      </Select>
                    )}
                  />
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <Select
                        name={field.name}
                        onBlur={field.onBlur}
                        label="Priority"
                        placeholder="Select priority"
                        labelPlacement="outside"
                        variant="flat"
                        radius="sm"
                        className="w-1/2"
                        selectedKeys={field.value ? [field.value] : []}
                        onChange={(e: any) => field.onChange(e.target.value)}
                        isInvalid={!!errors.priority}
                        errorMessage={errors.priority?.message}
                      >
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.value}>{p.label}</SelectItem>
                        ))}
                      </Select>
                    )}
                  />
                </div>
                <Controller
                  name="message"
                  control={control}
                  render={({ field }) => (
                    <div className="flex flex-col gap-2">
                      <Textarea
                        {...field}
                        label="Message"
                        placeholder="Provide details about your issue..."
                        labelPlacement="outside"
                        variant="flat"
                        radius="sm"
                        minRows={4}
                        isInvalid={!!errors.message}
                        errorMessage={errors.message?.message}
                        isRequired
                      />
                      <div className="flex items-center -ml-1">
                        <ChatAttachmentUpload 
                          selectedFile={selectedFile} 
                          setSelectedFile={setSelectedFile} 
                        />
                        {!selectedFile && (
                          <span className="text-xs text-gray-400 ml-2">Attach photo, video, or document (max 50MB)</span>
                        )}
                      </div>
                    </div>
                  )}
                />
              </form>
            </ModalBody>
            <ModalFooter>
              <Button color="default" variant="flat" onPress={handleClose}>
                Cancel
              </Button>
              <Button color="primary" onPress={() => onSubmit()} isLoading={isSubmitting}>
                Submit
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default CreateTicketModal;
