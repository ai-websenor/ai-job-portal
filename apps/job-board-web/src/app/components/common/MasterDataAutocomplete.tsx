'use client';

import { Autocomplete, AutocompleteItem } from '@heroui/react';
import { useEffect, useRef, useState } from 'react';
import http from '@/app/api/http';

interface Props {
  /** One of the MASTER_DATA search endpoints. */
  endpoint: string;
  label: React.ReactNode;
  placeholder?: string;
  value?: string | null;
  onChange: (value: string) => void;
  onBlur?: () => void;
  isInvalid?: boolean;
  errorMessage?: React.ReactNode;
  className?: string;
  autoFocus?: boolean;
}

/**
 * A searchable list that still accepts anything typed.
 *
 * Job title, qualification and certification used to be plain text boxes, so
 * one role arrived as "Word Press Engineer", "WordPress Developer" and
 * "wordpress" and nothing grouped together — which is also why salary
 * prediction could not find comparable jobs for it.
 *
 * Suggestions come from what employers have already posted. Typing something
 * new is still allowed and is saved as-is; the backend records it for an admin
 * to promote or remove later. Nobody is ever blocked mid-post by a missing
 * entry, which is how the Skills field already behaves.
 */
const MasterDataAutocomplete = ({
  endpoint,
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  isInvalid,
  errorMessage,
  className,
  autoFocus,
}: Props) => {
  const [options, setOptions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [inputValue, setInputValue] = useState(value ?? '');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against a slow earlier response overwriting a newer one.
  const requestId = useRef(0);

  // Keep in step when the form loads a saved job, or resets.
  useEffect(() => {
    setInputValue(value ?? '');
  }, [value]);

  const search = (query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    setIsSearching(true);
    // 300ms rather than the 1.5s the Skills field uses. At a second and a half
    // the list arrives after you have finished typing, which is the same as
    // having no list at all.
    debounceRef.current = setTimeout(async () => {
      const current = ++requestId.current;
      try {
        const response = await http.get(endpoint, {
          params: { q: query.trim(), limit: 20 },
        });
        if (current !== requestId.current) return;

        const rows = (response?.data as { name?: string }[]) ?? [];
        setOptions(rows.map((row) => String(row?.name ?? '')).filter(Boolean));
      } catch {
        // A failed lookup must not stop someone posting a job. They can still
        // type whatever they need; they just lose the suggestions.
        if (current === requestId.current) setOptions([]);
      } finally {
        if (current === requestId.current) setIsSearching(false);
      }
    }, 300);
  };

  // Clean up a pending debounce if the field unmounts mid-type.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <Autocomplete
      label={label}
      placeholder={placeholder}
      labelPlacement="outside"
      size="lg"
      allowsCustomValue
      autoFocus={autoFocus}
      className={className}
      isLoading={isSearching}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
      inputValue={inputValue}
      selectedKey={null}
      onOpenChange={(open) => {
        // Show something useful before a single character is typed.
        if (open && options.length === 0) search('');
      }}
      onInputChange={(typed) => {
        // Stored exactly as typed. Title-casing here corrupted acronyms on the
        // way in — "PHP" became "Php" and "CI/CD" became "Ci/Cd" — and those
        // then failed to match anything.
        setInputValue(typed);
        onChange(typed);
        search(typed);
      }}
      onSelectionChange={(key) => {
        if (key === null || key === undefined) return;
        const picked = String(key);
        setInputValue(picked);
        onChange(picked);
      }}
      onBlur={onBlur}
    >
      {options.map((name) => (
        <AutocompleteItem key={name}>{name}</AutocompleteItem>
      ))}
    </Autocomplete>
  );
};

export default MasterDataAutocomplete;
