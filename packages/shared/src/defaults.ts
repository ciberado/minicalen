import type { Category } from './domain';

export function defaultCategories(): Category[] {
  return [
    { id: 'foreground-important', type: 'foreground', label: 'Important', color: '#E0A097', order: 0, active: true, visible: true },
    { id: 'foreground-work', type: 'foreground', label: 'Work', color: '#9FBED6', order: 1, active: true, visible: true },
    { id: 'foreground-personal', type: 'foreground', label: 'Personal', color: '#A6C4A0', order: 2, active: true, visible: true },
    { id: 'text-holiday', type: 'text', label: 'Holiday', color: '#E8B98E', order: 0, active: true, visible: true },
    { id: 'text-deadline', type: 'text', label: 'Deadline', color: '#BFA398', order: 1, active: true, visible: true },
  ];
}
