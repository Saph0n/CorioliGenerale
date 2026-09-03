/**
 * Genera un backup Corioli con pazienti e visite di prova per collaudare i
 * calcolatori cardiologici (BMI, LDL Friedewald, non-HDL, HOMA-IR, eGFR
 * CKD-EPI, stadio KDIGO, QTc Bazett, fascia calcium score, SCORE2).
 *
 * Il file prodotto si importa da Impostazioni → Backup, in modalità **unione**:
 * i pazienti di prova si aggiungono all'archivio senza toccare quelli veri.
 * Sono tutti riconoscibili dal cognome (COLLAUDO) e dall'email @collaudo.test,
 * così si ritrovano e si cancellano a colpo d'occhio.
 *
 * I valori attesi stampati a fine esecuzione sono calcolati **qui**, da questo
 * script, non dal codice dell'app: se l'app mostra un numero diverso è un
 * risultato del confronto, non un errore di trascrizione.
 *
 *   node scripts/genera-dati-prova.mjs
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OGGI = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const ora = OGGI.toISOString();

/** Data di nascita che oggi corrisponde all'età voluta (compleanno già passato). */
function nascitaPerEta(eta) {
  return `${OGGI.getFullYear() - eta}-01-15`;
}

// ─── Calcolatori, riscritti qui per avere un valore atteso indipendente ──────

const bmi = (kg, cm) => (kg / (cm / 100) ** 2).toFixed(1);

const ldlFriedewald = (tot, hdl, tg) => {
  if (tg >= 400) return "non applicabile (TG ≥ 400)";
  const v = tot - hdl - tg / 5;
  return v <= 0 ? "valori non coerenti" : `${Math.round(v)} mg/dL`;
};

const nonHdl = (tot, hdl) => {
  const v = tot - hdl;
  return v <= 0 ? "valori non coerenti" : `${Math.round(v)} mg/dL`;
};

const homaIr = (glicemia, insulina) => ((glicemia * insulina) / 405).toFixed(2);

const egfrCkdEpi = (scr, eta, sesso) => {
  const k = sesso === "F" ? 0.7 : 0.9;
  const alpha = sesso === "F" ? -0.241 : -0.302;
  const r = scr / k;
  return (
    142 *
    Math.min(r, 1) ** alpha *
    Math.max(r, 1) ** -1.2 *
    0.9938 ** eta *
    (sesso === "F" ? 1.012 : 1)
  );
};

const kdigo = (e) =>
  e >= 90 ? "G1" : e >= 60 ? "G2" : e >= 45 ? "G3a" : e >= 30 ? "G3b" : e >= 15 ? "G4" : "G5";

const qtcBazett = (qt, fc) => qt / Math.sqrt(60 / fc);

const fasciaCac = (s) =>
  s === 0 ? "Assente (0)" : s < 100 ? "Lieve (1-99)" : s < 400 ? "Moderata (100-399)" : "Severa (≥ 400)";

// ─── Casi di prova ──────────────────────────────────────────────────────────

/**
 * Ogni caso punta a una situazione diversa dei calcolatori: valori normali,
 * limiti di validità delle formule, dati incoerenti, dati mancanti.
 */
