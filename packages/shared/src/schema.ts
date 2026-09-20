import { z } from 'zod';

export const categoryTypeSchema = z.enum(['foreground', 'text']);

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Expected a 6-digit hex color');

export const categorySchema = z.object({
  id: z.string().min(1),
  type: categoryTypeSchema,
  label: z.string().min(1),
  color: hexColorSchema,
  order: z.number().int().nonnegative(),
  active: z.boolean(),
  visible: z.boolean(),
});

export const dateMarkSchema = z.object({
  categoryIds: z.array(z.string().min(1)).max(2).default([]),
  textCategoryIds: z.array(z.string().min(1)).default([]),
});

export const dateMarkMapSchema = z.record(z.string(), dateMarkSchema);

export const sessionSnapshotSchema = z.object({
  schemaVersion: z.number().int().positive(),
  categories: z.array(categorySchema),
  dateMarks: dateMarkMapSchema,
});

export const accessLevelSchema = z.enum(['viewer', 'editor', 'owner']);

export const createSessionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export const updateSessionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export const shareSessionSchema = z.object({
  email: z.email(),
  accessLevel: z.enum(['viewer', 'editor']),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type DateMarkInput = z.infer<typeof dateMarkSchema>;
export type SessionSnapshotInput = z.infer<typeof sessionSnapshotSchema>;
export type AccessLevel = z.infer<typeof accessLevelSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type ShareSessionInput = z.infer<typeof shareSessionSchema>;
