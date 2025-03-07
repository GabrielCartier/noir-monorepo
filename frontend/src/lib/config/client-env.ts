import { z } from 'zod';

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_ALCHEMY_API_KEY: z.string().min(1),
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_VAULT_FACTORY_ADDRESS: z.string().min(1),
});

function getClientEnv() {
  // Access runtime config
  const envParse = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_ALCHEMY_API_KEY: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_VAULT_FACTORY_ADDRESS: process.env
      .NEXT_PUBLIC_VAULT_FACTORY_ADDRESS as `0x${string}`,
  });

  if (!envParse.success) {
    console.error(
      '❌ Invalid client environment variables:',
      envParse.error.flatten().fieldErrors,
    );
    throw new Error('Invalid client environment variables');
  }
  return envParse.data;
}

export const clientEnv = getClientEnv();