const CASI = [
  {
    id: "collaudo-1",
    nome: "Marco",
    cognome: "Collaudo Standard",
    eta: 58,
    sesso: "M",
    altezza: 175,
    cf: "CLLMRC68A15G702A",
    scopo: "Tutti i calcolatori con valori nella norma: è il caso di riferimento.",
    visita: {
      peso: 82,
      pa: "138/86",
      fc: 72,
      fumatore: "si",
      lab: { colesteroloTotale: 215, hdl: 45, trigliceridi: 150, glicemia: 98, insulina: 12, creatinina: 1.0, hba1c: 5.6, emoglobina: 14.8 },
      ecg: { ritmo: "Sinusale", pr: 160, qrs: 92, qt: 400, asse: 30 },
      cac: 85,
      cadRads: "2",
    },
  },
  {
    id: "collaudo-2",
    nome: "Elena",
    cognome: "Collaudo Trigliceridi",
    eta: 44,
    sesso: "F",
    altezza: 162,
    cf: "CLLLNE82A15G702B",
    scopo:
      "Trigliceridi ≥ 400: Friedewald deve rifiutarsi di calcolare, il non-HDL no. Percorso femminile dell'eGFR.",
    visita: {
      peso: 58,
      pa: "118/74",
      fc: 64,
      fumatore: "no",
      lab: { colesteroloTotale: 190, hdl: 70, trigliceridi: 420, ldlMisurato: 96, glicemia: 88, insulina: 6, creatinina: 0.68, hba1c: 5.1 },
      ecg: { ritmo: "Sinusale", pr: 148, qrs: 84, qt: 380, asse: 45 },
      cac: 0,
      cadRads: "0",
    },
  },
  {
    id: "collaudo-3",
    nome: "Giovanni",
    cognome: "Collaudo Rene",
    eta: 74,
    sesso: "M",
    altezza: 170,
    cf: "CLLGNN52A15G702C",
    scopo:
      "Fuori dalla finestra SCORE2 (40-69), insufficienza renale (KDIGO G3b), bradicardia: il QTc deve segnalare che Bazett è poco affidabile.",
    visita: {
      peso: 88,
      pa: "150/88",
      fc: 46,
      fumatore: "no",
      lab: { colesteroloTotale: 240, hdl: 38, trigliceridi: 260, glicemia: 145, insulina: 22, creatinina: 2.1, hba1c: 7.2, albuminuria: 180 },
      ecg: { ritmo: "Bradicardia sinusale", pr: 190, qrs: 104, qt: 460, asse: -15 },
      cac: 780,
      cadRads: "4A",
    },
  },
  {
    id: "collaudo-4",
    nome: "Sofia",
    cognome: "Collaudo Incoerente",
    eta: 36,
    sesso: "F",
    altezza: 168,
    cf: "CLLSFO90A15G702D",
    scopo:
      "Sotto i 40 anni (SCORE2 non applicabile), lipidi incoerenti fra loro (LDL negativo) e tachicardia: tre messaggi di rifiuto diversi.",
    visita: {
      peso: 52,
      pa: "104/62",
      fc: 110,
      fumatore: "si",
      lab: { colesteroloTotale: 150, hdl: 95, trigliceridi: 300, glicemia: 78, insulina: 4, creatinina: 0.55 },
      ecg: { ritmo: "Tachicardia sinusale", pr: 130, qrs: 78, qt: 320, asse: 60 },
      cac: 250,
      cadRads: "3",
    },
  },
  {
    id: "collaudo-5",
    nome: "Anna",
    cognome: "Collaudo Incompleto",
    eta: 61,
    sesso: "F",
    altezza: 160,
    cf: "CLLNNA65A15G702E",
    scopo:
      "Visita con i soli dati di base: ogni calcolatore deve dire cosa manca invece di restare vuoto o mostrare zero.",
    visita: {
      peso: 67,
      pa: "132/80",
      fc: 78,
      fumatore: undefined,
      lab: {},
      ecg: {},
      cac: undefined,
      cadRads: undefined,
    },
  },
];

// ─── Costruzione del backup ─────────────────────────────────────────────────

const patients = [];
const visits = [];
const attesi = [];

