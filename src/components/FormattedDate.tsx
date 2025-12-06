'use client';

import { formatDate } from '@/utils/formatDate';
import React from 'react';

interface FormattedDateProps {
  date: Date | string | number;
}

const FormattedDate: React.FC<FormattedDateProps> = ({ date }) => {
  const [formattedDate, setFormattedDate] = React.useState<string>('');

  React.useEffect(() => {
    setFormattedDate(formatDate(date));
  }, [date]);

  return <span>{formattedDate}</span>;
};

export default FormattedDate;
