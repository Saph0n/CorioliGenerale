import { describe, expect, it } from "vitest";
import type { AppartenenzaGruppo } from "../../types/Storage";
import {
  GRUPPO_QUALSIASI,
  MAX_GRUPPI_PER_PAZIENTE,
  MAX_GRUPPO_LEN,
  aggiungiGruppo,
  elencoGruppi,
  filtraPerGruppo,
  formattaDurata,
  giorniDa,
  gruppiDelPaziente,
  impostaDataArruolamento,
  nomiGruppiDelPaziente,
  normalizeGruppi,
  normalizeRegistro,
  pazienteInGruppo,
  rimuoviGruppo,
  rinominaInElenco,
  sanitizeGruppo,
  statoGruppi,
  stessoGruppo,
  validaNomeGruppo,
} from "../gruppiRicerca";

const paz = (gruppiRicerca?: AppartenenzaGruppo[]) => ({ gruppiRicerca });
const g = (nome: string, dal?: string): AppartenenzaGruppo =>
  dal ? { nome, dal } : { nome };

describe("sanitizeGruppo", () => {
  it("toglie a capo e spazi doppi", () => {
    expect(sanitizeGruppo("  Progetto\n  SCORE2  ")).toBe("Progetto SCORE2");
  });

  it("taglia alla lunghezza massima", () => {
    expect(sanitizeGruppo("x".repeat(80))).toHaveLength(MAX_GRUPPO_LEN);
  });

  it("gestisce valori vuoti", () => {
    expect(sanitizeGruppo("")).toBe("");
    expect(sanitizeGruppo("   ")).toBe("");
  });
});

describe("confronto fra nomi", () => {
  it("ignora le maiuscole", () => {
    expect(stessoGruppo("Progetto X", "progetto x")).toBe(true);
  });

  it("distingue gruppi diversi", () => {
    expect(stessoGruppo("Progetto X", "Progetto Y")).toBe(false);
  });
});

describe("normalizeGruppi", () => {
  it("scarta vuoti e duplicati mantenendo la prima grafia", () => {
    expect(
      normalizeGruppi([g("Progetto X"), g(""), g("progetto x"), g("Altro")]),
    ).toEqual([g("Progetto X"), g("Altro")]);
  });

  it("accetta il vecchio formato a sole stringhe", () => {
    // Le prime build salvavano solo i nomi: vanno letti senza perdere il gruppo.
    expect(normalizeGruppi(["Progetto X", "Altro"])).toEqual([
      g("Progetto X"),
      g("Altro"),
    ]);
  });

  it("conserva la data di arruolamento", () => {
    expect(normalizeGruppi([g("A", "2026-01-15")])).toEqual([
      { nome: "A", dal: "2026-01-15" },
    ]);
  });

  it("scarta le date non valide", () => {
    expect(normalizeGruppi([{ nome: "A", dal: "15/01/2026" }])).toEqual([g("A")]);
    expect(normalizeGruppi([{ nome: "A", dal: "2026-13-45" }])).toEqual([g("A")]);
  });

  it("fra due date duplicate tiene la più vecchia", () => {
    expect(
      normalizeGruppi([g("A", "2026-05-01"), g("a", "2026-01-01")]),
    ).toEqual([{ nome: "A", dal: "2026-01-01" }]);
  });

  it("ignora valori non validi", () => {
    expect(normalizeGruppi([g("Ok"), 3, null, undefined, {}])).toEqual([g("Ok")]);
    expect(normalizeGruppi(undefined)).toEqual([]);
    expect(normalizeGruppi("Progetto")).toEqual([]);
  });

  it("applica il tetto per paziente", () => {
    const molti = Array.from({ length: 20 }, (_, i) => g(`G${i}`));
    expect(normalizeGruppi(molti)).toHaveLength(MAX_GRUPPI_PER_PAZIENTE);
  });
});

describe("normalizeRegistro", () => {
  it("tiene solo i nomi, senza duplicati", () => {
    expect(normalizeRegistro(["Alfa", "alfa", "", "Beta"])).toEqual(["Alfa", "Beta"]);
  });

  it("accetta anche oggetti, prendendone il nome", () => {
    expect(normalizeRegistro([{ nome: "Alfa" }, "Beta"])).toEqual(["Alfa", "Beta"]);
  });

  it("non esplode su input non validi", () => {
    expect(normalizeRegistro(undefined)).toEqual([]);
  });
});

