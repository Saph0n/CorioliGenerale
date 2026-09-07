import { describe, expect, it } from "vitest";
import {
  CATEGORIE_RISCHIO_CV,
  TARGET_APOB,
  TARGET_LDL,
  confrontaConTarget,
  descriviTargetLdl,
  targetApoB,
  targetLdl,
} from "../rischioCv";

describe("tabella degli obiettivi LDL", () => {
  it("riporta le soglie delle linee guida per ogni classe", () => {
    expect(TARGET_LDL.basso.mgdl).toBe(116);
    expect(TARGET_LDL.moderato.mgdl).toBe(100);
    expect(TARGET_LDL.alto.mgdl).toBe(70);
    expect(TARGET_LDL["molto-alto"].mgdl).toBe(55);
    expect(TARGET_LDL["molto-alto-ricorrente"].mgdl).toBe(40);
  });

  it("le soglie scendono al crescere del rischio", () => {
    const valori = CATEGORIE_RISCHIO_CV.map((c) => TARGET_LDL[c].mgdl);
    const ordinate = [...valori].sort((a, b) => b - a);
    expect(valori).toEqual(ordinate);
  });

  it("marca come opzionale solo l'obiettivo dell'evento ricorrente", () => {
    expect(TARGET_LDL["molto-alto-ricorrente"].opzionale).toBe(true);
    expect(TARGET_LDL["molto-alto"].opzionale).toBeUndefined();
  });

  it("descrive l'obiettivo con entrambe le unità", () => {
    const testo = descriviTargetLdl("alto");
    expect(testo).toContain("70 mg/dL");
    expect(testo).toContain("1,8 mmol/L");
  });

  it("segnala nella descrizione che l'ultimo obiettivo è un'opzione", () => {
    expect(descriviTargetLdl("molto-alto-ricorrente")).toContain("opzione");
  });
});

describe("tabella degli obiettivi ApoB", () => {
  it("riporta le soglie per le classi che ne hanno una", () => {
    expect(TARGET_APOB.moderato?.mgdl).toBe(100);
    expect(TARGET_APOB.alto?.mgdl).toBe(80);
    expect(TARGET_APOB["molto-alto"]?.mgdl).toBe(65);
    expect(TARGET_APOB["molto-alto-ricorrente"]?.mgdl).toBe(55);
  });

  it("non inventa un obiettivo per il rischio basso, che le linee guida non danno", () => {
    expect(TARGET_APOB.basso).toBeUndefined();
    expect(targetApoB("basso")).toBeNull();
  });
});

describe("confronto con l'obiettivo", () => {
  it("dice di quanto il valore supera la soglia", () => {
    const esito = confrontaConTarget(112, "alto", TARGET_LDL);
    expect(esito).not.toBeNull();
    expect(esito?.aTarget).toBe(false);
    expect(esito?.scostamento).toBe(42);
    expect(esito?.testo).toContain("42");
    expect(esito?.testo).toContain("70");
  });

  it("riconosce il valore a obiettivo", () => {
    const esito = confrontaConTarget(65, "alto", TARGET_LDL);
    expect(esito?.aTarget).toBe(true);
    expect(esito?.testo).toContain("A obiettivo");
  });

  it("considera a obiettivo il valore esattamente sulla soglia", () => {
    expect(confrontaConTarget(70, "alto", TARGET_LDL)?.aTarget).toBe(true);
  });

  it("non confronta senza classe di rischio dichiarata", () => {
    expect(confrontaConTarget(112, undefined, TARGET_LDL)).toBeNull();
  });

  it("non confronta senza valore misurato", () => {
    expect(confrontaConTarget(undefined, "alto", TARGET_LDL)).toBeNull();
    expect(confrontaConTarget(0, "alto", TARGET_LDL)).toBeNull();
  });

  it("non confronta l'ApoB nel rischio basso, dove manca l'obiettivo", () => {
    expect(confrontaConTarget(95, "basso", TARGET_APOB)).toBeNull();
  });

  it("riporta il carattere opzionale dell'obiettivo più stringente", () => {
    const esito = confrontaConTarget(50, "molto-alto-ricorrente", TARGET_LDL);
    expect(esito?.opzionale).toBe(true);
  });
});

describe("lettura diretta della tabella", () => {
  it("restituisce l'obiettivo della classe indicata", () => {
    expect(targetLdl("moderato")?.mgdl).toBe(100);
  });

  it("non restituisce nulla senza classe", () => {
    expect(targetLdl(undefined)).toBeNull();
    expect(targetApoB(undefined)).toBeNull();
  });
});
