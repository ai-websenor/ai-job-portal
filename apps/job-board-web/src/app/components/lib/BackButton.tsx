'use client';

import { useRouter } from 'next/navigation';
import { IoArrowBackOutline } from 'react-icons/io5';

type Props = {
  showLabel?: boolean;
  path?: string;
};

const BackButton = ({ showLabel = false, path }: Props) => {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => (path ? router.push(path) : router.back())}
      className="flex items-center gap-2 w-fit"
    >
      <IoArrowBackOutline size={20} />
      {showLabel && <p className="text-sm font-medium text-gray-800">Go Back</p>}
    </button>
  );
};

export default BackButton;
