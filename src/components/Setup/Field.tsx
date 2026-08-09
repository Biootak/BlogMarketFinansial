'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';

/**
 * Field — the only input primitive used by the setup wizard.
 *
 * Features:
 *   - Floating label that animates from inline to bar above on focus/filled
 *   - Glass background with conic glow ring on focus
 *   - Inline error / success state with tone-appropriate icon
 *   - Optional leading icon slot and trailing adornment slot
 *   - RTL-aware: passes `dir` to the underlying input via the parent form
 *   - Live character counter when `maxLength` is set
 *   - `aria-describedby` wired to help and error elements for screen readers
 *   - `aria-invalid` toggled when there's an error
 */

type Tone = 'neutral' | 'error' | 'success';

export interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url';
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
  placeholder?: string;
  help?: string;
  error?: string | null;
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
  dir?: 'rtl' | 'ltr' | 'auto';
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  showCounter?: boolean;
  inputClassName?: string;
  wrapperClassName?: string;
  autoFocus?: boolean;
  name?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

export const Field = React.forwardRef<HTMLInputElement | null, FieldProps>(function Field(
  {
    id,
    label,
    value,
    onChange,
    onBlur,
    type = 'text',
    inputMode,
    autoComplete,
    placeholder = ' ',
    help,
    error,
    maxLength,
    required,
    disabled,
    dir,
    leading,
    trailing,
    showCounter = false,
    inputClassName,
    wrapperClassName,
    autoFocus: _autoFocus,
    name,
    onKeyDown,
  },
  ref,
) {
  const tone: Tone = error ? 'error' : value.length > 0 ? 'success' : 'neutral';
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const counterId = `${id}-count`;

  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('setup-field', `setup-field--${tone}`, wrapperClassName)} data-tone={tone}>
      <div className="setup-field__shell">
        {leading ? (
          <span className="setup-field__leading" aria-hidden="true">
            {leading}
          </span>
        ) : null}
        <input
          ref={ref}
          id={id}
          name={name ?? id}
          type={type}
          value={value}
          inputMode={inputMode}
          autoComplete={autoComplete}
          placeholder={placeholder}
          maxLength={maxLength}
          required={required}
          disabled={disabled}
          dir={dir}
          aria-invalid={tone === 'error' || undefined}
          aria-describedby={
            [describedBy, showCounter && maxLength ? counterId : null].filter(Boolean).join(' ') ||
            undefined
          }
          aria-required={required || undefined}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          autoFocus={_autoFocus}
          className={cn('setup-field__input', inputClassName)}
        />
        <label htmlFor={id} className="setup-field__label">
          <span>{label}</span>
          {required ? (
            <span className="setup-field__required" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        {trailing ? <span className="setup-field__trailing">{trailing}</span> : null}
      </div>

      <div className="setup-field__meta">
        <div className="setup-field__messages">
          {error ? (
            <p id={errorId} role="alert" className="setup-field__error">
              {error}
            </p>
          ) : help ? (
            <p id={helpId} className="setup-field__help">
              {help}
            </p>
          ) : null}
        </div>
        {showCounter && maxLength ? (
          <span id={counterId} aria-live="polite" className="setup-field__counter">
            <span className="setup-field__counter-value">{value.length}</span>
            <span className="setup-field__counter-sep"> / </span>
            <span className="setup-field__counter-max">{maxLength}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
});

export interface TextAreaFieldProps {
  id: string;
  name?: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  help?: string;
  error?: string | null;
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  showCounter?: boolean;
  dir?: 'rtl' | 'ltr' | 'auto';
  leading?: React.ReactNode;
}

export function TextAreaField({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  placeholder = ' ',
  help,
  error,
  maxLength,
  required,
  disabled,
  rows = 4,
  showCounter = true,
  dir,
  leading,
}: TextAreaFieldProps) {
  const tone: Tone = error ? 'error' : value.length > 0 ? 'success' : 'neutral';
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const counterId = `${id}-count`;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('setup-field', `setup-field--${tone}`)} data-tone={tone}>
      <div className="setup-field__shell setup-field__shell--textarea">
        {leading ? (
          <span className="setup-field__leading" aria-hidden="true">
            {leading}
          </span>
        ) : null}
        <textarea
          id={id}
          name={name ?? id}
          rows={rows}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          required={required}
          disabled={disabled}
          dir={dir}
          aria-invalid={tone === 'error' || undefined}
          aria-describedby={
            [describedBy, showCounter && maxLength ? counterId : null].filter(Boolean).join(' ') ||
            undefined
          }
          aria-required={required || undefined}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className="setup-field__input setup-field__input--textarea"
        />
        <label htmlFor={id} className="setup-field__label">
          <span>{label}</span>
          {required ? (
            <span className="setup-field__required" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      </div>

      <div className="setup-field__meta">
        <div className="setup-field__messages">
          {error ? (
            <p id={errorId} role="alert" className="setup-field__error">
              {error}
            </p>
          ) : help ? (
            <p id={helpId} className="setup-field__help">
              {help}
            </p>
          ) : null}
        </div>
        {showCounter && maxLength ? (
          <span id={counterId} aria-live="polite" className="setup-field__counter">
            <span className="setup-field__counter-value">{value.length}</span>
            <span className="setup-field__counter-sep"> / </span>
            <span className="setup-field__counter-max">{maxLength}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