describe("assegnazione ai pazienti", () => {
  it("aggiunge un gruppo con la data di arruolamento", () => {
    expect(aggiungiGruppo([g("A")], "B", "2026-09-01")).toEqual([
      g("A"),
      { nome: "B", dal: "2026-09-01" },
    ]);
  });

  it("non duplica un gruppo già presente", () => {
    expect(aggiungiGruppo([g("Progetto X")], "progetto x", "2026-09-01")).toEqual([
      g("Progetto X"),
    ]);
  });

  it("ignora un nome vuoto", () => {
    expect(aggiungiGruppo([g("A")], "   ", "2026-09-01")).toEqual([g("A")]);
  });

  it("accetta anche una data non valida, senza registrarla", () => {
    expect(aggiungiGruppo([], "A", "non-una-data")).toEqual([g("A")]);
  });

  it("non supera il tetto per paziente", () => {
    const pieni = Array.from({ length: MAX_GRUPPI_PER_PAZIENTE }, (_, i) => g(`G${i}`));
    expect(aggiungiGruppo(pieni, "Extra", "2026-09-01")).toHaveLength(
      MAX_GRUPPI_PER_PAZIENTE,
    );
  });

  it("rimuove ignorando le maiuscole", () => {
    expect(rimuoviGruppo([g("Progetto X"), g("Altro")], "PROGETTO X")).toEqual([
      g("Altro"),
    ]);
  });

  it("corregge la data di arruolamento", () => {
    expect(
      impostaDataArruolamento([g("A", "2026-01-01")], "a", "2026-03-15"),
    ).toEqual([{ nome: "A", dal: "2026-03-15" }]);
  });

  it("svuotando la data la toglie", () => {
    expect(impostaDataArruolamento([g("A", "2026-01-01")], "A", "")).toEqual([
      g("A"),
    ]);
  });

  it("riconosce l'appartenenza", () => {
    expect(pazienteInGruppo(paz([g("Progetto X")]), "progetto x")).toBe(true);
    expect(pazienteInGruppo(paz([g("Progetto X")]), "Altro")).toBe(false);
    expect(pazienteInGruppo(paz(), "Progetto X")).toBe(false);
  });

  it("espone i soli nomi quando servono", () => {
    expect(nomiGruppiDelPaziente(paz([g("A", "2026-01-01"), g("B")]))).toEqual([
      "A",
      "B",
    ]);
  });

  it("legge i gruppi del paziente normalizzati", () => {
    expect(gruppiDelPaziente(paz([g("  A  "), g("a"), g("B")]))).toEqual([
      g("A"),
      g("B"),
    ]);
  });
});

describe("elenco dei gruppi", () => {
  it("unisce registro e gruppi in uso, ordinati", () => {
    const elenco = elencoGruppi(
      ["Zeta", "Alfa"],
      [paz([g("Beta")]), paz([g("alfa")]), paz()],
    );
    expect(elenco).toEqual(["Alfa", "Beta", "Zeta"]);
  });

  it("recupera i gruppi dai pazienti se il registro è vuoto", () => {
    // Le preferenze non finiscono nei backup: dopo un ripristino i gruppi
    // devono ricomparire dai dati dei pazienti.
    expect(elencoGruppi([], [paz([g("Progetto X")])])).toEqual(["Progetto X"]);
  });
});

describe("rinomina", () => {
  it("sostituisce il vecchio nome conservando la data", () => {
    expect(
      rinominaInElenco(
        [g("Progetto X", "2026-01-01"), g("Altro")],
        "progetto x",
        "Progetto Y",
      ),
    ).toEqual([{ nome: "Progetto Y", dal: "2026-01-01" }, g("Altro")]);
  });

  it("non crea doppioni se il nuovo nome esiste già", () => {
    expect(rinominaInElenco([g("A"), g("B")], "A", "b")).toHaveLength(1);
  });

  it("lascia l'elenco invariato con un nome nuovo vuoto", () => {
    expect(rinominaInElenco([g("A")], "A", "  ")).toEqual([g("A")]);
  });
});

