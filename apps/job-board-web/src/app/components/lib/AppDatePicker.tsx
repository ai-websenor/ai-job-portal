'use client';

import { DatePicker, type DatePickerProps } from '@heroui/react';
import { ReactNode } from 'react';
import { IoClose } from 'react-icons/io5';
import { FaRegCalendarAlt } from 'react-icons/fa';

type Props = DatePickerProps & {
  isClearable?: boolean;
  clearLabel?: string;
  endContent?: ReactNode;
};

const AppDatePicker = ({ isClearable = true, clearLabel = 'Clear date', endContent, ...props }: Props) => {
  const hasValue = props.value != null;

  return (
    <DatePicker
      {...props}
      showMonthAndYearPickers={props.showMonthAndYearPickers ?? true}
      hideTimeZone={props.hideTimeZone ?? true}
      selectorIcon={<FaRegCalendarAlt />}
      endContent={
        <div className="flex items-center flex-nowrap shrink-0 gap-1 pr-1">
          {endContent}
          {isClearable && hasValue ? (
            <button
              type="button"
              aria-label={clearLabel}
              className="inline-flex shrink-0 h-6 w-6 items-center justify-center rounded-full text-default-400 transition-colors hover:bg-default-200 hover:text-default-700"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                props.onChange?.(null as any);
              }}
            >
              <IoClose size={16} />
            </button>
          ) : (
            <div className="text-default-500 flex shrink-0 items-center justify-center pointer-events-none">
              <FaRegCalendarAlt size={16} />
            </div>
          )}
        </div>
      }
    />
  );
};

export default AppDatePicker;
