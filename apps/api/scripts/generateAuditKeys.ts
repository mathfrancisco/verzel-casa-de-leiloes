import { generateKeyPairSync } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const outDir = resolve(process.cwd(), process.argv[2] ?? 'keys');
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const publicJwk = publicKey.export({ format: 'jwk' });
if (!publicJwk.x) throw new Error('Não foi possível exportar a chave pública Ed25519.');

await mkdir(outDir, { recursive: true });
await writeFile(
  resolve(outDir, 'audit-signing-private.pem'),
  privateKey.export({ format: 'pem', type: 'pkcs8' }),
  {
    encoding: 'utf8',
    mode: 0o600,
    flag: 'wx',
  },
);
await writeFile(resolve(outDir, 'audit-signing-public.key'), publicJwk.x, {
  encoding: 'utf8',
  mode: 0o644,
  flag: 'wx',
});
console.log(`Chaves Ed25519 criadas em ${outDir}. Guarde a chave privada fora do repositório.`);
