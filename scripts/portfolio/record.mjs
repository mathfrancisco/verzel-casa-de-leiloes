// Monta o vídeo da demo a partir das capturas reais: cada cena mostra uma captura com legenda
// gravada na imagem; a gravação é feita pelo próprio Playwright (recordVideo, VP8/WebM).
import { createRequire } from 'node:module';
import { writeFileSync, readFileSync, renameSync, mkdirSync } from 'node:fs';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium } = require('@playwright/test');

const [SHOTS, OUT] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const TAG = 'Gravação local (FakeCatalog) · 28/10/2026 · main d9cc1d5 · saldo simulado';

const scenes = [
  {
    s: 5,
    img: null,
    cap: 'Casa de Leilões: leilões de arte com lances ao vivo e histórico auditável. Nenhum dinheiro real é movimentado.',
  },
  {
    s: 8,
    img: '01-vitrine',
    cap: 'Vitrine com obras do Art Institute of Chicago. O aviso de saldo simulado fica sempre visível.',
  },
  {
    s: 9,
    img: '02-sala-ana',
    cap: 'Sessão A (Ana) abre o lote: preço atual, próximo lance mínimo e cronômetro.',
  },
  {
    s: 8,
    img: '03-lance-recusado-bruno',
    cap: 'Sessão B (Bruno), outro navegador: lance abaixo do mínimo é recusado pelo servidor.',
  },
  {
    s: 11,
    img: '04-ana-superada',
    cap: 'Bruno cobre com o valor mínimo. Na sessão A, sem recarregar, chegam o novo preço e o aviso "Você foi superado".',
  },
  {
    s: 7,
    img: '05-carteira-ana',
    cap: 'Carteira da Ana: saldo simulado; a reserva do lance foi liberada quando ela foi superada.',
  },
  {
    s: 8,
    img: '06-comprovante',
    cap: 'Comprovante público de um lote encerrado. Dado de demonstração criado pelo seed.',
  },
  {
    s: 11,
    img: '07-auditoria',
    cap: 'Auditoria pública: o navegador verifica hashes encadeados e assinaturas Ed25519. Resultado: cadeia íntegra.',
  },
  { s: 6, img: '08-sala-mobile', cap: 'A mesma sala no celular.', mobile: true },
  {
    s: 6,
    img: null,
    cap: 'TypeScript · React + Vite · Fastify + Socket.IO · PostgreSQL + Drizzle. github.com/mathfrancisco/verzel-casa-de-leiloes',
  },
];

const img = (n) => `data:image/png;base64,${readFileSync(`${SHOTS}/${n}.png`).toString('base64')}`;
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>
body{margin:0;background:#141414;color:#f4f1ea;font:22px/1.35 system-ui,sans-serif;width:1280px;height:720px;overflow:hidden}
.scene{position:absolute;inset:0;display:none;align-items:center;justify-content:center;padding-bottom:110px;box-sizing:border-box}
.scene.on{display:flex}.scene img{max-width:1180px;max-height:560px;border-radius:10px;box-shadow:0 8px 30px #000a}
.scene.title{font-size:44px;font-weight:700;text-align:center;padding:0 120px 110px}
.cap{position:absolute;left:50px;right:50px;bottom:22px;background:#000c;padding:14px 20px;border-radius:8px;min-height:60px}
.tag{position:absolute;top:10px;right:14px;font-size:14px;background:#000b;padding:4px 10px;border-radius:6px;color:#e9c46a}
.cut{position:absolute;top:10px;left:14px;font-size:14px;background:#c2410c;padding:4px 10px;border-radius:6px;display:none}
</style><body>
${scenes.map((c, i) => (c.img ? `<div class="scene" id="s${i}"><img src="${img(c.img)}" alt=""></div>` : `<div class="scene title" id="s${i}">${i === 0 ? 'Casa de Leilões' : 'Stack e repositório'}</div>`)).join('')}
<div class="cap" id="cap"></div><div class="tag">${TAG}</div><div class="cut" id="cut">✂ corte</div>
<script>window.scenes=${JSON.stringify(scenes.map((c) => ({ s: c.s, cap: c.cap })))};
window.play=async()=>{for(let i=0;i<scenes.length;i++){document.querySelectorAll('.scene').forEach(e=>e.classList.remove('on'));
document.getElementById('s'+i).classList.add('on');document.getElementById('cap').textContent=scenes[i].cap;
const cut=document.getElementById('cut');cut.style.display=i>1?'block':'none';
await new Promise(r=>setTimeout(r,scenes[i].s*1000));}};</script></body></html>`;
writeFileSync(`${OUT}/player.html`, html);

// Legendas em WebVTT com os mesmos textos e tempos.
const ts = (t) => new Date(t * 1000).toISOString().slice(11, 23);
let t = 0;
const vtt = ['WEBVTT', ''];
scenes.forEach((c, i) => {
  vtt.push(String(i + 1), `${ts(t)} --> ${ts(t + c.s)}`, c.cap, '');
  t += c.s;
});
writeFileSync(`${OUT}/demo-local-2026-10-28.pt-BR.vtt`, vtt.join('\n'));

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
});
const page = await ctx.newPage();
await page.goto('file:///' + `${OUT}/player.html`.replace(/\\/g, '/'));
await page.evaluate(() => window.play());
const video = page.video();
await ctx.close();
renameSync(await video.path(), `${OUT}/demo-local-2026-10-28.webm`);
await browser.close();
console.log('total', t, 's');
