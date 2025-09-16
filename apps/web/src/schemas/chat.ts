import z from "zod/v4";

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1),
});

const partSchema = z.union([textPartSchema, z.any()]);

export const messagesSchema = z.array(
  z.object({
    id: z.string(),
    role: z.enum(["user", "assistant"]),
    parts: z.array(partSchema),
  }),
);
