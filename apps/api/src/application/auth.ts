import type { LoginInput, RegisterInput, UserDto } from '@leilao/shared';
import { eq } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { DomainError } from '../domain/errors';
import type { Db } from '../infra/db/client';
import { users, wallets } from '../infra/db/schema';
import { hashPassword, verifyPassword } from '../infra/password';

export interface AuthDeps {
  db: Db;
}

const toDto = (row: typeof users.$inferSelect): UserDto => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
});

/** Cria usuário e carteira (saldo 0) na mesma transação. */
export async function registerUser({ db }: AuthDeps, input: RegisterInput): Promise<UserDto> {
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          id: uuidv7(),
          name: input.name,
          email: input.email,
          passwordHash,
          role: input.role,
        })
        .returning();
      await tx.insert(wallets).values({ userId: user!.id });
      return toDto(user!);
    });
  } catch (err) {
    if (isUniqueViolation(err, 'users_email_unique')) throw new DomainError('EMAIL_TAKEN');
    throw err;
  }
}

// Hash de referência para gastar o mesmo tempo quando o e-mail não existe.
let dummyHash: Promise<string> | undefined;

export async function authenticate({ db }: AuthDeps, input: LoginInput): Promise<UserDto> {
  const [user] = await db.select().from(users).where(eq(users.email, input.email));
  const hash = user?.passwordHash ?? (await (dummyHash ??= hashPassword('senha-inexistente')));
  const valid = await verifyPassword(hash, input.password);
  if (!user || !valid) throw new DomainError('INVALID_CREDENTIALS');
  return toDto(user);
}

export async function getUser({ db }: AuthDeps, id: string): Promise<UserDto | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ? toDto(user) : null;
}

function isUniqueViolation(err: unknown, constraint: string): boolean {
  // O Drizzle embrulha o erro do driver em `cause`.
  for (
    let e = err as { code?: string; constraint_name?: string; cause?: unknown } | undefined;
    e;

  ) {
    if (e.code === '23505' && e.constraint_name === constraint) return true;
    e = e.cause as typeof e;
  }
  return false;
}
