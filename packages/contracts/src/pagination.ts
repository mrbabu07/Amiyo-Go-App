import { z } from "zod";

export const cursorPaginationQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const pageInfoSchema = z.object({
  nextCursor: z.string().nullable(),
  hasNextPage: z.boolean()
});

export const paginatedResponseSchema = <Item extends z.ZodTypeAny>(item: Item) =>
  z.object({
    data: z.array(item),
    pageInfo: pageInfoSchema
  });

export type CursorPaginationQuery = z.infer<typeof cursorPaginationQuerySchema>;
export type PageInfo = z.infer<typeof pageInfoSchema>;
