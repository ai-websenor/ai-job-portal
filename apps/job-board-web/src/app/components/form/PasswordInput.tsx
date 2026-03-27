import { Input, InputProps } from '@heroui/react';
import { useState } from 'react';
import { IoEyeOffOutline, IoEyeOutline } from 'react-icons/io5';

interface Props extends InputProps {}

const PasswordInput = ({ ...props }: Props) => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    setIsVisible((prev) => !prev);
  };

  return (
    <Input
      {...props}
      type={isVisible ? 'text' : 'password'}
      endContent={
        <button className="focus:outline-none" type="button" onClick={toggleVisibility}>
          {isVisible ? (
            <IoEyeOutline size={19} className="text-default-400" />
          ) : (
            <IoEyeOffOutline size={19} className="text-default-400" />
          )}
        </button>
      }
    />
  );
};

export default PasswordInput;
