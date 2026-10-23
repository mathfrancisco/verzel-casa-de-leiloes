import type { CatalogItem, CatalogSearchResult } from '@leilao/shared';

/**
 * Único ponto de contato com a API externa de obras (SP-02). Implementações: `ArticCatalog`
 * (produção) e `FakeCatalog` (testes, E2E e seed). Falhas viram `DomainError`
 * `CATALOG_UNAVAILABLE` ou `CATALOG_ITEM_NOT_FOUND`.
 */
export interface CatalogProvider {
  search(query: string, page: number): Promise<CatalogSearchResult>;
  getItem(externalId: string): Promise<CatalogItem>;
}
