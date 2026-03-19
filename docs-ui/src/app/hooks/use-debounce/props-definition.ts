import { type PropDef } from '@/utils/propDefs';

export const useDebounceParamDefs: Record<string, PropDef> = {
  value: {
    type: 'string',
    description: 'The value to debounce. Can be any type',
  },
  delay: {
    type: 'number',
    description:
      'The delay in milliseconds to wait before updating the debounced value',
    default: '500',
  },
};

export const useDebounceReturnDefs: Record<string, PropDef> = {
  debouncedValue: {
    type: 'string',
    description:
      'The debounced value that updates after the specified delay has passed since the last change',
  },
};
