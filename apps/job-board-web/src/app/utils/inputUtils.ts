import type { ChangeEvent } from 'react';

type Formatter = (value: string) => string;

const identity = (value: string) => value;

export const createFormattedInputChangeHandler =
  (onChange: (value: string) => void, formatter: Formatter = identity) =>
  (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const rawValue = input.value;
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;
    const formattedValue = formatter(rawValue);

    onChange(formattedValue);

    if (typeof window === 'undefined' || selectionStart === null || selectionEnd === null) {
      return;
    }

    const nextSelectionStart = formatter(rawValue.slice(0, selectionStart)).length;
    const nextSelectionEnd = formatter(rawValue.slice(0, selectionEnd)).length;

    requestAnimationFrame(() => {
      if (!input.isConnected || input.ownerDocument.activeElement !== input) {
        return;
      }

      input.setSelectionRange(nextSelectionStart, nextSelectionEnd);
    });
  };