for (const caso of CASI) {
  const { visita: v } = caso;
  patients.push({
    id: caso.id,
    codiceFiscale: caso.cf,
    nome: caso.nome,
    cognome: caso.cognome,
    dataNascita: nascitaPerEta(caso.eta),
    luogoNascita: "Pisa",
    sesso: caso.sesso,
    email: `${caso.id}@collaudo.test`,
    altezza: caso.altezza,
    peso: v.peso,
    notaBene: `DATI DI PROVA — ${caso.scopo}`,
    createdAt: ora,
    updatedAt: ora,
  });

  const haLab = Object.keys(v.lab).length > 0;
  const haEcg = Object.keys(v.ecg).length > 0;

  visits.push({
    id: `${caso.id}-visita`,
    patientId: caso.id,
    dataVisita: iso(OGGI),
    descrizioneClinica: "",
    anamnesi: "",
    esamiObiettivo: "",
    conclusioniDiagnostiche: "",
    terapie: "",
    tipo: "generale",
    visita: {
      problemaClinico: `Visita di collaudo. ${caso.scopo}`,
      prestazione: "Dati inventati a scopo di test, nessun valore clinico.",
      esameObiettivo: "",
      accertamenti: "",
      terapiaSpecifica: "",
      pesoCorporeo: v.peso,
      pressioneArteriosa: v.pa,
      frequenzaCardiaca: String(v.fc),
      ...(v.fumatore ? { fumatore: v.fumatore } : {}),
      ...(haEcg ? { ecg: v.ecg } : {}),
      ...(haLab ? { laboratorio: { dataPrelievo: iso(OGGI), ...v.lab } } : {}),
      ...(v.cac != null || v.cadRads
        ? {
            tcCoronarica: {
              dataEsame: iso(OGGI),
              struttura: "Struttura di collaudo",
              ...(v.cac != null ? { cacScore: v.cac } : {}),
              ...(v.cadRads ? { cadRads: v.cadRads } : {}),
            },
          }
        : {}),
    },
    createdAt: ora,
    updatedAt: ora,
  });

  // Valori attesi, calcolati indipendentemente dal codice dell'app.
  const l = v.lab;
  const eg = l.creatinina ? egfrCkdEpi(l.creatinina, caso.eta, caso.sesso) : null;
  attesi.push({
    paziente: `${caso.nome} ${caso.cognome} (${caso.sesso}, ${caso.eta} anni)`,
    scopo: caso.scopo,
    righe: [
      ["BMI", `${bmi(v.peso, caso.altezza)} kg/m²`],
      [
        "LDL (Friedewald)",
        l.colesteroloTotale ? ldlFriedewald(l.colesteroloTotale, l.hdl, l.trigliceridi) : "servono colesterolo totale, HDL e trigliceridi",
      ],
      [
        "Colesterolo non-HDL",
        l.colesteroloTotale ? nonHdl(l.colesteroloTotale, l.hdl) : "servono colesterolo totale e HDL",
      ],
      ["HOMA-IR", l.glicemia ? homaIr(l.glicemia, l.insulina) : "servono glicemia e insulinemia"],
      [
        "eGFR (CKD-EPI 2021)",
        eg ? `${Math.round(eg)} mL/min/1,73 m² — ${kdigo(eg)}` : "serve la creatininemia",
      ],
      [
        "QTc (Bazett)",
        v.ecg.qt
          ? `${Math.round(qtcBazett(v.ecg.qt, v.fc))} ms${v.fc < 50 || v.fc > 100 ? " + avviso: fuori da 50-100 bpm" : ""}`
          : "servono QT e frequenza cardiaca",
      ],
      ["Calcium score", v.cac != null ? fasciaCac(v.cac) : "non inserito"],
      [
        "SCORE2",
        caso.eta < 40 || caso.eta > 69
          ? "rifiutato: fuori dalla finestra 40-69 anni"
          : v.fumatore == null || !l.colesteroloTotale
            ? "rifiutato: mancano dati (fumo / colesterolo)"
            : "rifiutato: coefficienti non ancora validati (SCORE2_COEFFICIENTS_VALIDATED = false)",
      ],
    ],
  });
}

const backup = {
  schemaVersion: 1,
  appVersion: "dati-di-prova",
  exportedAt: ora,
  patients,
  visits,
  visitRevisions: [],
  richiesteEsami: [],
  certificatiPaziente: [],
  ricettePaziente: [],
  documents: [],
};

const qui = dirname(fileURLToPath(import.meta.url));
const destinazione = join(qui, "dati-prova-calcolatori.json");
writeFileSync(destinazione, JSON.stringify(backup, null, 2), "utf8");

console.log(`Scritto: ${destinazione}`);
console.log(`${patients.length} pazienti, ${visits.length} visite.\n`);
console.log("Import: Impostazioni → Backup → Importa, modalità UNIONE.\n");
console.log("Valori attesi (calcolati da questo script, non dall'app):\n");
for (const a of attesi) {
  console.log(`── ${a.paziente}`);
  console.log(`   ${a.scopo}`);
  for (const [nome, valore] of a.righe) {
    console.log(`   ${nome.padEnd(22)} ${valore}`);
  }
  console.log("");
}
