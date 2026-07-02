'use client';

import { useRouter } from 'next/navigation';
import { IoArrowBackOutline } from 'react-icons/io5';

type Props = {
  showLabel?: boolean;
  path?: string;
  className?: string;
};

const BackButton = ({ showLabel = false, path, className = '' }: Props) => {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => (path ? router.push(path) : router.back())}
      className={`flex items-center gap-2 w-fit ${className || 'text-gray-800'}`}
    >
      <IoArrowBackOutline size={20} />
      {showLabel && <p className="text-sm font-medium">Go Back</p>}
    </button>
  );
};

export default BackButton;
