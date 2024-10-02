import { cn } from '@/lib/utils';
import { useEditor } from 'novel';
import { LuCheck, LuTrash } from 'react-icons/lu';
import { type Dispatch, type FC, type SetStateAction, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PopoverContent, Popover, PopoverTrigger } from '@/components/ui/popover';

export function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}
export function getUrlFromString(str: string) {
  if (isValidUrl(str)) return str;
  try {
    if (str.includes('.') && !str.includes(' ')) {
      return new URL(`https://${str}`).toString();
    }
  } catch (e) {
    return null;
  }
}
interface LinkSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LinkSelector = ({ open, onOpenChange }: LinkSelectorProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { editor } = useEditor();

  useEffect(() => {
    inputRef.current?.focus();
  });

  if (!editor) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLFormElement;
    const input = target[0] as HTMLInputElement;
    const url = getUrlFromString(input.value);
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
      onOpenChange(false);
    }
  };

  return (
    <Popover modal={true} open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-2 rounded-none border-none">
          <p className="text-base">↗</p>
          <p
            className={cn('underline decoration-stone-400 underline-offset-4', {
              'text-blue-500': editor.isActive('link'),
            })}
          >
            Link
          </p>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-0" sideOffset={10}>
        <form onSubmit={handleSubmit} className="flex p-1">
          <input
            dir="ltr"
            ref={inputRef}
            type="text"
            placeholder="Paste a link"
            className="flex-1 bg-background p-1 text-sm outline-none"
            defaultValue={editor.getAttributes('link').href || ''}
          />
          {editor.getAttributes('link').href ? (
            <Button
              size="icon"
              variant="outline"
              type="button"
              className="flex h-8 items-center rounded-sm p-1 text-red-600 transition-all hover:bg-red-100 dark:hover:bg-red-800"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                editor.chain().focus().unsetLink().run();
                onOpenChange(false);
              }}
            >
              <LuTrash className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" className="h-8" type="submit">
              <LuCheck className="h-4 w-4" />
            </Button>
          )}
        </form>
      </PopoverContent>
    </Popover>
  );
};
