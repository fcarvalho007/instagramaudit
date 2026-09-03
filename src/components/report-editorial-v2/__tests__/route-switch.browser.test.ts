/**
 * Teste ao nível do browser para o interruptor `?report_design=editorial_v2`.
 *
 * Corre contra a rota real (`/analyze/$username`) no servidor de
 * desenvolvimento, sem mocks de `ReportPresentation`. Se o servidor não
 * estiver disponível, os casos são saltados em vez de falharem de forma
 * opaca — o teste é uma prova de integração, não um gate de CI.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";

/**
 * O Playwright não é dependência do projecto (vive no ambiente de QA), por
 * isso é carregado por especificador dinâmico e tipado de forma mínima.
 */
type Page = {
  goto: (url: string, opts?: Record<string, unknown>) => Promise<unknown>;
  waitForSelector: (sel: string, opts?: Record<string, unknown>) => Promise<unknown>;
  locator: (sel: string) => { count: () => Promise<number> };
  url: () => string;
};
type Browser = {
  newContext: (opts?: Record<string, unknown>) => Promise<{
    newPage: () => Promise<Page>;
    close: () => Promise<void>;
  }>;
  close: () => Promise<void>;
};

const BASE = process.env.EV2_TEST_BASE_URL ?? "http://localhost:8080";
const HANDLE = process.env.EV2_TEST_HANDLE ?? "karmel.pt";
const PROD_URL = `${BASE}/analyze/${HANDLE}`;
const EV2_URL = `${PROD_URL}?report_design=editorial_v2`;

const EV2_ROOT = '[data-report-design="editorial_v2"]';
/** Marcadores de secções migradas distintas (visíveis em sessão anónima). */
const MIGRATED_MARKERS = ["#visao-geral", "#engagement", "#frequencia", "#formatos"];

let browser: Browser | null = null;
let available = false;

async function serverIsUp(): Promise<boolean> {
  try {
    const res = await fetch(BASE, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

beforeAll(async () => {
  if (!(await serverIsUp())) return;
  try {
    const specifier = "playwright";
    const { chromium } = (await import(/* @vite-ignore */ specifier)) as {
      chromium: { launch: (o: Record<string, unknown>) => Promise<Browser> };
    };
    browser = await chromium.launch({ headless: true });
    available = true;
  } catch {
    available = false;
  }
}, 60_000);

afterAll(async () => {
  await browser?.close();
});

async function open(url: string): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser!.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  // O relatório carrega no cliente; espera pelo conteúdo, não por um timer fixo.
  await page
    .waitForSelector(`${EV2_ROOT}, #engagement`, { timeout: 45_000 })
    .catch(() => undefined);
  return { page, close: () => context.close() };
}

describe.skipIf(!available)("interruptor de desenho do relatório na rota real", () => {
  it("o URL por defeito monta o shell de produção", async () => {
    const { page, close } = await open(PROD_URL);
    expect(await page.locator(EV2_ROOT).count()).toBe(0);
    expect(await page.locator("#engagement").count()).toBeGreaterThan(0);
    await close();
  }, 90_000);

  it("`?report_design=editorial_v2` monta o EditorialV2Shell", async () => {
    const { page, close } = await open(EV2_URL);
    expect(await page.locator(EV2_ROOT).count()).toBe(1);
    await close();
  }, 90_000);

  it("o DOM Editorial V2 contém marcadores de pelo menos três secções migradas", async () => {
    const { page, close } = await open(EV2_URL);
    const present: string[] = [];
    for (const sel of MIGRATED_MARKERS) {
      if ((await page.locator(sel).count()) > 0) present.push(sel);
    }
    expect(present.length).toBeGreaterThanOrEqual(3);
    await close();
  }, 90_000);

  it("nenhum redireccionamento remove o parâmetro durante o carregamento", async () => {
    const { page, close } = await open(EV2_URL);
    expect(new URL(page.url()).searchParams.get("report_design")).toBe("editorial_v2");
    await close();
  }, 90_000);

  it("remover o parâmetro devolve o desenho antigo", async () => {
    const { page, close } = await open(EV2_URL);
    expect(await page.locator(EV2_ROOT).count()).toBe(1);
    await page.goto(PROD_URL, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#engagement", { timeout: 45_000 }).catch(() => undefined);
    expect(await page.locator(EV2_ROOT).count()).toBe(0);
    await close();
  }, 120_000);
});
