import { Button, Card, CardBody } from '@heroui/react';
import { HiOutlineDownload } from 'react-icons/hi';
import { MdOutlineVideoCameraFront } from 'react-icons/md';

type Props = {
  url: string;
  fileType: 'image' | 'video' | 'pdf' | 'word' | 'other';
  deleteEndpoint?: string;
  downloadEndpoint?: string;
  refetch?: () => void;
};

const iconClassName = 'text-primary text-xl flex-shrink-0';

const FilePreviewCard = ({ url, fileType }: Props) => {
  const getIcon = () => {
    switch (fileType) {
      case 'image':
        return <MdOutlineVideoCameraFront className={iconClassName} />;
      case 'video':
        return <MdOutlineVideoCameraFront className={iconClassName} />;
      case 'pdf':
        return <MdOutlineVideoCameraFront className={iconClassName} />;
      case 'word':
        return <MdOutlineVideoCameraFront className={iconClassName} />;
      case 'other':
        return <MdOutlineVideoCameraFront className={iconClassName} />;
    }
  };

  return (
    <Card radius="sm" shadow="none" className="border-primary bg-secondary border">
      <CardBody className="flex flex-row items-center justify-between py-3 px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          {getIcon()}
          <span className="text-sm font-medium truncate text-neutral-800">{url}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* <Button onPress={handleDelete} size="sm" isIconOnly color="danger" variant="flat">
                  <RiDeleteBinLine size={16} />
                </Button> */}
          <Button
            //   onPress={handleDownload}
            size="sm"
            isIconOnly
            color="primary"
            variant="flat"
          >
            <HiOutlineDownload size={16} />
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

export default FilePreviewCard;
