import { Button, Card, CardBody } from '@heroui/react';
import { BsFileEarmarkWord } from 'react-icons/bs';
import {
  HiOutlineDocument,
  HiOutlineDocumentText,
  HiOutlineDownload,
  HiOutlinePhotograph,
} from 'react-icons/hi';
import { MdOutlineVideoCameraFront } from 'react-icons/md';
import { RiDeleteBinLine } from 'react-icons/ri';

type Props = {
  url: string;
  fileType: 'image' | 'video' | 'pdf' | 'word' | 'other';
  deleteEndpoint?: string;
  downloadEndpoint?: string;
  refetch?: () => void;
  onRemove?: () => void;
};

const iconClassName = 'text-primary text-xl flex-shrink-0';

const FilePreviewCard = ({ url, fileType, onRemove, downloadEndpoint }: Props) => {
  const getIcon = () => {
    switch (fileType) {
      case 'image':
        return <HiOutlinePhotograph className={iconClassName} />;
      case 'video':
        return <MdOutlineVideoCameraFront className={iconClassName} />;
      case 'pdf':
        return <HiOutlineDocumentText className={iconClassName} />;
      case 'word':
        return <BsFileEarmarkWord className={iconClassName} />;
      default:
        return <HiOutlineDocument className={iconClassName} />;
    }
  };

  const getFileName = (url: string) => {
    const name = url.split('/').pop() || 'File';
    if (name.length > 20) {
      return `${name.substring(0, 12)}...${name.split('.').pop()}`;
    }
    return name;
  };

  return (
    <Card radius="sm" shadow="none" className="border-primary bg-secondary border">
      <CardBody className="flex flex-row items-center justify-between py-3 px-4 gap-3">
        <div className="flex items-center gap-3 overflow-hidden">
          {getIcon()}
          <span className="text-sm font-medium truncate text-neutral-800">{getFileName(url)}</span>
        </div>
        <div className="flex items-center gap-3">
          {downloadEndpoint && (
            <Button size="sm" isIconOnly color="primary" variant="flat">
              <HiOutlineDownload size={16} />
            </Button>
          )}
          {onRemove && (
            <Button onPress={onRemove} size="sm" isIconOnly color="danger" variant="flat">
              <RiDeleteBinLine size={16} />
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default FilePreviewCard;
