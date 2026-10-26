// @vitest-environment happy-dom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { LotSummary } from './LotSummary';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const host = document.createElement('div');
document.body.append(host);
const root = createRoot(host);

function render(tone: 'winning' | 'outbid' | 'neutral' | undefined, text: string) {
  act(() =>
    root.render(
      <LotSummary
        priceCents={20_000}
        minimumNextBidCents={22_000}
        live={false}
        endsAt="2030-01-01T00:00:00.000Z"
        extended={false}
        statusText={text}
        statusTone={tone}
        onElapsed={() => undefined}
      />,
    ),
  );
  return host.querySelector('.lot-status') as HTMLElement;
}

afterEach(() => act(() => root.render(null)));

describe('LotSummary', () => {
  it('mantém o texto e o ícone e só acrescenta o tom visual', () => {
    const winning = render('winning', '✓ Você está ganhando');
    expect(winning.textContent).toBe('✓ Você está ganhando');
    expect(winning.className).toContain('lot-status-winning');
    expect(winning.getAttribute('aria-live')).toBe('polite');

    const outbid = render('outbid', '⚠ Você foi superado');
    expect(outbid.textContent).toBe('⚠ Você foi superado');
    expect(outbid.className).toContain('lot-status-outbid');
  });

  it('usa tom neutro por padrão e destaca o preço atual', () => {
    expect(render(undefined, 'Faça seu primeiro lance').className).toContain('lot-status-neutral');
    expect(host.querySelector('.lot-price-main strong')?.textContent).toBe('R$ 200,00');
  });
});
