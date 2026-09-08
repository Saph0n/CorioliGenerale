import { describe, expect, it, vi } from "vitest";
import type { Patient, Visit } from "../../types/Storage";

/**
 * Il referto e' il documento che esce dallo studio: finisce dal medico curante
 * e dai colleghi, e le sue regole di composizione arrivano dal cardiologo che
 * lo firma. Sono scelte che si perdono facilmente in un refactor del layout,
 * per questo stanno qui come test e non solo come commento nel codice.
 *
 * Il PDF viene prodotto senza compressione, quindi i testi disegnati si
 * ritrovano in chiaro nel flusso del documento.
 */

vi.mock("../OfflineServices", () => ({
  DoctorService: {
    getDoctor: async () => ({
      nome: "Vincenzo",
      cognome: "Trani",
      specializzazione: "Cardiologia",
      ambulatori: [{ isPrimario: true, nome: "Studio", indirizzo: "Via Garibaldi 14", citta: "Bergamo" }],
    }),
  },
  PreferenceService: { getPreferences: async () => ({}) },
  VisitService: { getVisitsByPatientId: async () => [] },
}));

const { PdfService } = await import("../PdfService");

const paziente: Patient = {
  id: "p1",
  nome: "Mario",
  cognome: "Prova",
  dataNascita: "1950-04-12",
  luogoNascita: "Bergamo",
  sesso: "M",
  altezza: 175,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

function visita(contenuto: Partial<NonNullable<Visit["visita"]>>): Visit {
  return {
    id: "v1",
    patientId: "p1",
    dataVisita: "2026-09-07",
    descrizioneClinica: "",
    anamnesi: "",
    esamiObiettivo: "",
    conclusioniDiagnostiche: "",
    terapie: "",
    createdAt: "2026-09-07",
    updatedAt: "2026-09-07",
    visita: {
      problemaClinico: "Cardiopalmo",
      prestazione: "",
      esameObiettivo: "Nei limiti",
      accertamenti: "",
      terapiaSpecifica: "",
      ...contenuto,
    },
  };
}

async function testoDelPdf(v: Visit): Promise<string> {
  const blob = await PdfService.generateVisitPDF(paziente, v);
  expect(blob).toBeDefined();
  return await blob!.text();
}

describe("referto di visita: esami strumentali", () => {
  it("raggruppa i moduli strumentali sotto un titolo solo", async () => {
    const testo = await testoDelPdf(
      visita({
        ecg: { ritmo: "Sinusale", referto: "Nei limiti" },
        ecocardiogramma: { fe: 60 },
      }),
    );
    expect(testo).toContain("ESAMI STRUMENTALI");
    // I moduli restano, ma come sottotitoli: il gruppo non li sostituisce.
    expect(testo).toContain("Elettrocardiogramma");
    expect(testo).toContain("Ecocardiogramma");
  });

  it("non apre il gruppo quando non c'e' nessun esame", async () => {
    const testo = await testoDelPdf(visita({}));
    expect(testo).not.toContain("ESAMI STRUMENTALI");
  });

  it("apre il gruppo anche se il primo modulo della serie e' vuoto", async () => {
    const testo = await testoDelPdf(visita({ holterEcg: { fcMedia: 68 } }));
    expect(testo).toContain("ESAMI STRUMENTALI");
    expect(testo).toContain("Holter");
  });
});

describe("referto di visita: fibrillazione atriale", () => {
  const conFa = visita({
    pesoCorporeo: 78,
    laboratorio: { creatinina: 1.1 },
    fattoriRischio: { ipertensione: true },
    fibrillazioneAtriale: {
      attivo: true,
      cvScompenso: true,
      referto: "FA permanente, frequenza ben controllata.",
    },
  });

  it("stampa il totale del punteggio", async () => {
    const testo = await testoDelPdf(conFa);
    expect(testo).toContain("FIBRILLAZIONE ATRIALE");
    expect(testo).toContain("CHA2DS2-VASC");
    // Eta' 76 (2) + ipertensione (1) + scompenso (1) = 4 su 9.
    expect(testo).toContain("4 / 9");
  });

  it("non stampa le voci che compongono il punteggio", async () => {
    const testo = await testoDelPdf(conFa);
    // Le voci sono gia' nella prosa dell'anamnesi: nel referto sono rumore
    // fra il cardiologo e il numero che gli serve.
    expect(testo).not.toContain("Scompenso cardiaco o disfunzione");
    expect(testo).not.toContain("Ipertensione arteriosa");
    expect(testo).not.toContain("Le linee guida legano a questo punteggio");
  });

  it("non stampa forma clinica e terapia anticoagulante", async () => {
    // Sono diagnosi e decisioni: le formula il cardiologo nel testo del modulo.
    const testo = await testoDelPdf(conFa);
    expect(testo).not.toContain("FORMA CLINICA");
    expect(testo).not.toContain("ANTICOAGULAZIONE");
  });

  it("porta accanto al punteggio i dati che decidono la dose del DOAC", async () => {
    const testo = await testoDelPdf(conFa);
    expect(testo).toContain("78 kg");
    expect(testo).toContain("1.1 mg/dL");
    expect(testo).toContain("76 anni");
    expect(testo).toContain("EGFR");
  });

  it("resta fuori dal referto finche' l'interruttore e' spento", async () => {
    // Il caso che il cardiologo ha segnalato: cominciare a compilare il modulo
    // non deve bastare a infilarlo nel referto.
    const testo = await testoDelPdf(
      visita({
        pesoCorporeo: 78,
        laboratorio: { creatinina: 1.1 },
        fibrillazioneAtriale: { cvScompenso: true, hbAlcol: true },
      }),
    );
    expect(testo).not.toContain("FIBRILLAZIONE ATRIALE");
  });

  it("ristampa le visite salvate prima dell'interruttore", async () => {
    // Senza il campo `attivo` vale il vecchio criterio, altrimenti ristampando
    // un referto d'archivio la sezione sparirebbe.
    const testo = await testoDelPdf(
      visita({ fibrillazioneAtriale: { tipo: "permanente", cvIctus: true } }),
    );
    expect(testo).toContain("FIBRILLAZIONE ATRIALE");
  });
});

describe("referto di visita: misure nuove e tolte", () => {
  it("non stampa piu' la riga del ritmo ECG", async () => {
    const testo = await testoDelPdf(
      visita({ ecg: { ritmo: "Sinusale", pr: 180, referto: "Nei limiti." } }),
    );
    expect(testo).toContain("Elettrocardiogramma");
    expect(testo).toContain("180 ms");
    expect(testo).not.toContain("RITMO");
  });

  it("stampa i gradienti transvalvolari aortici", async () => {
    const testo = await testoDelPdf(
      visita({
        ecocardiogramma: {
          fe: 60,
          gradienteAorticoMedio: 42,
          gradienteAorticoMassimo: 68,
        },
      }),
    );
    expect(testo).toContain("42 mmHg");
    expect(testo).toContain("68 mmHg");
  });

  it("stampa hs-PCR e LDL ossidate", async () => {
    const testo = await testoDelPdf(
      visita({ laboratorio: { hsPcr: 2.4, oxLdl: 78 } }),
    );
    expect(testo).toContain("2.4 mg/L");
    expect(testo).toContain("78 U/L");
  });

  it("chiama fibrolipidica la componente non calcifica", async () => {
    const testo = await testoDelPdf(
      visita({
        tcCoronarica: { componenteCalcifica: 70, componenteNonCalcifica: 30 },
      }),
    );
    expect(testo).toContain("fibrolipidica 30%");
    expect(testo).not.toContain("non calcifica o mista");
  });
});

describe("referto di visita: impaginazione da referto ospedaliero", () => {
  // Un referto lungo abbastanza da andare a capo pagina: serve per verificare
  // numerazione e riga di identificazione, che su una pagina sola non si
  // vedrebbero mai.
  const lungo = visita({
    esameObiettivo: "Nei limiti. ".repeat(700),
    terapiaSpecifica: "Si conferma la terapia in atto.",
    ecg: { pr: 180, referto: "ECG nei limiti." },
  });

  it("numera le pagine con il totale", async () => {
    const testo = await testoDelPdf(lungo);
    expect(testo).toContain("Pagina 1 di 2");
    expect(testo).toContain("Pagina 2 di 2");
  });

  it("ripete l'identita' del paziente dalla seconda pagina", async () => {
    // Un foglio che si stacca dalla graffetta deve restare attribuibile.
    const testo = await testoDelPdf(lungo);
    expect(testo).toContain("nato il 12/04/1950");
    expect(testo).toContain("visita del");
  });

  it("non chiude con il blocco firma", async () => {
    // Tolto su richiesta del cardiologo: il referto finisce sulle conclusioni.
    // Luogo e data in calce sono l'unica stringa che appartiene solo a quel
    // blocco — il nome del medico compare anche nell'intestazione.
    const testo = await testoDelPdf(lungo);
    expect(testo).not.toContain("Bergamo, 07/09/2026");
  });

  it("porta la firma dell'applicazione nel piede", async () => {
    const testo = await testoDelPdf(lungo);
    expect(testo).toContain("Creato con Corioli");
  });
});

describe("referto di visita: caratteri stampabili", () => {
  it("scrive la soglia del calcium score senza simboli illeggibili", async () => {
    // Il caso segnalato dal cardiologo: il punteggio oltre la soglia severa
    // usciva come "Agatston BOM e 300" e sconfinava fuori dal foglio.
    const testo = await testoDelPdf(
      visita({ tcCoronarica: { cacScore: 460 } }),
    );
    expect(testo).toContain("Agatston >= 300");
    expect(testo).not.toContain("\u2265");
  });

  it("non produce stringhe a due byte", async () => {
    // Il segnale della ricaduta su UTF-16: la stringa di testo del PDF si apre
    // con un byte nullo. E' quello che rompeva anche l'andata a capo.
    const blob = await PdfService.generateVisitPDF(
      paziente,
      visita({
        tcCoronarica: { cacScore: 460, cadRads: "4B" },
        scompenso: { nyha: "II", ntProBnp: 450 },
      }),
    );
    const grezzo = new Uint8Array(await blob!.arrayBuffer());
    for (let i = 1; i < grezzo.length; i++) {
      if (grezzo[i - 1] === 0x28 && grezzo[i] === 0x00) {
        throw new Error(`stringa UTF-16 nel PDF alla posizione ${i}`);
      }
    }
  });
});

describe("referto di visita: rischio cardiovascolare", () => {
  it("stampa la classe dichiarata e l obiettivo che ne discende", async () => {
    const testo = await testoDelPdf(
      visita({
        categoriaRischioCv: "molto-alto",
        laboratorio: { colesteroloTotale: 280, hdl: 38, trigliceridi: 260, apoB: 140 },
      }),
    );
    expect(testo).toContain("RISCHIO CARDIOVASCOLARE");
    expect(testo).toContain("Rischio molto alto");
    expect(testo).toContain("55 mg/dL");
    // La distanza dall obiettivo: e il dato per cui il curante legge la sezione.
    expect(testo).toContain("sopra l'obiettivo");
  });

  it("senza classe dichiarata non inventa un obiettivo", async () => {
    // La classe la attribuisce il medico: un obiettivo lipidico senza la classe
    // da cui deriva sarebbe un numero senza motivo.
    const testo = await testoDelPdf(
      visita({ laboratorio: { colesteroloTotale: 280, hdl: 38 } }),
    );
    expect(testo).not.toContain("OBIETTIVO LDL");
  });

  it("conserva la sintesi del medico anche senza classe", async () => {
    const testo = await testoDelPdf(
      visita({ sintesiRischio: "Prevenzione secondaria." }),
    );
    expect(testo).toContain("Prevenzione secondaria.");
  });
});
