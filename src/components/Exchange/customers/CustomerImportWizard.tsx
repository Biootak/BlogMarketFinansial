'use client';

/**
 * CustomerImportWizard — ویزارد ورود دسته‌جمعی مشتریان.
 *
 * ۳ گام:
 *   ۱. آپلود CSV یا Paste rows
 *   ۲. Preview و validation (نمایش خطاها به تفکیک)
 *   ۳. Import و نتیجه
 *
 * طرح: progressive disclosure — فقط یک گام در معرض دید،
 * drag-drop zone با orbit animation، pre-flight table.
 */

import { createCustomerAction } from '@/actions/exchange-customers';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileUp,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useRef, useState, useTransition } from 'react';
import s from './CustomerImportWizard.module.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Props {
  exchangeId: string;
  primaryCurrency: string;
}

interface ParsedRow {
  line: number;
  fullName: string;
  phone: string;
  city?: string;
  notes?: string;
  /** خطاهای validation */
  errors: string[];
}

interface ImportResult {
  success: number;
  failed: number;
  rows: { line: number; name: string; ok: boolean; msg?: string }[];
}

// ─── CSV Template ───────────────────────────────────────────────────────────

const CSV_HEADERS = ['fullName', 'phone', 'city', 'notes'] as const;
const TEMPLATE_ROWS = [
  'احمد محمدی,0700000001,کابل,مشتری VIP',
  'زهرا رحیمی,0700000002,هرات,',
];
const TEMPLATE_CSV = `${CSV_HEADERS.join(',')}\n${TEMPLATE_ROWS.join('\n')}`;

// ─── Parser ──────────────────────────────────────────────────────────────────

function parseCSV(text: string): ParsedRow[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  // Skip header if present
  const dataLines = lines[0]?.toLowerCase().includes('fullname') ? lines.slice(1) : lines;

  return dataLines.map((line, i) => {
    const cols = line.split(',').map((c) => c.trim());
    const [fullName = '', phone = '', city = '', notes = ''] = cols;
    const errors: string[] = [];
    if (!fullName || fullName.length < 2) errors.push('نام حداقل ۲ کاراکتر باشد');
    if (!phone || phone.length < 7) errors.push('شماره تلفن نامعتبر');

    return { line: i + 2, fullName, phone, city: city || undefined, notes: notes || undefined, errors };
  });
}

// ─── Step Components ────────────────────────────────────────────────────────

