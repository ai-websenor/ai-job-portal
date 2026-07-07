'use client';

import { TimeInput, type TimeInputProps } from '@heroui/react';
import { ReactNode } from 'react';
import { IoClose } from 'react-icons/io5';

type Props = TimeInputProps & {
  isClearable?: boolean;
  clearLabel?: string;
  endContent?: ReactNode;
};

const AppTimePicker = ({
  isClearable = true,
  clearLabel = 'Clear time',
  endContent,
  ...props
}: Props) => {
  const hasValue = props.value != null;

  return (
    <TimeInput
      {...props}
      endContent={
        <>
          {endContent}
          {isClearable && hasValue && (
            <button
              type="button"
              aria-label={clearLabel}
              className="mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-default-400 transition-colors hover:bg-default-100 hover:text-default-700"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                props.onChange?.(null as any);
              }}
            >
              <IoClose size={14} />
            </button>
          )}
        </>
      }
    />
  );
};

export default AppTimePicker;
