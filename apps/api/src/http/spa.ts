import fastifyStatic from '@fastify/static';
import type { FastifyInstance, FastifyRequest } from 'fastify';

/** Serve o build do web (Vite). Arquivos em /assets têm hash no nome: cache imutável. */
export function registerSpa(app: FastifyInstance, webDistDir: string): void {
  // Registrado na raiz (o plugin não é encapsulado) para o handler de 404 poder usar `sendFile`.
  app.register(fastifyStatic, {
    root: webDistDir,
    wildcard: false,
    cacheControl: false,
    setHeaders(res, filePath) {
      res.setHeader(
        'cache-control',
        filePath.replaceAll('\\', '/').includes('/assets/')
          ? 'public, max-age=31536000, immutable'
          : 'no-cache',
      );
    },
  });
}

/** Rotas do SPA (ex.: /lotes/123) devolvem o index.html; API e arquivos inexistentes, não. */
export function isSpaRoute(request: FastifyRequest): boolean {
  if (request.method !== 'GET') return false;
  const path = request.url.split('?')[0] ?? '';
  if (path.startsWith('/api/') || path.startsWith('/socket.io/')) return false;
  const lastSegment = path.slice(path.lastIndexOf('/') + 1);
  return !lastSegment.includes('.');
}
