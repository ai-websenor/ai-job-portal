import "react-phone-number-input/style.css";
import PhoneInput from "react-phone-number-input";

type Props = {
  value?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
};

const PhoneNumberInput = ({
  value,
  onChange,
  placeholder,
  disabled,
}: Props) => {
  return (
    <PhoneInput
      international
      defaultCountry="IN"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(val) => onChange?.(val as string)}
    />
  );
};

export default PhoneNumberInput;
