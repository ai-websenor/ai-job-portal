import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@heroui/react';
import { HiOutlineDocumentText, HiOutlinePaperClip, HiOutlineVideoCamera } from 'react-icons/hi';
import { HiOutlinePhoto } from 'react-icons/hi2';

const ChatAttachmentUpload = () => {
  return (
    <Dropdown placement="top-start">
      <DropdownTrigger>
        <Button isIconOnly variant="light" radius="full" size="sm">
          <HiOutlinePaperClip className="text-default-400 text-xl" />
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Attachment options">
        {attachmentItems.map((item) => (
          <DropdownItem key={item.key} startContent={<item.icon className={item.iconClassName} />}>
            {item.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

export default ChatAttachmentUpload;

const attachmentItems = [
  {
    key: 'photos',
    label: 'Photos',
    icon: HiOutlinePhoto,
    iconClassName: 'text-xl text-primary',
  },
  {
    key: 'videos',
    label: 'Videos',
    icon: HiOutlineVideoCamera,
    iconClassName: 'text-xl',
  },
  {
    key: 'documents',
    label: 'Documents',
    icon: HiOutlineDocumentText,
    iconClassName: 'text-xl text-success',
  },
];
