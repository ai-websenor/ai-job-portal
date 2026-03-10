import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Chip } from '@heroui/react';
import { HiOutlineDocumentText, HiOutlinePaperClip, HiOutlineVideoCamera } from 'react-icons/hi2';
import { HiOutlinePhoto } from 'react-icons/hi2';
import { useRef, useState } from 'react';

type FileType = File | null;

type Props = {
  selectedFile: FileType;
  setSelectedFile: (file: FileType) => void;
};

const ChatAttachmentUpload = ({ selectedFile, setSelectedFile }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [acceptType, setAcceptType] = useState('');

  const handleSelect = (key: string) => {
    switch (key) {
      case 'photos':
        setAcceptType('image/*');
        break;
      case 'videos':
        setAcceptType('video/*');
        break;
      case 'documents':
        setAcceptType('.pdf,.doc,.docx,.txt');
        break;
    }
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (selectedFile) {
    return (
      <div className="flex items-center gap-1 pl-2">
        <Chip
          variant="flat"
          color="primary"
          onClose={clearSelection}
          className="h-8 max-w-[140px] border-none bg-primary-50"
          classNames={{
            content: 'text-[10px] font-medium truncate px-1',
            closeButton: 'text-primary hover:opacity-70 transition-opacity',
          }}
          startContent={
            <div className="pl-1">
              {acceptType === 'image/*' ? (
                <HiOutlinePhoto className="text-primary text-sm" />
              ) : acceptType === 'video/*' ? (
                <HiOutlineVideoCamera className="text-secondary text-sm" />
              ) : (
                <HiOutlineDocumentText className="text-success text-sm" />
              )}
            </div>
          }
        >
          {selectedFile.name}
        </Chip>
      </div>
    );
  }

  return (
    <>
      <input
        type="file"
        hidden
        ref={fileInputRef}
        accept={acceptType}
        onChange={handleFileChange}
      />
      <Dropdown placement="top-start" backdrop="blur">
        <DropdownTrigger>
          <Button isIconOnly variant="light" radius="full" size="sm" className="ml-1">
            <HiOutlinePaperClip className="text-default-400 text-xl hover:text-primary transition-colors" />
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="Attachment options"
          onAction={(key) => handleSelect(key as string)}
          className="min-w-[150px]"
          itemClasses={{
            base: 'gap-3 h-10',
          }}
        >
          {attachmentItems.map((item) => (
            <DropdownItem
              key={item.key}
              startContent={<item.icon className={item.iconClassName} />}
            >
              {item.label}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>
    </>
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
