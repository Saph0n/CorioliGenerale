import { describe, expect, it } from "vitest";
import { applicaBozze, numeroDaBozza } from "../bozzeMisure";

describe("numero digitato in un campo di misura", () => {
  it("legge la virgola decimale", () => {
    expect(numeroDaBozza("0,9")).toBe(0.9);
    expect(numeroDaBozza(" 5 ")).toBe(5);
    expect(numeroDaBozza("1,")).toBe(1);
  });

  it("un campo vuoto o illeggibile non vale zero", () => {
    expect(numeroDaBozza("")).toBeUndefined();
    expect(numeroDaBozza(",")).toBeUndefined();
    expect(numeroDaBozza("abc")).toBeUndefined();
  });
});

describe("bozze riportate nella visita al salvataggio", () => {
  const PERCORSI: Record<string, string> = {
    "eco.mitmed": "ecocardiogramma.gradienteMitralicoMedio",
    "eco.ava": "ecocardiogramma.areaValvolareAortica",
  };
  const percorso = (chiave: string) => PERCORSI[chiave];

  it("salva l'ultimo valore digitato senza uscire dal campo", () => {
    // Il caso trovato alla prova: 5 scritto nel gradiente mitralico e subito
    // "Salva Visita", con l'AVA gia' confermata. Il 5 andava perso.
    const visita = { ecocardiogramma: { areaValvolareAortica: 0.9 } };
    const fuori = applicaBozze(visita, { "eco.mitmed": "5" }, percorso);
    expect(fuori.ecocardiogramma).toEqual({
      areaValvolareAortica: 0.9,
      gradienteMitralicoMedio: 5,
    });
  });

  it("un campo svuotato si salva vuoto", () => {
    const visita = { ecocardiogramma: { areaValvolareAortica: 0.9 } };
    const fuori = applicaBozze(visita, { "eco.ava": "" }, percorso);
    expect(fuori.ecocardiogramma.areaValvolareAortica).toBeUndefined();
  });

  it("ignora le bozze chiuse e le chiavi senza percorso", () => {
    const visita = { ecocardiogramma: { areaValvolareAortica: 0.9 } };
    const fuori = applicaBozze(visita, { "eco.ava": null, "x.y": "3" }, percorso);
    expect(fuori).toEqual(visita);
  });

  it("non modifica la visita di partenza", () => {
    const visita = { ecocardiogramma: { areaValvolareAortica: 0.9 } };
    applicaBozze(visita, { "eco.mitmed": "5" }, percorso);
    expect(visita.ecocardiogramma).toEqual({ areaValvolareAortica: 0.9 });
  });
});
