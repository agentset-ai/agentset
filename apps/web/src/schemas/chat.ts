import { validateUIMessages } from "ai";
import z from "zod/v4";

export const messagesSchema = z.any().transform((messages) => {
  return validateUIMessages({ messages });
});
