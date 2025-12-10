
"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type TagInputProps = {
  id?: string;
  name?: string;
  placeholder?: string;
  defaultValue?: string[] | null;
  className?: string;
};

export function TagInput({ id, name, placeholder, defaultValue = [], className }: TagInputProps) {
  const [tags, setTags] = useState<string[]>(defaultValue || []);
  const [inputValue, setInputValue] = useState('');
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Update the hidden input whenever the tags change
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = JSON.stringify(tags);
    }
  }, [tags]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      e.preventDefault();
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div>
      <div className={cn("flex flex-wrap items-center gap-2 rounded-md border border-input px-3 py-2 text-sm ring-offset-background", className)}>
        {tags.map(tag => (
          <Badge key={tag} variant="secondary" className="group/tag font-normal">
            {tag}
            <button
              type="button"
              className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              onClick={() => removeTag(tag)}
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          </Badge>
        ))}
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={tags.length > 0 ? '' : placeholder}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 min-w-[60px]"
        />
      </div>
      <input type="hidden" name={name} ref={hiddenInputRef} defaultValue={JSON.stringify(defaultValue || [])} />
    </div>
  );
}