describe("validazione del nome", () => {
  it("rifiuta il nome vuoto", () => {
    expect(validaNomeGruppo("  ", [])).toContain("vuoto");
  });

  it("rifiuta un duplicato", () => {
    expect(validaNomeGruppo("Progetto X", ["progetto x"])).toContain("Esiste già");
  });

  it("accetta un nome nuovo", () => {
    expect(validaNomeGruppo("Progetto Y", ["Progetto X"])).toBeNull();
  });

  it("in rinomina accetta di riscrivere lo stesso nome", () => {
    expect(validaNomeGruppo("Progetto X", ["Progetto X"], "Progetto X")).toBeNull();
  });
});

describe("durata dei progetti", () => {
  const oggi = new Date("2026-09-01T12:00:00");

  it("conta i giorni trascorsi", () => {
    expect(giorniDa("2026-08-25", oggi)).toBe(7);
    expect(giorniDa("2026-09-01", oggi)).toBe(0);
  });

  it("non restituisce giorni negativi per date future", () => {
    expect(giorniDa("2026-12-01", oggi)).toBe(0);
  });

  it("ignora le date non valide", () => {
    expect(giorniDa("01/09/2026", oggi)).toBeUndefined();
  });

  it.each([
    [0, "oggi"],
    [1, "1 giorno"],
    [10, "10 giorni"],
    [30, "1 mese"],
    [90, "3 mesi"],
    [365, "1 anno"],
    [400, "1 anno e 1 mese"],
    [800, "2 anni e 2 mesi"],
  ])("formatta %s giorni come %s", (giorni, atteso) => {
    expect(formattaDurata(giorni as number)).toBe(atteso);
  });
});

describe("stato dei gruppi per la dashboard", () => {
  const oggi = new Date("2026-09-01T12:00:00");
  const pazienti = [
    paz([g("Progetto X", "2026-03-01"), g("Registro FA", "2026-08-01")]),
    paz([g("progetto x", "2026-01-15")]),
    paz([g("Registro FA")]),
    paz(),
  ];

  it("conta i partecipanti e ordina per numerosità", () => {
    const stati = statoGruppi(["Gruppo vuoto"], pazienti, oggi);
    expect(stati.map((s) => [s.nome, s.partecipanti])).toEqual([
      ["Progetto X", 2],
      ["Registro FA", 2],
      ["Gruppo vuoto", 0],
    ]);
  });

  it("prende come inizio l'arruolamento più vecchio", () => {
    const x = statoGruppi([], pazienti, oggi).find((s) => s.nome === "Progetto X");
    expect(x?.dataInizio).toBe("2026-01-15");
    expect(x?.ultimoArruolamento).toBe("2026-03-01");
    expect(x?.giorniAttivo).toBe(229);
  });

  it("regge i gruppi senza alcuna data registrata", () => {
    const fa = statoGruppi([], [paz([g("Solo nome")])], oggi)[0];
    expect(fa.dataInizio).toBeUndefined();
    expect(fa.giorniAttivo).toBeUndefined();
  });

  it("include i gruppi del registro senza pazienti", () => {
    const vuoto = statoGruppi(["Gruppo vuoto"], pazienti, oggi).find(
      (s) => s.nome === "Gruppo vuoto",
    );
    expect(vuoto?.partecipanti).toBe(0);
  });
});

describe("filtro per gruppo nell'elenco pazienti", () => {
  const pazienti = [
    { id: "1", gruppiRicerca: [g("Progetto X", "2026-01-01")] },
    { id: "2", gruppiRicerca: [] },
    { id: "3", gruppiRicerca: [g("Progetto X"), g("Registro FA")] },
    { id: "4" },
  ];

  it("senza filtro restituisce tutti i pazienti", () => {
    expect(filtraPerGruppo(pazienti, null).map((p) => p.id)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
  });

  it("col valore speciale restituisce chi sta in almeno un gruppo", () => {
    // Regressione: con "*" trattato come nome di gruppo la lista usciva vuota.
    expect(
      filtraPerGruppo(pazienti, GRUPPO_QUALSIASI).map((p) => p.id),
    ).toEqual(["1", "3"]);
  });

  it("filtra per un gruppo preciso, ignorando le maiuscole", () => {
    expect(filtraPerGruppo(pazienti, "progetto x").map((p) => p.id)).toEqual([
      "1",
      "3",
    ]);
  });

  it("restituisce vuoto per un gruppo senza pazienti", () => {
    expect(filtraPerGruppo(pazienti, "Gruppo vuoto")).toEqual([]);
  });
});
