import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const ConfigSchema = z.object({
  port: z.coerce.number().default(3000),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  azureTenantId: z.string().min(1),
  azureClientId: z.string().min(1),
  azureClientSecret: z.string().min(1),
  jwksUri: z.string().url(),
  jwtAudience: z.string().min(1),
  jwtIssuer: z.string().url(),
  allowedOrigins: z.string().transform((s) => s.split(",")),
});

export const config = ConfigSchema.parse({
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,
  azureTenantId: process.env.AZURE_TENANT_ID,
  azureClientId: process.env.AZURE_CLIENT_ID,
  azureClientSecret: process.env.AZURE_CLIENT_SECRET,
  jwksUri: process.env.JWKS_URI,
  jwtAudience: process.env.JWT_AUDIENCE,
  jwtIssuer: process.env.JWT_ISSUER,
  allowedOrigins: process.env.ALLOWED_ORIGINS ?? "http://localhost:3001",
});
