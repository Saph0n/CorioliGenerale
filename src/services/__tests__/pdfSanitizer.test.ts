import { describe, expect, it } from "vitest";
import { san } from "../PdfService";

/**
 * Il font standard di jsPDF non disegna le vocali accentate: `san` le converte
 * in apostrofo prima della stampa. La mappa si e' gia' rotta una volta senza
 * che niente lo segnalasse, perche' l'errore si vede solo aprendo un PDF.
 */
describe("sanitizer del PDF", () => {
  it("converte le minuscole accentate", () => {
    expect(san("attività")).toBe("attivita'");
    expect(san("perché")).toBe("perche'");
    expect(san("è")).toBe("e'");
    expect(san("così")).toBe("cosi'");
    expect(san("può")).toBe("puo'");
    expect(san("più")).toBe("piu'");
  });

  it("converte le maiuscole accentate", () => {
    expect(san("ATTIVITÀ")).toBe("ATTIVITA'");
    expect(san("È")).toBe("E'");
    expect(san("Ì")).toBe("I'");
    expect(san("Ò")).toBe("O'");
    expect(san("Ù")).toBe("U'");
  });

  it("non lascia passare nessuna vocale accentata", () => {
    const testo = "àèéìòù ÀÈÉÌÒÙ";
    expect(san(testo)).not.toMatch(/[àèéìòùÀÈÉÌÒÙ]/);
  });

  it("lascia intatto il resto del testo", () => {
    expect(san("Ritmo sinusale, FC 72 bpm")).toBe("Ritmo sinusale, FC 72 bpm");
    expect(san("E/e' > 14")).toBe("E/e' > 14");
    expect(san("")).toBe("");
  });

  it("converte un referto intero", () => {
    expect(san("Attività fisica regolare, non più di così")).toBe(
      "Attivita' fisica regolare, non piu' di cosi'",
    );
  });
});
