import React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

interface CustomSwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {}

const CustomSwitch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  CustomSwitchProps
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root className={cn('custom-switch', className)} {...props} ref={ref}>
    <SwitchPrimitives.Thumb className="thumb" />
  </SwitchPrimitives.Root>
));

CustomSwitch.displayName = 'CustomSwitch';

export { CustomSwitch };
