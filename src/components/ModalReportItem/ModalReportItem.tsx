'use client';

import { RadioGroup } from '@/app/headlessui';
import ButtonPrimary from '@/components/Button/ButtonPrimary';
import Textarea from '@/components/Textarea/Textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import twFocusClass from '@/utils/twFocusClass';
import { type FC, useEffect, useRef, useState } from 'react';
import ButtonThird from '../Button/ButtonThird';

export interface ProblemPlan {
  name: string;
  label: string;
}

export interface ModalReportItemProps {
  show: boolean;
  problemPlans?: ProblemPlan[];
  onCloseModalReportItem: () => void;
}

const problemPlansDemo = [
  { name: 'Violence', id: 'Violence', label: 'خشونت' },
  { name: 'Trouble', id: 'Trouble', label: 'مشکل‌ساز' },
  { name: 'Spam', id: 'Spam', label: 'اسپم' },
  { name: 'Other', id: 'Other', label: 'سایر موارد' },
];

const ModalReportItem: FC<ModalReportItemProps> = ({
  problemPlans = problemPlansDemo,
  show,
  onCloseModalReportItem,
}) => {
  const textareaRef = useRef(null);

  const [problemSelected, setProblemSelected] = useState(problemPlans[0]);

  useEffect(() => {
    if (show) {
      setTimeout(() => {
        const element: HTMLTextAreaElement | null = textareaRef.current;
        if (element) {
          (element as HTMLTextAreaElement).focus();
        }
      }, 400);
    }
  }, [show]);

  const handleClickSubmitForm = () => {};

  const renderCheckIcon = () => {
    return (
      // biome-ignore lint/a11y/noSvgWithoutTitle: <explanation>
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <circle cx={12} cy={12} r={12} fill="#fff" opacity="0.2" />
        <path
          d="M7 13l3 3 7-7"
          stroke="#fff"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const renderContent = () => {
    return (
      <form action="#">
        <RadioGroup value={problemSelected} onChange={setProblemSelected}>
          <RadioGroup.Label className="sr-only">طرح‌های مشکل</RadioGroup.Label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {problemPlans.map((plan) => (
              <RadioGroup.Option
                key={plan.name}
                value={plan}
                className={({ checked }) => {
                  return `${
                    checked
                      ? 'bg-primary-600 text-white dark:bg-primary-700 shadow-primary-600/30 backdrop-blur-md border border-white/25'
                      : 'bg-white/80 border-t border-neutral-50 backdrop-blur-md '
                  } relative shadow-lg rounded-lg px-3 py-3 cursor-pointer flex sm:px-5 sm:py-4 focus:outline-none ${twFocusClass(true)}`;
                }}
              >
                {({ checked }) => (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <div className="text-sm">
                        <RadioGroup.Label
                          as="p"
                          className={`font-medium line-clamp-1 ${
                            checked ? 'text-white' : 'text-neutral-900'
                          }`}
                        >
                          {plan.label}
                        </RadioGroup.Label>
                      </div>
                    </div>
                    {checked && (
                      <div className="flex-shrink-0  text-white">{renderCheckIcon()}</div>
                    )}
                  </div>
                )}
              </RadioGroup.Option>
            ))}
          </div>
        </RadioGroup>

        <div className="mt-4">
          <h4 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">پیام</h4>
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            لطفاً هرگونه اطلاعات یا زمینه اضافی که به ما کمک می‌کند وضعیت را درک و رسیدگی کنیم، ارائه
            دهید.
          </span>
          <Textarea
            placeholder="..."
            className="mt-3"
            ref={textareaRef}
            required={true}
            rows={4}
            id="report-message"
          />
        </div>
        <div className="mt-4 flex gap-3">
          <ButtonPrimary onClick={handleClickSubmitForm} type="submit">
            ارسال
          </ButtonPrimary>
          <ButtonThird type="button" onClick={onCloseModalReportItem}>
            لغو
          </ButtonThird>
        </div>
      </form>
    );
  };

  return (
    <Dialog
      open={show}
      onOpenChange={(open) => {
        if (!open) onCloseModalReportItem();
      }}
    >
      <DialogContent className="max-w-screen-md">
        <DialogHeader>
          <DialogTitle>گزارش تخلف</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default ModalReportItem;
