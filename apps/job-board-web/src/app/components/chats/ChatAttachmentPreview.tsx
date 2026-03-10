import { IChatAttachment } from '@/app/types/types';
import clsx from 'clsx';
import {
  FaDownload,
  FaFileAlt,
  FaFileArchive,
  FaFileExcel,
  FaFileImage,
  FaFilePdf,
  FaFileWord,
} from 'react-icons/fa';

type Props = {
  isMe: boolean;
  attachment: IChatAttachment;
};

const ChatAttachmentPreview = ({ isMe, attachment }: Props) => {
  const getFileIcon = (type: string) => {
    const t = type?.toLowerCase() || '';
    if (t.startsWith('image/')) return <FaFileImage className="text-blue-500" size={20} />;
    if (t === 'application/pdf') return <FaFilePdf className="text-red-500" size={20} />;
    if (t.includes('word') || t.includes('officedocument.wordprocessingml'))
      return <FaFileWord className="text-blue-600" size={20} />;
    if (
      t.includes('excel') ||
      t.includes('spreadsheet') ||
      t.includes('officedocument.spreadsheetml')
    )
      return <FaFileExcel className="text-green-600" size={20} />;
    if (t.includes('zip') || t.includes('rar') || t.includes('archive'))
      return <FaFileArchive className="text-orange-500" size={20} />;
    return <FaFileAlt className="text-gray-500" size={20} />;
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = attachment.type?.toLowerCase().startsWith('image/');

  if (isImage) {
    return (
      <div
        className="mt-2 group relative max-w-[280px] overflow-hidden rounded-xl border border-default-200 cursor-pointer shadow-sm hover:shadow-md transition-all"
        onClick={() => window.open(attachment.url, '_blank')}
      >
        <img
          src={attachment.url}
          alt={attachment.name}
          className="w-full h-auto max-h-[320px] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="bg-white/20 backdrop-blur-md p-2.5 rounded-full text-white">
              <FaDownload size={16} />
            </div>
            <span className="text-white text-[10px] font-medium bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
              {formatSize(attachment.size)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'mt-2 flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer min-w-[200px]',
        isMe
          ? 'bg-white/60 border-primary/10 hover:bg-white/80'
          : 'bg-white border-default-200 hover:bg-gray-50',
      )}
      onClick={() => window.open(attachment.url, '_blank')}
    >
      <div className="p-2 bg-white rounded-md shadow-sm flex-shrink-0">
        {getFileIcon(attachment.type)}
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <p className="text-xs font-semibold truncate text-gray-800">{attachment.name}</p>
        <p className="text-[10px] text-gray-500 font-medium">{formatSize(attachment.size)}</p>
      </div>
      <FaDownload
        className="text-gray-400 flex-shrink-0 hover:text-primary transition-colors"
        size={14}
      />
    </div>
  );
};

export default ChatAttachmentPreview;
