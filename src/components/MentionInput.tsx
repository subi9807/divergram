import { useState, useEffect, useRef, KeyboardEvent, ChangeEvent } from 'react';
import { supabase } from '../lib/supabase';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  autoFocus?: boolean;
}

interface MentionUser {
  id: string;
  username: string;
  avatar_url: string;
  full_name: string;
}

export default function MentionInput({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  className = '',
  multiline = false,
  autoFocus = false,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkForMention = () => {
      const textBeforeCursor = value.substring(0, cursorPosition);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

      if (mentionMatch) {
        const search = mentionMatch[1];
        searchUsers(search);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
        setSuggestions([]);
      }
    };

    checkForMention();
  }, [value, cursorPosition]);

  const searchUsers = async (search: string) => {
    let query = supabase
      .from('profiles')
      .select('id, username, avatar_url, full_name')
      .limit(5);

    if (search) {
      query = query.ilike('username', `${search}%`);
    }

    const { data } = await query;

    if (data) {
      setSuggestions(data as MentionUser[]);
      setSelectedIndex(0);
    }
  };

  const insertMention = (user: MentionUser) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const beforeMention = textBeforeCursor.substring(0, mentionMatch.index);
      const newValue = `${beforeMention}@${user.username} ${textAfterCursor}`;
      onChange(newValue);

      const newCursorPos = beforeMention.length + user.username.length + 2;
      setCursorPosition(newCursorPos);

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }

    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        insertMention(suggestions[selectedIndex]);
        return;
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter' && !multiline && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newCursorPos = e.target.selectionStart || 0;
    onChange(newValue);
    setCursorPosition(newCursorPos);
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    setCursorPosition(target.selectionStart || 0);
  };

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div className="relative w-full">
      <InputComponent
        ref={inputRef as any}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        placeholder={placeholder}
        className={className}
        autoFocus={autoFocus}
        rows={multiline ? 3 : undefined}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full left-0 w-full bg-white border border-gray-300 rounded-lg shadow-lg mb-2 max-h-60 overflow-y-auto z-50"
        >
          {suggestions.map((user, index) => (
            <button
              key={user.id}
              onClick={() => insertMention(user)}
              className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors ${
                index === selectedIndex ? 'bg-gray-100' : ''
              }`}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-600 font-semibold text-sm">
                    {user.username[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex flex-col items-start">
                <span className="text-sm font-semibold text-gray-900">{user.username}</span>
                {user.full_name && (
                  <span className="text-xs text-gray-500">{user.full_name}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function renderTextWithMentions(
  text: string,
  onUserClick: (username: string) => void
): React.ReactNode {
  const parts = text.split(/(@\w+)/g);

  return parts.map((part, index) => {
    if (part.match(/^@\w+$/)) {
      const username = part.substring(1);
      return (
        <button
          key={index}
          onClick={() => onUserClick(username)}
          className="text-blue-600 hover:underline font-semibold"
        >
          {part}
        </button>
      );
    }
    return <span key={index}>{part}</span>;
  });
}
