'use client';

import { toPersianDigits } from '@/lib/setup/format';
import type { SetupFormValues } from '@/lib/setup/schema';
import * as React from 'react';

/**
 * AdminPreviewCard — live preview of the super-admin profile being built.
 *
 * Updates on every keystroke so the user can see exactly what their public
 * admin card will look like. This is the page's "Visual Focus" — it anchors
 * the abstract form to a concrete, recognizable artifact.
 *
 * Empty fields fall back to skeleton placeholders so the layout never
 * shifts while the user types.
 */

export interface AdminPreviewCardProps {
  values: Pick<SetupFormValues, 'name' | 'email' | 'jobName' | 'company' | 'bio' | 'phoneNumber'>;
}

function initials(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return '؟';
  // Split on whitespace and take the first character of the first two words.
  const parts = cleaned.split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '؟';
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

export function AdminPreviewCard({ values }: AdminPreviewCardProps) {
  const displayName = values.name.trim() || 'مالک سامانه';
  const displayJob = values.jobName.trim() || 'نقش شما';
  const displayCompany = values.company.trim() || 'نام شرکت';
  const displayBio =
    values.bio.trim() ||
    'این حساب به‌عنوان مالک سامانه ساخته می‌شود. نقش و معرفی شما در گزارش‌ها و ایمیل‌ها نمایش داده خواهد شد.';
  const greeting = firstName(values.name);
  const greetingLine = greeting ? `سلام ${greeting} 👋` : 'این کارت شماست';

  return (
    <aside className="admin-preview" aria-label="پیش‌نمایش زنده‌ی پروفایل مدیر">
      <div className="admin-preview__head">
        <span className="admin-preview__eyebrow">پیش‌نمایش زنده</span>
        <span className="admin-preview__hint">همان‌طور که تایپ می‌کنید، به‌روز می‌شود</span>
      </div>

      <div
        className="admin-preview__card"
        data-empty={displayName === 'مالک سامانه' ? 'true' : 'false'}
      >
        <div className="admin-preview__cover" aria-hidden="true">
          <span className="admin-preview__cover-orb admin-preview__cover-orb--a" />
          <span className="admin-preview__cover-orb admin-preview__cover-orb--b" />
          <span className="admin-preview__cover-grid" />
        </div>

        <div className="admin-preview__body">
          <span className="admin-preview__avatar" aria-hidden="true">
            <span className="admin-preview__avatar-inner">{initials(values.name)}</span>
            <span className="admin-preview__avatar-ring" />
          </span>

          <div className="admin-preview__identity">
            <span className="admin-preview__role-tag">مالک</span>
            <h3 className="admin-preview__name">{displayName}</h3>
            <p className="admin-preview__title">
              <span>{displayJob}</span>
              <span className="admin-preview__sep" aria-hidden="true">
                ·
              </span>
              <span>{displayCompany}</span>
            </p>
          </div>

          <p className="admin-preview__bio">{displayBio}</p>

          <div className="admin-preview__meta">
            <div className="admin-preview__meta-row">
              <span className="admin-preview__meta-label">ایمیل</span>
              <span className="admin-preview__meta-value" dir="ltr">
                {values.email.trim() || '—'}
              </span>
            </div>
            <div className="admin-preview__meta-row">
              <span className="admin-preview__meta-label">تماس</span>
              <span className="admin-preview__meta-value" dir="ltr">
                {values.phoneNumber.trim() || '—'}
              </span>
            </div>
          </div>

          <div className="admin-preview__footer">
            <span className="admin-preview__pill">
              <span className="admin-preview__pill-dot" aria-hidden="true" />
              <span>{greetingLine}</span>
            </span>
            <span className="admin-preview__pill admin-preview__pill--muted">
              <span>سطح دسترسی</span>
              <span className="admin-preview__pill-strong">۱۰۰٪</span>
            </span>
          </div>
        </div>
      </div>

      <ul className="admin-preview__perms" aria-label="دسترسی‌های این نقش">
        <li>
          <span className="admin-preview__perms-dot" aria-hidden="true" />
          <span>مدیریت کاربران و نقش‌ها</span>
        </li>
        <li>
          <span className="admin-preview__perms-dot" aria-hidden="true" />
          <span>تأیید، انتشار و حذف مطالب</span>
        </li>
        <li>
          <span className="admin-preview__perms-dot" aria-hidden="true" />
          <span>دسترسی به گزارش‌ها و تنظیمات حساس</span>
        </li>
        <li>
          <span className="admin-preview__perms-dot" aria-hidden="true" />
          <span>مدیریت نرخ ارز و ابزارهای مالی</span>
        </li>
      </ul>

      <p className="admin-preview__counter" aria-live="polite">
        {toPersianDigits(
          values.name.length + values.jobName.length + values.company.length + values.bio.length,
        )}{' '}
        کاراکتر پروفایل
      </p>
    </aside>
  );
}
