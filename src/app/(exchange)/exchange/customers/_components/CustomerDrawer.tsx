'use client';

/**
 * CustomerDrawer — فرم ویرایش مشتری در CustomerDetailView.
 *
 * این نسخه سبک است: state مدیریت خارج (CustomerDetailView) است،
 * فرم فقط داده را به onSave می‌دهد.
 * props: open, initialData, saving, onClose, onSave
 */

import type { CustomerRow } from '@/actions/exchange-customers';
import { PanelDrawer } from '@/components/Dashboard/primitives';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';

interface Props {
  open: boolean;
  initialData: CustomerRow;
  saving: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

interface FormState {
  fullName: string;
  phone: string;
  fatherName: string;
  city: string;
  address: string;
  notes: string;
}

export default function CustomerDrawer({ open, initialData, saving, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>({
    fullName: initialData.fullName,
    phone: initialData.phone,
    fatherName: initialData.fatherName ?? '',
    city: initialData.city ?? '',
    address: initialData.address ?? '',
    notes: initialData.notes ?? '',
  });

  // Sync when initialData changes
  useEffect(() => {
    setForm({
      fullName: initialData.fullName,
      phone: initialData.phone,
      fatherName: initialData.fatherName ?? '',
      city: initialData.city ?? '',
      address: initialData.address ?? '',
      notes: initialData.notes ?? '',
    });
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      fullName: form.fullName,
      phone: form.phone,
      fatherName: form.fatherName || null,
      city: form.city || null,
      address: form.address || null,
      notes: form.notes || null,
    });
  };

  return (
    <PanelDrawer
      open={open}
      onClose={onClose}
      title="ویرایش اطلاعات مشتری"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: '1px solid var(--at-line)',
              background: 'transparent',
              color: 'var(--at-text-secondary)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            انصراف
          </button>
          <button
            type="submit"
            form="customer-drawer-form"
            disabled={saving}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--at-accent)',
              color: '#fff',
              cursor: saving ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              fontWeight: 600,
            }}
          >
            {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      }
    >
      <form
        id="customer-drawer-form"
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label
              htmlFor="cdr-fullName"
              style={{ fontSize: 12, fontWeight: 600, color: 'var(--at-text-dim)', display: 'block', marginBottom: 4 }}
            >
              نام کامل *
            </label>
            <Input id="cdr-fullName" name="fullName" value={form.fullName} onChange={handleChange} required />
          </div>
          <div>
            <label
              htmlFor="cdr-phone"
              style={{ fontSize: 12, fontWeight: 600, color: 'var(--at-text-dim)', display: 'block', marginBottom: 4 }}
            >
              تلفن *
            </label>
            <Input id="cdr-phone" name="phone" value={form.phone} onChange={handleChange} dir="ltr" required />
          </div>
          <div>
            <label
              htmlFor="cdr-fatherName"
              style={{ fontSize: 12, fontWeight: 600, color: 'var(--at-text-dim)', display: 'block', marginBottom: 4 }}
            >
              نام پدر
            </label>
            <Input id="cdr-fatherName" name="fatherName" value={form.fatherName} onChange={handleChange} />
          </div>
          <div>
            <label
              htmlFor="cdr-city"
              style={{ fontSize: 12, fontWeight: 600, color: 'var(--at-text-dim)', display: 'block', marginBottom: 4 }}
            >
              شهر
            </label>
            <Input id="cdr-city" name="city" value={form.city} onChange={handleChange} />
          </div>
        </div>
        <div>
          <label
            htmlFor="cdr-address"
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--at-text-dim)', display: 'block', marginBottom: 4 }}
          >
            آدرس
          </label>
          <Input id="cdr-address" name="address" value={form.address} onChange={handleChange} />
        </div>
        <div>
          <label
            htmlFor="cdr-notes"
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--at-text-dim)', display: 'block', marginBottom: 4 }}
          >
            یادداشت
          </label>
          <textarea
            id="cdr-notes"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--at-line)',
              background: 'var(--at-bg-canvas)',
              color: 'var(--at-text-primary)',
              fontFamily: 'inherit',
              fontSize: 14,
              resize: 'vertical',
            }}
          />
        </div>
      </form>
    </PanelDrawer>
  );
}