function StepUpload({
  onParsed,
}: {
  onParsed: (rows: ParsedRow[], raw: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [rawText, setRawText] = useState('');
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setRawText(text);
        onParsed(parseCSV(text), text);
      };
      reader.readAsText(file, 'utf-8');
    },
    [onParsed],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handlePaste = useCallback(() => {
    onParsed(parseCSV(rawText), rawText);
  }, [rawText, onParsed]);

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={s.uploadStep}>
      {/* Mode switcher */}
      <div className={s.modeTabs}>
        <button
          type="button"
          className={`${s.modeTab} ${inputMode === 'upload' ? s.modeTabActive : ''}`}
          onClick={() => setInputMode('upload')}
        >
          <FileUp size={14} aria-hidden />
          آپلود فایل CSV
        </button>
        <button
          type="button"
          className={`${s.modeTab} ${inputMode === 'paste' ? s.modeTabActive : ''}`}
          onClick={() => setInputMode('paste')}
        >
          <ClipboardList size={14} aria-hidden />
          وارد کردن متنی
        </button>
      </div>

      {inputMode === 'upload' ? (
        <div
          className={`${s.dropZone} ${dragging ? s.dropZoneDragging : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="محل بارگذاری فایل CSV — کلیک یا کشیدن فایل"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className={s.fileInput}
            aria-hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <div className={s.dropOrbitWrap} aria-hidden>
            <div className={s.dropOrbit} />
            <div className={s.dropOrbitInner} />
            <Upload size={28} className={s.dropIcon} />
          </div>
          <p className={s.dropTitle}>فایل CSV را اینجا بکشید یا کلیک کنید</p>
          <p className={s.dropSub}>فقط .csv — حداکثر ۵۰۰ ردیف</p>
        </div>
      ) : (
        <div className={s.pasteWrap}>
          <label className={s.pasteLabel} htmlFor="csv-paste">
            هر ردیف یک مشتری: نام،تلفن،شهر،یادداشت
          </label>
          <textarea
            id="csv-paste"
            className={s.pasteArea}
            rows={10}
            dir="auto"
            placeholder={`احمد محمدی,0700000001,کابل\nزهرا رحیمی,0700000002,هرات`}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <Button size="sm" onClick={handlePaste} disabled={!rawText.trim()}>
            <ArrowLeft size={14} aria-hidden />
            پیش‌نمایش
          </Button>
        </div>
      )}

      {/* Template download */}
      <button type="button" className={s.templateBtn} onClick={downloadTemplate}>
        <FileUp size={13} aria-hidden />
        دانلود قالب CSV
      </button>

      {/* Column guide */}
      <div className={s.columnGuide}>
        <span className={s.guideTitle}>ستون‌های مورد نیاز:</span>
        {CSV_HEADERS.map((h) => (
          <span key={h} className={`${s.guideTag} ${h === 'fullName' || h === 'phone' ? s.guideTagRequired : ''}`}>
            {h === 'fullName' ? 'fullName *' : h === 'phone' ? 'phone *' : h}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Step Preview ────────────────────────────────────────────────────────────

function StepPreview({
  rows,
  onBack,
  onConfirm,
}: {
  rows: ParsedRow[];
  onBack: () => void;
  onConfirm: () => void;
}) {
  const valid = rows.filter((r) => r.errors.length === 0);
  const invalid = rows.filter((r) => r.errors.length > 0);

  return (
    <div className={s.previewStep}>
      {/* Summary */}
      <div className={s.previewSummary}>
        <div className={`${s.summaryCell} ${s.summaryCellOk}`}>
          <CheckCircle2 size={16} aria-hidden />
          <span className={s.summaryVal}>{valid.length}</span>
          <span className={s.summaryLbl}>آماده ورود</span>
        </div>
        {invalid.length > 0 && (
          <div className={`${s.summaryCell} ${s.summaryCellError}`}>
            <AlertCircle size={16} aria-hidden />
            <span className={s.summaryVal}>{invalid.length}</span>
            <span className={s.summaryLbl}>خطا — نادیده گرفته می‌شود</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={s.previewTable}>
        <div className={s.tableHead}>
          <span>ردیف</span>
          <span>نام</span>
          <span>تلفن</span>
          <span>شهر</span>
          <span>وضعیت</span>
        </div>
        <div className={s.tableBody}>
          {rows.slice(0, 50).map((r) => (
            <div
              key={r.line}
              className={`${s.tableRow} ${r.errors.length > 0 ? s.tableRowError : ''}`}
            >
              <span className={s.cellLine}>{r.line}</span>
              <span className={s.cellName}>{r.fullName || '—'}</span>
              <span className={s.cellPhone} dir="ltr">
                {r.phone || '—'}
              </span>
              <span className={s.cellCity}>{r.city || '—'}</span>
              <span className={s.cellStatus}>
                {r.errors.length === 0 ? (
                  <CheckCircle2 size={14} className={s.iconOk} aria-label="معتبر" />
                ) : (
                  <span className={s.errorList}>{r.errors.join(' · ')}</span>
                )}
              </span>
            </div>
          ))}
          {rows.length > 50 && (
            <div className={s.moreRows}>+{rows.length - 50} ردیف دیگر</div>
          )}
        </div>
      </div>

      <div className={s.previewFooter}>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowRight size={14} aria-hidden />
          بازگشت
        </Button>
        <Button size="sm" onClick={onConfirm} disabled={valid.length === 0}>
          ورود {valid.length} مشتری
          <ArrowLeft size={14} aria-hidden />
        </Button>
      </div>
    </div>
  );
}

// ─── Step Result ────────────────────────────────────────────────────────────

function StepResult({
  result,
  onReset,
}: {
  result: ImportResult;
  onReset: () => void;
}) {
  return (
    <div className={s.resultStep}>
      <div className={s.resultHero} data-success={result.success > 0}>
        <div className={s.resultIconWrap}>
          <CheckCircle2 size={40} className={s.resultIcon} aria-hidden />
        </div>
        <h2 className={s.resultTitle}>
          {result.success} مشتری با موفقیت وارد شد
        </h2>
        {result.failed > 0 && (
          <p className={s.resultSub}>{result.failed} ردیف با خطا مواجه شد</p>
        )}
      </div>

      {result.rows.filter((r) => !r.ok).length > 0 && (
        <div className={s.resultErrors}>
          <h3 className={s.resultErrorsTitle}>
            <AlertCircle size={14} aria-hidden /> ردیف‌های ناموفق
          </h3>
          {result.rows
            .filter((r) => !r.ok)
            .map((r) => (
              <div key={r.line} className={s.resultErrorRow}>
                <span className={s.resultErrorLine}>ردیف {r.line}</span>
                <span className={s.resultErrorName}>{r.name}</span>
                <span className={s.resultErrorMsg}>{r.msg}</span>
              </div>
            ))}
        </div>
      )}

      <div className={s.resultActions}>
        <Button variant="outline" size="sm" onClick={onReset}>
          <RefreshCw size={14} aria-hidden />
          ورود دسته‌جمعی جدید
        </Button>
        <Button size="sm" onClick={() => (window.location.href = '/exchange/customers')}>
          مشاهده لیست مشتریان
          <ArrowLeft size={14} aria-hidden />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const STEPS = ['آپلود', 'پیش‌نمایش', 'نتیجه'] as const;

export function CustomerImportWizard({ exchangeId, primaryCurrency }: Props) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleParsed = useCallback((rows: ParsedRow[], _raw: string) => {
    setParsedRows(rows);
    if (rows.length > 0) setStep(1);
    else toast({ title: 'فایل خالی', description: 'هیچ ردیفی یافت نشد.', variant: 'destructive' });
  }, [toast]);

  const handleConfirm = useCallback(() => {
    const valid = parsedRows.filter((r) => r.errors.length === 0);
    if (valid.length === 0) return;

    startTransition(async () => {
      const resultRows: ImportResult['rows'] = [];
      let successCount = 0;
      let failedCount = 0;

      // Sequential import to avoid rate-limits
      for (const row of valid) {
        const res = await createCustomerAction(exchangeId, {
          fullName: row.fullName,
          phone: row.phone,
          city: row.city ?? null,
          notes: row.notes ?? null,
        });
        if (res.success) {
          successCount++;
          resultRows.push({ line: row.line, name: row.fullName, ok: true });
        } else {
          failedCount++;
          resultRows.push({
            line: row.line,
            name: row.fullName,
            ok: false,
            msg: res.error.message,
          });
        }
      }

      setResult({ success: successCount, failed: failedCount, rows: resultRows });
      setStep(2);
    });
  }, [parsedRows, exchangeId]);

  const handleReset = useCallback(() => {
    setParsedRows([]);
    setResult(null);
    setStep(0);
  }, []);

  return (
    <div className={s.root}>
      {/* ── Stepper ── */}
      <div className={s.stepper} aria-label="مراحل ورود دسته‌جمعی">
        {STEPS.map((label, i) => {
          const state = i < step ? 'done' : i === step ? 'active' : 'pending';
          return (
            <div key={label} className={`${s.stepItem} ${s[`stepItem_${state}`]}`}>
              {i > 0 && (
                <div
                  className={`${s.stepLine} ${i <= step ? s.stepLineDone : ''}`}
                  aria-hidden
                />
              )}
              <div className={`${s.stepDot} ${s[`stepDot_${state}`]}`}>
                {state === 'done' ? (
                  <CheckCircle2 size={14} aria-hidden />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span className={s.stepLabel}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* ── Content ── */}
      <div className={s.content}>
        {isPending && (
          <div className={s.loadingOverlay} aria-label="در حال وارد کردن...">
            <Loader2 size={32} className={s.spinner} aria-hidden />
            <p className={s.loadingText}>در حال وارد کردن مشتریان...</p>
          </div>
        )}

        {step === 0 && <StepUpload onParsed={handleParsed} />}
        {step === 1 && (
          <StepPreview
            rows={parsedRows}
            onBack={() => setStep(0)}
            onConfirm={handleConfirm}
          />
        )}
        {step === 2 && result && <StepResult result={result} onReset={handleReset} />}
      </div>
    </div>
  );
}
