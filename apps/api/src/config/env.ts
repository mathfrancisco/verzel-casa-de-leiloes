import { z } from 'zod';

// Variáveis lidas no start (ai/specs/SP-10-infra-e-entrega.md). As demais entram com os cards que
// as usam.
const envSchema = z.object({
  DATABASE_URL: z
    .string({ required_error: 'obrigatória' })
    .regex(/^postgres(ql)?:\/\//, 'deve ser uma URL postgres://'),
  JWT_SECRET: z.string({ required_error: 'obrigatória' }).min(32, 'mínimo de 32 caracteres'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CATALOG_PROVIDER: z.enum(['artic', 'fake']).default('artic'),
});

export type Env = z.infer<typeof envSchema>;

export class EnvError extends Error {}

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  const problems = result.error.issues.map(
    (issue) => `- ${issue.path.join('.')}: ${issue.message}`,
  );
  throw new EnvError(`Variáveis de ambiente inválidas:\n${problems.join('\n')}`);
}
