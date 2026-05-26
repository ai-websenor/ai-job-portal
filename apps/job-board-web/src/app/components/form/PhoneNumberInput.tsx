'use client';

import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

type Props = {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
};

const PhoneNumberInput = ({ value, onChange, placeholder, disabled }: Props) => {
  return (
    <PhoneInput
      country="in"
      value={value?.replace(/^\+/, '') || ''}
      disabled={disabled}
      placeholder={placeholder}
      enableSearch
      countryCodeEditable={false}
      specialLabel=""
      containerClass="phone-input-container"
      inputClass="phone-input-field"
      buttonClass="phone-input-country"
      dropdownClass="phone-input-dropdown"
      inputProps={{
        inputMode: 'tel',
      }}
      onChange={(phone) => onChange?.(phone ? `+${phone}` : '')}
    />
  );
};

export default PhoneNumberInput;
