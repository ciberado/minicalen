import type { Category } from './domain';

export function defaultCategories(): Category[] {
  return [
    { id: 'foreground-important', type: 'foreground', label: 'Important', color: '#F44336', order: 0, active: true, visible: true },
    { id: 'foreground-work', type: 'foreground', label: 'Work', color: '#2196F3', order: 1, active: true, visible: true },
    { id: 'foreground-personal', type: 'foreground', label: 'Personal', color: '#4CAF50', order: 2, active: true, visible: true },
    { id: 'text-holiday', type: 'text', label: 'Holiday', color: '#FF5722', order: 0, active: true, visible: true },
    { id: 'text-deadline', type: 'text', label: 'Deadline', color: '#795548', order: 1, active: true, visible: true },
  ];
}
