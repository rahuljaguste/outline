import { z } from "zod";
import { Client } from "@shared/types";
import { BaseSchema } from "@server/routes/api/schema";

export const PasswordSchema = BaseSchema.extend({
  body: z.object({
    email: z.email(),
    password: z.string().min(1).max(256),
    client: z.enum(Client).prefault(Client.Web),
  }),
});

export type PasswordReq = z.infer<typeof PasswordSchema>;
