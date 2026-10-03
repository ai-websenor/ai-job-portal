'use client';

import React from 'react';
import { Button, Tooltip } from '@heroui/react';
import { HiOutlineSparkles } from 'react-icons/hi2';

interface AiActionButtonProps {
  label: string;
  onPress: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  /** Shown on hover. Use it to explain why the button is disabled. */
  tooltip?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * The shared entry point for both AI features — resume scoring on the job page
 * and salary prediction on the job form.
 *
 * Deliberately one component rather than two lookalikes: these are the only
 * gradient-filled buttons in the product, and they need to stay visually
 * identical so people learn that "sparkle = AI assistance here". The gradient
 * uses the house `primary`/`secondary` pair from tailwind.config.js, which is
 * already the accent on TrendingJobCard and the featured-job panel.
 */
const AiActionButton: React.FC<AiActionButtonProps> = ({
  label,
  onPress,
  isLoading = false,
  isDisabled = false,
  tooltip,
  size = 'md',
  fullWidth = false,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const button = (
    <Button
      onPress={onPress}
      isLoading={isLoading}
      isDisabled={isDisabled}
      size={size}
      fullWidth={fullWidth}
      aria-label={ariaLabel || label}
      startContent={!isLoading ? <HiOutlineSparkles size={18} aria-hidden /> : undefined}
      className={[
        // Gradient, shadow and focus ring live in `.ai-action-button` in
        // globals.css. The old `from-primary to-secondary` faded into
        // --secondary-color, which is #f2f1fd — so white text sat on near
        // white and half the button could not be read.
        'ai-action-button font-semibold tracking-tight',
        // The gradient already carries the emphasis; a disabled state that
        // still looks vivid reads as broken rather than unavailable.
        isDisabled ? 'opacity-50' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </Button>
  );

  // Tooltip on a disabled HeroUI Button needs the wrapper to receive the
  // pointer events, otherwise the explanation never appears — which is exactly
  // when it is most needed.
  if (!tooltip) return button;

  return (
    <Tooltip content={tooltip} placement="top">
      <span className={fullWidth ? 'w-full' : 'inline-flex'}>{button}</span>
    </Tooltip>
  );
};

export default AiActionButton;
