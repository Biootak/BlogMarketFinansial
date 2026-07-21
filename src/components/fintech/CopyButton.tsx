'use client';

/**
 * CopyButton — کپی کردن متن به clipboard
 * Props: { text: string; label?: string; className?: string }
 */
import { CheckCircle2, Copy } from 'lucide-react';
import { useState } from 'react';

interface Props {
  text: string;
  label?: string;
  className?: string;
}

export default function CopyButton({ text, label = 'کپی', className }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="کپی کد پیگیری"
      aria-pressed={copied}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.3rem 0.8rem',
        borderRadius: '99px',
        border: '1px solid var(--ds-border-default)',
        background: 'var(--ds-surface-elevated, var(--ds-surface))',
        color: copied ? 'var(--ds-status-success-fg, #3ecf8e)' : 'var(--ds-text-muted)',
        fontSize: '0.78rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'opacity 0.15s, color 0.2s',
        lineHeight: 1.4,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.opacity = '0.8';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.opacity = '1';
      }}
    >
      {copied ? (
        <CheckCircle2 size={13} strokeWidth={2} aria-hidden />
      ) : (
        <Copy size={13} strokeWidth={1.75} aria-hidden />
      )}
      {copied ? 'کپی شد!' : label}
    </button>
  );
}
