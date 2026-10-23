import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const apiDir = fileURLToPath(new URL('../..', import.meta.url));

describe('início da API', () => {
  it('não sobe sem DATABASE_URL, JWT_SECRET e PSEUDONYM_SECRET e explica o motivo', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/main.ts'], {
      cwd: apiDir,
      env: { PATH: process.env.PATH },
      encoding: 'utf8',
      timeout: 20_000,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('DATABASE_URL');
    expect(result.stderr).toContain('JWT_SECRET');
    expect(result.stderr).toContain('PSEUDONYM_SECRET');
  });
});
