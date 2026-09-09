import { describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pazienteDiProva, visitaDiProva } from "./refertoDiProva";

/**
 * Anteprima del referto: `npm run anteprima`.
 *
 * Scrive `anteprima-referto.pdf` nella cartella del progetto usando il paziente
 * e la visita di prova. Serve a guardare il foglio dopo aver toccato il layout,
 * senza dover creare un paziente finto nell'applicazione, salvargli addosso una
 * visita e stamparla: e' il giro che si evitava di fare, ed e' il motivo per
 * cui certi difetti di impaginazione sono rimasti a lungo.
 *
 * Sta fra i test e non fra gli script perche' qui c'e' gia' tutto quello che
 * serve per far girare il PDF fuori dal browser. Non fa parte della suite: si
 * accende solo con la variabile d'ambiente, cosi' `npm test` non scrive file.
 */

vi.mock("../OfflineServices", () => ({
  DoctorService: {
    getDoctor: async () => ({
      nome: "Vincenzo",
      cognome: "Trani",
      specializzazione: "Specialista in Cardiologia",
      telefono: "035 123456",
      email: "studio@example.it",
      ambulatori: [{
        isPrimario: true,
        nome: "Studio Cardiologico",
        indirizzo: "Via Garibaldi 14",
        cap: "24122",
        citta: "Bergamo",
      }],
    }),
  },
  PreferenceService: {
    getPreferences: async () => ({
      showDoctorPhoneInPdf: true,
      showDoctorEmailInPdf: true,
    }),
  },
  VisitService: { getVisitsByPatientId: async () => [] },
}));

const { PdfService } = await import("../PdfService");

describe.runIf(process.env.ANTEPRIMA)("anteprima del referto", () => {
  it("scrive anteprima-referto.pdf nella cartella del progetto", async () => {
    const blob = await PdfService.generateVisitPDF(
      pazienteDiProva, visitaDiProva, { includeImages: false },
    );
    expect(blob).toBeDefined();

    const percorso = resolve(process.cwd(), "anteprima-referto.pdf");
    const contenuto = Buffer.from(await blob!.arrayBuffer());
    writeFileSync(percorso, contenuto);
    // eslint-disable-next-line no-console
    console.log(`\nAnteprima scritta in ${percorso} (${Math.round(contenuto.length / 1024)} KB)\n`);
  });
});
