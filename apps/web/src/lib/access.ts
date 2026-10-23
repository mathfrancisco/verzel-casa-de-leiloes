import type { Role, UserDto } from '@leilao/shared';

export type Access = 'loading' | 'allow' | 'login' | 'forbidden';

/** `undefined` = sessão ainda carregando; `null` = visitante. Só UX: o servidor decide. */
export function resolveAccess(user: UserDto | null | undefined, role?: Role): Access {
  if (user === undefined) return 'loading';
  if (user === null) return 'login';
  if (role && user.role !== role) return 'forbidden';
  return 'allow';
}
