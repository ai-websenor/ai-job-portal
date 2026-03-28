import { Select, SelectItem, SelectProps } from '@heroui/react';
import dayjs from 'dayjs';

const currentYear = dayjs().year();
const startYear = 1900;
const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) =>
  (currentYear - i).toString(),
);

interface Props extends Omit<SelectProps, 'children'> {}

const YearSelector = ({ ...props }: Props) => {
  return (
    <Select {...props}>
      {years.map((year) => (
        <SelectItem key={year}>{year}</SelectItem>
      ))}
    </Select>
  );
};

export default YearSelector;
