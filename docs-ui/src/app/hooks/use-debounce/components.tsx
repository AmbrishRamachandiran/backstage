'use client';

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function UseDebounceExample() {
  const [inputValue, setInputValue] = useState('');
  const debouncedValue = useDebounce(inputValue, 500);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Type something:
        </label>
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Start typing..."
        />
      </div>
      <div className="p-4 bg-gray-50 rounded-md">
        <p className="text-sm text-gray-600">
          <strong>Input Value:</strong> {inputValue || '(empty)'}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Debounced Value:</strong> {debouncedValue || '(empty)'}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          The debounced value updates 500ms after you stop typing.
        </p>
      </div>
    </div>
  );
}
