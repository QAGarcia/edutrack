import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

// Permite rodar comandos tanto da raiz do monorepo quanto de apps/api.
loadEnv({ path: resolve(process.cwd(), '.env'), quiet: true });
loadEnv({ path: resolve(__dirname, '../../../../.env'), quiet: true });

const bool = z.enum(['true', 'false']).transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url().default('postgresql://edutrack:edutrack@localhost:5432/edutrack'),
  DATABASE_SSL: bool.default(false),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET deve ter ao menos 16 caracteres').default('dev-secret-change-me-please'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(10),
  ENABLE_TEST_ROUTES: bool.default(false),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  for (const issue of parsed.error.issues) console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
