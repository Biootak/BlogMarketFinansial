import type React from 'react';
import { Button } from './ui/button';

interface SubmitButtonProps {
  isSubmitting: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({ isSubmitting }) => {
  return (
    <div className="flex justify-center w-full mt-4">
      <Button variant="default" type="submit">
        {isSubmitting ? 'در حال ارسال ...' : 'ذخیره'}
      </Button>
    </div>
  );
};

export default SubmitButton;
