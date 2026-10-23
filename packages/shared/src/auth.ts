import { z } from 'zod';

// Contrato de autenticação (ai/specs/SP-01-autenticacao.md), validado no front e no back.

export const ROLES = ['AUCTIONEER', 'BIDDER'] as const;
export type Role = (typeof ROLES)[number];

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email('Informe um e-mail válido.')
  .max(254, 'E-mail muito longo.');

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'O nome deve ter pelo menos 2 caracteres.')
    .max(80, 'O nome deve ter no máximo 80 caracteres.'),
  email,
  password: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres.')
    .max(128, 'A senha deve ter no máximo 128 caracteres.'),
  role: z.enum(ROLES, { errorMap: () => ({ message: 'Escolha leiloeiro ou licitante.' }) }),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe a senha.').max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface UserResponse {
  user: UserDto;
}
