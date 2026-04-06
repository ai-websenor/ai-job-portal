import { Chip } from '@heroui/react';
import { FaStar } from 'react-icons/fa';

const FeaturedJobTag = () => {
  return (
    <Chip size="sm" color="warning" variant="flat" startContent={<FaStar className="mr-1" />}>
      Featured
    </Chip>
  );
};

export default FeaturedJobTag;
