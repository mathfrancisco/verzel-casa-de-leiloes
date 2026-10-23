import { z } from 'zod';

/** Contrato da carteira (SP-04). Valores monetários trafegam em centavos inteiros. */
export const depositSchema = z.object({
  amountCents: z
    .number({ invalid_type_error: 'Informe o valor do depósito.' })
    .int('Use um valor inteiro em centavos.')
    .min(100, 'O depósito mínimo é R$ 1,00.')
    .max(100_000_000, 'O depósito máximo é R$ 1.000.000,00.'),
});

export type DepositInput = z.infer<typeof depositSchema>;

export type WalletEntryType =
  | 'DEPOSIT'
  | 'SETTLEMENT_DEBIT'
  | 'SETTLEMENT_CREDIT'
  | 'REFUND_DEBIT'
  | 'REFUND_CREDIT';

export interface WalletCommitment {
  lotId: string;
  title: string;
  amountCents: number;
  endsAt: string;
}

export interface WalletEntry {
  id: number;
  type: WalletEntryType;
  amountCents: number;
  lotId: string | null;
  lotTitle: string | null;
  createdAt: string;
}

export interface Wallet {
  totalCents: number;
  committedCents: number;
  availableCents: number;
  commitments: WalletCommitment[];
  entries: WalletEntry[];
}
