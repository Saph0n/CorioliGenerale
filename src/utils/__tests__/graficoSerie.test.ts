import { describe, expect, it } from "vitest";
import type { PuntoStorico } from "../confrontoMisure";
import {
  VISITA_IN_CORSO,
  proietta,
  serieConCorrente,
} from "../graficoSerie";

const punto = (data: string, valore: number): PuntoStorico => ({
  data,
  valore,
  visitaId: `v-${data}`,
});

describe("serie con il valore in digitazione", () => {
  const storico = [
    punto("2023-01-05", 132),
    punto("2024-05-10", 108),
    punto("2025-04-01", 84),
  ];

  it("aggiunge il valore corrente in coda, marcato come in corso", () => {
    const s = serieConCorrente(storico, 72, "2026-02-20");
    expect(s).toHaveLength(4);
    expect(s[3].valore).toBe(72);
    expect(s[3].visitaId).toBe(VISITA_IN_CORSO);
  });

  it("data il valore corrente con la data della visita, non con una fittizia", () => {
    // Una data fittizia lontana schiaccerebbe tutto lo storico contro il bordo,
    // perche' l'asse orizzontale e' in scala temporale reale.
    const s = serieConCorrente(storico, 72, "2026-02-20");
    expect(s[3].data).toBe("2026-02-20");
  });

  it("riordina quando la visita è retrodatata rispetto all'ultimo esame", () => {
    const s = serieConCorrente(storico, 95, "2024-09-01");
    expect(s.map((p) => p.data)).toEqual([
      "2023-01-05",
      "2024-05-10",
      "2024-09-01",
      "2025-04-01",
    ]);
  });

  it("lascia la serie intatta se non c'è un valore in digitazione", () => {
    expect(serieConCorrente(storico, undefined, "2026-02-20")).toBe(storico);
    expect(serieConCorrente(storico, Number.NaN, "2026-02-20")).toBe(storico);
  });
});

describe("proiezione sul disegno", () => {
  it("distribuisce le ascisse in proporzione al tempo trascorso", () => {
    // Due anni fra il primo e il secondo punto, uno fra il secondo e il terzo:
    // il secondo punto deve cadere ai due terzi, non a meta'.
    const serie = [
      punto("2020-01-01", 10),
      punto("2022-01-01", 20),
      punto("2023-01-01", 30),
    ];
    const { punti } = proietta(serie, 100, 50, 0);
    expect(punti[0].x).toBeCloseTo(0, 1);
    expect(punti[1].x).toBeCloseTo(66.6, 0);
    expect(punti[2].x).toBeCloseTo(100, 1);
  });

  it("mette il valore più alto in cima e il più basso in fondo", () => {
    const serie = [punto("2024-01-01", 50), punto("2025-01-01", 150)];
    const { punti, min, max } = proietta(serie, 100, 60, 10);
    expect(min).toBe(50);
    expect(max).toBe(150);
    // L'asse y dello schermo cresce verso il basso.
    expect(punti[1].y).toBeLessThan(punti[0].y);
  });

  it("mette la linea a metà altezza quando il valore non cambia mai", () => {
    const serie = [punto("2024-01-01", 90), punto("2025-01-01", 90)];
    const { punti } = proietta(serie, 100, 60, 10);
    expect(punti[0].y).toBeCloseTo(30, 5);
    expect(punti[1].y).toBeCloseTo(30, 5);
  });

  it("distribuisce a passi uguali le rilevazioni con la stessa data", () => {
    const serie = [punto("2024-01-01", 10), punto("2024-01-01", 20)];
    const { punti } = proietta(serie, 100, 50, 0);
    expect(punti[0].x).toBeCloseTo(0, 5);
    expect(punti[1].x).toBeCloseTo(100, 5);
  });

  it("resta dentro il riquadro anche con i margini", () => {
    const serie = [
      punto("2023-01-01", 5),
      punto("2024-01-01", 80),
      punto("2025-01-01", 40),
    ];
    const { punti } = proietta(serie, 280, 120, 14);
    for (const p of punti) {
      expect(p.x).toBeGreaterThanOrEqual(14);
      expect(p.x).toBeLessThanOrEqual(266);
      expect(p.y).toBeGreaterThanOrEqual(14);
      expect(p.y).toBeLessThanOrEqual(106);
    }
  });
});
