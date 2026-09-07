import { describe, expect, it } from "vitest";
import {
  FLAG_INTERPRETATIVO_CAC,
  MESA_PERCENTILI_VALIDATI,
  SEGMENTI_SCCT,
  categoriaCac,
  coerenzaComponenti,
  descriviVariazione,
  percentileMesa,
  progressioneCac,
  segmentoScct,
} from "../tcCoronarica";

describe("categoria del calcium score", () => {
  it("usa le quattro fasce di refertazione", () => {
    expect(categoriaCac(0)?.categoria).toBe("assente");
    expect(categoriaCac(50)?.categoria).toBe("lieve");
    expect(categoriaCac(150)?.categoria).toBe("moderata");
    expect(categoriaCac(500)?.categoria).toBe("severa");
  });

  it("non arrotonda: 99 e 101 cadono in fasce diverse", () => {
    // Limare l'Agatston sarebbe cambiare il referto del radiologo.
    expect(categoriaCac(99)?.categoria).toBe("lieve");
    expect(categoriaCac(100)?.categoria).toBe("moderata");
  });

  it("la soglia severa è configurabile e la categoria dice quale ha usato", () => {
    // Un Agatston di 350 e' severo dove la soglia e' 300, moderato dove e' 400:
    // senza dirlo, due referti identici si leggerebbero diversi.
    expect(categoriaCac(350, 300)?.categoria).toBe("severa");
    expect(categoriaCac(350, 400)?.categoria).toBe("moderata");
    expect(categoriaCac(350, 400)?.intervallo).toContain("400");
    expect(categoriaCac(400, 400)?.categoria).toBe("severa");
  });

  it("porta sempre con sé il flag interpretativo", () => {
    for (const s of [0, 50, 150, 900]) {
      expect(categoriaCac(s)?.flag).toBe(FLAG_INTERPRETATIVO_CAC);
    }
    expect(FLAG_INTERPRETATIVO_CAC).toContain("non equivale automaticamente");
  });

  it("rifiuta i valori non plausibili", () => {
    expect(categoriaCac(undefined)).toBeNull();
    expect(categoriaCac(-1)).toBeNull();
    expect(categoriaCac(Number.NaN)).toBeNull();
  });
});

describe("percentile MESA", () => {
  it("non risponde finche' le tabelle non sono state inserite", () => {
    // Stesso schema del gate di SCORE2: meglio nessun percentile che uno stimato.
    expect(MESA_PERCENTILI_VALIDATI).toBe(false);
    const esito = percentileMesa({ score: 300, eta: 60, sesso: "M" });
    expect(esito.ok).toBe(false);
    if (!esito.ok) expect(esito.reason).toContain("tabelle di riferimento");
  });
});

describe("segmenti SCCT", () => {
  it("sono diciotto e numerati senza buchi", () => {
    expect(SEGMENTI_SCCT).toHaveLength(18);
    expect(SEGMENTI_SCCT.map((s) => s.numero)).toEqual(
      Array.from({ length: 18 }, (_, i) => i + 1),
    );
  });

  it("il tronco comune è il segmento 5", () => {
    expect(segmentoScct(5)?.nome).toBe("Tronco comune");
    expect(segmentoScct(99)).toBeNull();
  });
});

describe("componenti della placca", () => {
  it("segnala una somma superiore al 100%", () => {
    expect(coerenzaComponenti(70, 50)).toContain("non possono superare");
  });

  it("segnala una somma incompleta", () => {
    expect(coerenzaComponenti(40, 30)).toContain("manca");
  });

  it("tace quando le due quote tornano", () => {
    expect(coerenzaComponenti(60, 40)).toBeNull();
    expect(coerenzaComponenti(100, 0)).toBeNull();
  });

  it("non pretende la somma se ne conosce una sola", () => {
    expect(coerenzaComponenti(60, undefined)).toBeNull();
    expect(coerenzaComponenti(undefined, undefined)).toBeNull();
  });

  it("rifiuta percentuali fuori scala", () => {
    expect(coerenzaComponenti(120, 0)).toContain("fra 0 e 100");
  });
});

describe("progressione del calcium score", () => {
  const esami = [
    { score: 100, data: "2022-03-01" },
    { score: 160, data: "2024-03-01" },
    { score: 200, data: "2026-03-01" },
  ];

  it("confronta solo esami consecutivi realmente eseguiti", () => {
    const p = progressioneCac(esami);
    // Tre esami danno due variazioni, non punti intermedi inventati.
    expect(p).toHaveLength(2);
    expect(p[0].delta).toBe(60);
    expect(p[1].delta).toBe(40);
  });

  it("calcola la variazione assoluta e quella percentuale", () => {
    const p = progressioneCac(esami);
    expect(p[0].deltaPercentuale).toBeCloseTo(60);
    expect(p[1].deltaPercentuale).toBeCloseTo(25);
    expect(p[0].mesi).toBe(24);
  });

  it("non inventa una percentuale quando si parte da zero", () => {
    // Da 0 a 40 non e' un aumento del 100% ne' infinito: non e' definito.
    const p = progressioneCac([
      { score: 0, data: "2024-01-01" },
      { score: 40, data: "2026-01-01" },
    ]);
    expect(p[0].delta).toBe(40);
    expect(p[0].deltaPercentuale).toBeNull();
    expect(descriviVariazione(p[0])).toContain("non è definita");
  });

  it("ordina per data anche se gli esami arrivano disordinati", () => {
    const p = progressioneCac([
      { score: 200, data: "2026-03-01" },
      { score: 100, data: "2022-03-01" },
    ]);
    expect(p[0].da.score).toBe(100);
    expect(p[0].a.score).toBe(200);
  });

  it("un solo esame non produce variazioni", () => {
    expect(progressioneCac([{ score: 100, data: "2024-01-01" }])).toHaveLength(0);
    expect(progressioneCac([])).toHaveLength(0);
  });

  it("registra anche una regressione", () => {
    const p = progressioneCac([
      { score: 200, data: "2024-01-01" },
      { score: 150, data: "2026-01-01" },
    ]);
    expect(p[0].delta).toBe(-50);
    expect(descriviVariazione(p[0])).toContain("−50");
  });
});
