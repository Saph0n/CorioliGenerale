import { describe, expect, it } from "vitest";
import { correggiAccenti } from "../accenti";

// Le forme di partenza sono composte a runtime da "a" + apostrofo: scritte per
// esteso, un passaggio automatico sugli accenti le "correggerebbe" nel file e
// il test finirebbe a confrontare accentato con accentato, cioe' a non provare
// piu' niente. E' gia' successo una volta.
const AP = "'";
const ita = (radice: string) => `${radice}it${"a"}${AP}`;

describe("apostrofo al posto dell'accento", () => {
  it("corregge le parole in -ita", () => {
    expect(correggiAccenti(`${ita("Attiv")} fisica`)).toBe("Attività fisica");
    expect(correggiAccenti(`buona ${ita("qual")} tecnica`)).toBe("buona qualità tecnica");
    expect(correggiAccenti(`normale ${ita("collassabil")}`)).toBe("normale collassabilità");
  });

  it("corregge i futuri in -ra", () => {
    // "rivalutera" non sta in nessun elenco: serve la regola generale.
    expect(correggiAccenti(`si rivaluter${"a"}${AP} a distanza`)).toBe(
      "si rivaluterà a distanza",
    );
    expect(correggiAccenti(`sar${"a"}${AP} necessario`)).toBe("sarà necessario");
    expect(correggiAccenti(`verr${"a"}${AP} richiamato`)).toBe("verrà richiamato");
  });

  it("corregge le parole brevi", () => {
    expect(correggiAccenti(`il paziente ${"e"}${AP} stabile`)).toBe("il paziente è stabile");
    expect(correggiAccenti(`non pi${"u"}${AP} di una volta`)).toBe("non più di una volta");
    expect(correggiAccenti(`non soffi n${"e"}${AP} sfregamenti`)).toBe(
      "non soffi né sfregamenti",
    );
    expect(correggiAccenti(`pu${"o"}${AP} non bastare`)).toBe("può non bastare");
    expect(correggiAccenti(`per l'et${"a"}${AP} del paziente`)).toBe(
      "per l'età del paziente",
    );
  });

  it("mantiene la maiuscola", () => {
    expect(correggiAccenti(`Pi${"u"}${AP} volte`)).toBe("Più volte");
    expect(correggiAccenti(`${ita("Attiv")} fisica`)).toBe("Attività fisica");
    expect(correggiAccenti(`ATTIVIT${"A"}${AP} FISICA`)).toBe("ATTIVITÀ FISICA");
    expect(correggiAccenti(`${"E"}${AP} indicato`)).toBe("È indicato");
  });

  it("non tocca i troncamenti, dove l'apostrofo e' corretto", () => {
    // "po'" sta per "poco": accentarlo sarebbe un errore, non una correzione.
    expect(correggiAccenti("un po' di edema")).toBe("un po' di edema");
    expect(correggiAccenti("Un po' meglio")).toBe("Un po' meglio");
  });

  it("non tocca l'elisione", () => {
    expect(correggiAccenti("l'ambito e dell'aorta")).toBe("l'ambito e dell'aorta");
    expect(correggiAccenti("un'ora dopo")).toBe("un'ora dopo");
  });

  it("non tocca la notazione ecocardiografica E/e'", () => {
    // Li' l'apostrofo e' il "prime" della velocita' tissutale, non un accento,
    // e il testo va lasciato intatto anche se contiene altro da correggere.
    expect(correggiAccenti("Rapporto E/e' > 14")).toBe("Rapporto E/e' > 14");
    const misto = `E/e' elevato, ${ita("attiv")} ridotta`;
    expect(correggiAccenti(misto)).toBe(misto);
  });

  it("e' idempotente", () => {
    const una = correggiAccenti(`${ita("Attiv")} fisica, pi${"u"}${AP} volte`);
    expect(una).toBe("Attività fisica, più volte");
    expect(correggiAccenti(una)).toBe(una);
  });

  it("lascia stare i testi senza apostrofi", () => {
    expect(correggiAccenti("Nessun apostrofo qui")).toBe("Nessun apostrofo qui");
    expect(correggiAccenti("")).toBe("");
  });
});
