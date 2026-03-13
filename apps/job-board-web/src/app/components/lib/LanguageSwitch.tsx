'use client';

import { languageOptions } from '@/app/config/data';
import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@heroui/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitch = () => {
  const { i18n } = useTranslation();
  const selectedKeys = new Set([i18n.language]);

  const handleLanguageChange = (keys: any) => {
    const newLang = Array.from(keys)[0] as string;
    if (i18n && typeof i18n.changeLanguage === 'function') {
      i18n.changeLanguage(newLang);
    } else {
      console.log('i18n.changeLanguage is missing. Check your provider setup.');
    }
  };

  const currentLanguage = useMemo(() => {
    return languageOptions.find((lang) => lang.code === i18n.language) || languageOptions[0];
  }, [i18n.language]);

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Button
          variant="light"
          className="capitalize"
          isIconOnly
          startContent={<span>{currentLanguage?.flag}</span>}
        />
      </DropdownTrigger>

      <DropdownMenu
        aria-label="Language selection"
        disallowEmptySelection
        selectionMode="single"
        selectedKeys={selectedKeys}
        onSelectionChange={(keys) => handleLanguageChange(keys)}
      >
        {languageOptions.map((lang) => (
          <DropdownItem key={lang.code} startContent={<span>{lang.flag}</span>}>
            {lang.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

export default LanguageSwitch;
