import { z } from 'zod';

// Contrato do catálogo externo (ai/specs/SP-02-catalogo-externo.md).

/** Categorias de lote (RN-02), com o rótulo exibido. */
export const LOT_CATEGORIES = {
  PAINTING: 'Pintura',
  SCULPTURE: 'Escultura',
  PHOTOGRAPHY: 'Fotografia',
  PRINT: 'Gravura',
  DRAWING: 'Desenho',
  TEXTILE: 'Têxtil',
  OTHER: 'Outros',
} as const;

export type LotCategory = keyof typeof LOT_CATEGORIES;

export const CATALOG_PAGE_SIZE = 12;

export const catalogSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, 'Digite pelo menos 2 caracteres.')
    .max(100, 'A busca deve ter no máximo 100 caracteres.'),
  page: z.coerce.number().int().min(1).max(50).default(1),
});

export type CatalogSearchQuery = z.infer<typeof catalogSearchQuerySchema>;

export interface CatalogItem {
  externalId: string;
  title: string;
  artist: string | null;
  date: string | null;
  medium: string | null;
  dimensions: string | null;
  origin: string | null;
  imageUrl: string;
  sourceUrl: string;
  suggestedCategory: LotCategory;
}

export interface CatalogSearchResult {
  items: CatalogItem[];
  page: number;
  totalPages: number;
  /** `true` quando a API externa falhou e o resultado veio de uma busca anterior em cache. */
  fromCache: boolean;
}
