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

/**
 * Un carattere fuori dalla codifica WinAnsi fa ripiegare jsPDF su UTF-16 per
 * tutta la stringa: il testo esce illeggibile e, siccome la misura per andare
 * a capo viene calcolata su un byte per carattere, la riga sborda oltre il
 * margine destro del foglio. E' successo in ambulatorio sul calcium score.
 */
describe("simboli fuori dalla codifica del font", () => {
  it("traduce il maggiore e minore uguale", () => {
    expect(san("Agatston \u2265 300")).toBe("Agatston >= 300");
    expect(san("FE \u2264 40%")).toBe("FE <= 40%");
    expect(san("\u2260")).toBe("!=");
  });

  it("traduce i pedici del CHA2DS2-VASc", () => {
    expect(san("CHA\u2082DS\u2082-VASc")).toBe("CHA2DS2-VASc");
  });

  it("lascia stare i caratteri che il font sa scrivere", () => {
    // Stanno tutti nella fascia alta di WinAnsi: tradurli cambierebbe il testo
    // senza motivo, e il trattino lungo separa le categorie CAD-RADS.
    expect(san("CAD-RADS 2 \u2014 lieve")).toBe("CAD-RADS 2 \u2014 lieve");
    expect(san("I\u00b1")).toBe("I\u00b1");
    expect(san("100 \u00b7 severa")).toBe("100 \u00b7 severa");
    expect(san("mL/min/1,73 m\u00b2")).toBe("mL/min/1,73 m\u00b2");
  });

  it("non lascia passare nulla che il font non sappia scrivere", () => {
    // La rete di sicurezza: meglio un carattere sbagliato che una riga
    // illeggibile fuori margine.
    for (const carattere of san("soglia \u2265 300 \u2192 \u4e2d")) {
      expect(carattere.charCodeAt(0)).toBeLessThanOrEqual(0xff);
    }
  });
});
