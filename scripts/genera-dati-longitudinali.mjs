/**
 * Genera un backup Corioli con pazienti seguiti **nel tempo**, per collaudare
 * quello che una visita sola non puo' mostrare: i grafici di andamento, il
 * confronto con la visita precedente, le fasce dei rapporti lipidici, i moduli
 * dinamici e i pannelli di laboratorio.
 *
 * Si importa da Impostazioni → Backup in modalita' **unione**: i pazienti si
 * aggiungono all'archivio senza toccare quelli veri. Sono riconoscibili dal
 * cognome (che inizia per PROVA) e dall'email @prova.test, così si ritrovano e
 * si cancellano a colpo d'occhio.
 *
 * Il backup **non contiene il profilo dottore**: quello resta il tuo, e va
 * compilato in Impostazioni prima di poter salvare una visita.
 *
 * I valori attesi stampati a fine esecuzione sono calcolati **qui**, da questo
 * script, non dal codice dell'app: se l'app mostra un numero diverso e' un
 * risultato del confronto, non un errore di trascrizione.
 *
 *   node scripts/genera-dati-longitudinali.mjs
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ora = new Date().toISOString();

/** Data di nascita che oggi corrisponde all'eta' voluta. */
function nascitaPerEta(eta) {
  return `${new Date().getFullYear() - eta}-04-12`;
}

// ─── Calcolatori riscritti qui, per avere un atteso indipendente ─────────────

const r1 = (n) => Math.round(n * 10) / 10;

const ldlFriedewald = (ct, hdl, tg) =>
  tg >= 400 ? "non applicabile (TG >= 400)" : `${Math.round(ct - hdl - tg / 5)} mg/dL`;

const ctHdl = (ct, hdl) => {
  const v = r1(ct / hdl);
  const fascia = v < 4 ? "ottimale" : v <= 5 ? "borderline" : "sfavorevole";
  return `${v} (${fascia})`;
};

const tgHdl = (tg, hdl) => {
  const v = r1(tg / hdl);
  const fascia = v < 2 ? "ottimale" : v <= 3.5 ? "intermedio" : "a rischio";
  return `${v} (${fascia})`;
};

const homa = (gli, ins) => r1((gli * ins) / 405);

function egfr(creat, eta, sesso) {
  const k = sesso === "F" ? 0.7 : 0.9;
  const alpha = sesso === "F" ? -0.241 : -0.302;
  const ratio = creat / k;
  const v =
    142 *
    Math.pow(Math.min(ratio, 1), alpha) *
    Math.pow(Math.max(ratio, 1), -1.2) *
    Math.pow(0.9938, eta) *
    (sesso === "F" ? 1.012 : 1);
  const stadio =
    v >= 90 ? "G1" : v >= 60 ? "G2" : v >= 45 ? "G3a" : v >= 30 ? "G3b" : v >= 15 ? "G4" : "G5";
  return `${Math.round(v)} mL/min (${stadio})`;
}

/**
 * SCORE2 riscritto qui dalle formule pubblicate, per avere un atteso
 * indipendente da `src/utils/cardioCalcs.ts`. Regione a rischio moderato,
 * quella italiana.
 */
function score2(eta, sesso, fumatore, pas, ct, hdl) {
  if (eta < 40 || eta > 69) return "non applicabile (serve SCORE2-OP)";
  const MMOL = 38.67;
  const c =
    sesso === "M"
      ? { a: 0.3742, sm: 0.6012, sb: 0.2777, tc: 0.1458, hd: -0.2698,
          smA: -0.0755, sbA: -0.0255, tcA: -0.0281, hdA: 0.0426, S0: 0.9605,
          s1: -0.1565, s2: 0.8009 }
      : { a: 0.4648, sm: 0.7744, sb: 0.3131, tc: 0.1002, hd: -0.2606,
          smA: -0.1088, sbA: -0.0277, tcA: -0.0226, hdA: 0.0613, S0: 0.9776,
          s1: -0.3143, s2: 0.7701 };
  const cage = (eta - 60) / 5;
  const csbp = (pas - 120) / 20;
  const ctchol = ct / MMOL - 6;
  const chdl = (hdl / MMOL - 1.3) / 0.5;
  const sm = fumatore === "si" ? 1 : 0;
  const x =
    c.a * cage + c.sm * sm + c.sb * csbp + c.tc * ctchol + c.hd * chdl +
    c.smA * cage * sm + c.sbA * cage * csbp + c.tcA * cage * ctchol + c.hdA * cage * chdl;
  const uncal = 1 - Math.pow(c.S0, Math.exp(x));
  const pct =
    (1 - Math.exp(-Math.exp(c.s1 + c.s2 * Math.log(-Math.log(1 - uncal))))) * 100;
  const banda =
    eta < 50
      ? pct < 2.5 ? "basso-moderato" : pct < 7.5 ? "alto" : "molto alto"
      : pct < 5 ? "basso-moderato" : pct < 10 ? "alto" : "molto alto";
  return `${r1(pct)}% a 10 anni (${banda})`;
}

const fasciaCac = (s) =>
  s === 0 ? "assente" : s < 100 ? "lieve" : s < 400 ? "moderata" : "severa";

const pctFcMax = (fc, eta) => `${Math.round((fc / (220 - eta)) * 100)}%`;

function caloNotturno(diurna, notturna) {
  const v = r1(((diurna - notturna) / diurna) * 100);
  const profilo = v < 0 ? "riverso" : v < 10 ? "non-dipper" : v <= 20 ? "dipper" : "dipper estremo";
  return `${v}% (${profilo})`;
}

// ─── La coorte ──────────────────────────────────────────────────────────────
//
// Ogni paziente collauda una cosa precisa. La nota in scheda dice quale, così
// aprendo la cartella si sa cosa si sta guardando.

const COORTE = [
  {
    id: "prova-lipidi",
    nome: "Marco",
    cognome: "Prova Lipidi",
    cf: "PRVMRC68D12G702A",
    eta: 58,
    sesso: "M",
    altezza: 176,
    gruppi: [{ nome: "Progetto lipidi 2026", dal: "2024-05-18" }],
    scopo:
      "Cinque visite in quattro anni con ApoB e LDL in calo sotto terapia: e' il caso per i grafici di andamento. Gli intervalli sono volutamente diseguali, l'asse del tempo deve rispettarli.",
    visite: [
      { data: "2022-03-14", prelievo: "2022-02-28", peso: 92, pa: "152/94", fc: 78, fumatore: "si",
        lab: { colesteroloTotale: 268, hdl: 42, trigliceridi: 210, apoB: 142, lpa: 42, glicemia: 104, creatinina: 1.0 },
        eco: { ddvs: 52, siv: 11, fe: 58, atrioSinistro: 39, tapse: 22, paps: 28 } },
      { data: "2023-04-20", prelievo: "2023-04-03", peso: 89, pa: "146/90", fc: 74, fumatore: "si",
        lab: { colesteroloTotale: 232, hdl: 44, trigliceridi: 180, apoB: 118, glicemia: 101, creatinina: 1.0 } },
      { data: "2024-05-18", prelievo: "2024-04-29", peso: 87, pa: "138/86", fc: 72, fumatore: "no",
        lab: { colesteroloTotale: 198, hdl: 46, trigliceridi: 160, apoB: 96, lpa: 40, glicemia: 98, creatinina: 1.05 },
        eco: { ddvs: 51, siv: 11, fe: 60, atrioSinistro: 38, tapse: 23, paps: 26 } },
      { data: "2025-06-07", prelievo: "2025-05-21", peso: 85, pa: "132/82", fc: 70, fumatore: "no",
        lab: { colesteroloTotale: 172, hdl: 48, trigliceridi: 140, apoB: 78, glicemia: 96, creatinina: 1.0 } },
      { data: "2026-02-21", prelievo: "2026-02-04", peso: 84, pa: "128/78", fc: 68, fumatore: "no",
        lab: { colesteroloTotale: 148, hdl: 50, trigliceridi: 120, apoB: 62, lpa: 38, glicemia: 94, creatinina: 0.98 },
        eco: { ddvs: 50, siv: 10, fe: 61, atrioSinistro: 37, tapse: 24, paps: 25 } },
    ],
  },
  {
    id: "prova-progressione",
    nome: "Giulia",
    cognome: "Prova Progressione",
    cf: "PRVGLI62D52G702B",
    eta: 64,
    sesso: "F",
    altezza: 162,
    gruppi: [{ nome: "Registro scompenso", dal: "2023-09-11" }],
    scopo:
      "Quattro visite con quadro in peggioramento: la frazione di eiezione scende, il calcium score sale, il filtrato cala di stadio. Serve a vedere i semafori cambiare colore nel tempo.",
    visite: [
      { data: "2023-09-11", prelievo: "2023-08-30", peso: 71, pa: "134/84", fc: 76, fumatore: "no",
        lab: { colesteroloTotale: 214, hdl: 54, trigliceridi: 132, creatinina: 0.9, albuminuria: 12, emoglobina: 13.4 },
        eco: { ddvs: 48, siv: 10, pp: 9, fe: 62, atrioSinistro: 38, tapse: 21, paps: 28, rapportoEA: 0.9, rapportoEe: 9 },
        tc: { data: "2023-08-20", cac: 40, cadRads: "1" } },
      { data: "2024-10-02", prelievo: "2024-09-18", peso: 73, pa: "142/88", fc: 78, fumatore: "no",
        lab: { colesteroloTotale: 222, hdl: 51, trigliceridi: 158, creatinina: 1.1, albuminuria: 45, emoglobina: 13.0 },
        eco: { ddvs: 50, siv: 11, pp: 10, fe: 58, atrioSinistro: 41, tapse: 20, paps: 32, rapportoEA: 0.8, rapportoEe: 11 } },
      { data: "2025-11-14", prelievo: "2025-10-30", peso: 75, pa: "148/90", fc: 82, fumatore: "no",
        lab: { colesteroloTotale: 228, hdl: 48, trigliceridi: 178, creatinina: 1.4, albuminuria: 120, emoglobina: 12.2 },
        eco: { ddvs: 54, siv: 12, pp: 11, fe: 51, atrioSinistro: 44, tapse: 18, paps: 40, rapportoEA: 0.7, rapportoEe: 14 },
        tc: { data: "2025-10-22", cac: 280, cadRads: "3" } },
      { data: "2026-08-19", prelievo: "2026-08-05", peso: 76, pa: "152/92", fc: 86, fumatore: "no",
        lab: { colesteroloTotale: 235, hdl: 45, trigliceridi: 196, creatinina: 1.8, albuminuria: 380, emoglobina: 11.4 },
        eco: { ddvs: 58, siv: 12, pp: 12, fe: 44, atrioSinistro: 47, tapse: 16, paps: 52, rapportoEA: 0.6, rapportoEe: 17 },
        tc: { data: "2026-07-30", cac: 460, cadRads: "4A" } },
    ],
  },
  {
    id: "prova-rapporti",
    nome: "Anna",
    cognome: "Prova Rapporti",
    cf: "PRVNNA74D52G702C",
    eta: 52,
    sesso: "F",
    altezza: 165,
    gruppi: [{ nome: "Progetto lipidi 2026", dal: "2025-03-04" }],
    scopo:
      "Tre visite che attraversano tutte e tre le fasce di CT/HDL e TG/HDL: ottimale, borderline e a rischio. Serve a controllare che il colore e la parola della fascia cambino alle soglie giuste.",
    visite: [
      { data: "2024-02-19", prelievo: "2024-02-05", peso: 60, pa: "118/74", fc: 66, fumatore: "no",
        lab: { colesteroloTotale: 180, hdl: 62, trigliceridi: 90, apoB: 78, glicemia: 88, insulina: 6, creatinina: 0.72 } },
      { data: "2025-03-04", prelievo: "2025-02-18", peso: 65, pa: "128/80", fc: 72, fumatore: "no",
        lab: { colesteroloTotale: 220, hdl: 50, trigliceridi: 140, apoB: 102, glicemia: 99, insulina: 11, creatinina: 0.75 } },
      { data: "2026-04-08", prelievo: "2026-03-25", peso: 71, pa: "136/86", fc: 78, fumatore: "no",
        lab: { colesteroloTotale: 265, hdl: 41, trigliceridi: 260, apoB: 136, glicemia: 112, insulina: 18, creatinina: 0.78 } },
    ],
  },
  {
    id: "prova-dinamici",
    nome: "Paolo",
    cognome: "Prova Dinamici",
    cf: "PRVPLA65D12G702D",
    eta: 61,
    sesso: "M",
    altezza: 178,
    gruppi: [{ nome: "Registro scompenso", dal: "2025-01-15" }],
    scopo:
      "Test ergometrico, Holter ECG e Holter pressorio compilati: i tre moduli nuovi devono aprirsi gia' espansi, comparire in stampa e mostrare i calcoli (percentuale della FC teorica e calo notturno).",
    visite: [
      { data: "2025-01-15", prelievo: "2025-01-08", peso: 88, pa: "140/88", fc: 74, fumatore: "no",
        lab: { colesteroloTotale: 205, hdl: 47, trigliceridi: 150, creatinina: 1.05 },
        ergo: { dataEsame: "2025-01-10", protocollo: "Bruce", durataMin: 9, caricoWatt: 150, mets: 10.2, fcMax: 148, paMax: "190/95", motivoInterruzione: "Esaurimento muscolare", esito: "negativo" } },
      { data: "2025-09-23", prelievo: "2025-09-10", peso: 87, pa: "138/86", fc: 72, fumatore: "no",
        lab: { colesteroloTotale: 198, hdl: 49, trigliceridi: 140, creatinina: 1.02 },
        holterEcg: { dataEsame: "2025-09-15", durataOre: 24, fcMedia: 68, fcMin: 44, fcMax: 132, besv: 320, bev: 1450, pausaMaxSec: 2.4, ritmoPrevalente: "sinusale" } },
      { data: "2026-06-11", prelievo: "2026-05-28", peso: 86, pa: "136/84", fc: 70, fumatore: "no",
        lab: { colesteroloTotale: 190, hdl: 51, trigliceridi: 132, creatinina: 1.0 },
        holterPa: { dataEsame: "2026-06-02", media24Sist: 138, media24Diast: 84, mediaDiurnaSist: 142, mediaDiurnaDiast: 88, mediaNotturnaSist: 130, mediaNotturnaDiast: 76, caricoPressorioPct: 42 } },
    ],
  },
  {
    id: "prova-metabolico",
    nome: "Rosa",
    cognome: "Prova Metabolico",
    cf: "PRVRSO69D52G702E",
    eta: 57,
    sesso: "F",
    altezza: 158,
    scopo:
      "Pannello metabolico esteso tutto fuori range: transaminasi, uricemia, TSH, HbA1c, HOMA-IR alto e Lp(a) sopra la soglia di rischio molto elevato.",
    visite: [
      { data: "2025-05-06", prelievo: "2025-04-22", peso: 78, pa: "144/88", fc: 80, fumatore: "si",
        lab: { colesteroloTotale: 248, hdl: 43, trigliceridi: 230, apoB: 128, lpa: 190, glicemia: 124, insulina: 19, hba1c: 6.3, creatinina: 0.95, ast: 55, alt: 68, uricemia: 6.8, tsh: 5.4, emoglobina: 12.6 } },
      { data: "2026-05-19", prelievo: "2026-05-05", peso: 81, pa: "150/92", fc: 84, fumatore: "si",
        lab: { colesteroloTotale: 256, hdl: 40, trigliceridi: 268, apoB: 138, lpa: 210, glicemia: 132, insulina: 22, hba1c: 6.9, creatinina: 1.0, ast: 62, alt: 78, uricemia: 7.1, tsh: 6.2, emoglobina: 12.1 } },
    ],
  },
  {
    id: "prova-score2-uomo",
    nome: "Enzo",
    cognome: "Prova Score Uomo",
    cf: "PRVNZE71D12G702F",
    eta: 55,
    sesso: "M",
    altezza: 175,
    scopo:
      "Dentro la finestra SCORE2 (40-69) con tutti gli input presenti: eta', sesso, fumo, sistolica, colesterolo e HDL. Il punteggio e la fascia di rischio devono comparire.",
    visite: [
      { data: "2025-07-02", prelievo: "2025-06-18", peso: 86, pa: "150/92", fc: 76, fumatore: "si",
        lab: { colesteroloTotale: 252, hdl: 38, trigliceridi: 190, apoB: 130, creatinina: 1.1 } },
      { data: "2026-07-15", prelievo: "2026-07-01", peso: 84, pa: "154/94", fc: 78, fumatore: "si",
        lab: { colesteroloTotale: 245, hdl: 38, trigliceridi: 200, apoB: 126, creatinina: 1.12 } },
    ],
  },
  {
    id: "prova-score2-donna",
    nome: "Laura",
    cognome: "Prova Score Donna",
    cf: "PRVLRA64D52G702G",
    eta: 62,
    sesso: "F",
    altezza: 164,
    scopo:
      "Percorso femminile di SCORE2 in regione a rischio moderato: e' il caso in cui una ricalibrazione sbagliata sovrastimava il rischio. Confronta il punteggio con quello atteso qui sotto.",
    visite: [
      { data: "2025-10-09", prelievo: "2025-09-25", peso: 66, pa: "138/84", fc: 70, fumatore: "no",
        lab: { colesteroloTotale: 215, hdl: 58, trigliceridi: 120, creatinina: 0.8 } },
      { data: "2026-10-20", prelievo: "2026-10-06", peso: 67, pa: "140/86", fc: 72, fumatore: "no",
        lab: { colesteroloTotale: 220, hdl: 56, trigliceridi: 130, creatinina: 0.82 } },
    ],
  },
  {
    id: "prova-limiti",
    nome: "Vittorio",
    cognome: "Prova Limiti",
    cf: "PRVVTR52D12G702H",
    eta: 74,
    sesso: "M",
    altezza: 170,
    scopo:
      "Casi di rifiuto, con una sola visita. Oltre i 69 anni SCORE2 deve rimandare a SCORE2-OP; con trigliceridi oltre 400 Friedewald non deve calcolare mentre il non-HDL si'. Nessun grafico di andamento deve comparire: manca il secondo punto.",
    visite: [
      { data: "2026-01-28", prelievo: "2026-01-14", peso: 82, pa: "158/90", fc: 64, fumatore: "no",
        lab: { colesteroloTotale: 290, hdl: 36, trigliceridi: 460, apoB: 145, glicemia: 118, creatinina: 1.5, albuminuria: 90 },
        ecg: { ritmo: "fibrillazione atriale", pr: undefined, qrs: 118, qt: 430, asse: -20 } },
    ],
  },
  {
    id: "prova-fa",
    nome: "Anna",
    cognome: "Prova Fibrillazione",
    cf: "PRVNNA49E52G702C",
    eta: 77,
    sesso: "F",
    altezza: 158,
    scopo:
      "Fibrillazione atriale in donna di 77 anni: collauda CHA2DS2-VASc e HAS-BLED. Ipertensione e diabete stanno nei fattori di rischio, non nel modulo FA, e da li' entrano nel punteggio. In warfarin, cosi' la voce INR labile e' selezionabile: in DOAC resterebbe grigia.",
    visite: [
      { data: "2025-03-12", prelievo: "2025-03-01", peso: 68, pa: "148/88", fc: 88, fumatore: "no",
        classeRischio: "alto",
        rischio: { ipertensione: true, diabete: true, dislipidemia: true },
        lab: { colesteroloTotale: 212, hdl: 52, trigliceridi: 148, creatinina: 1.1 },
        ecg: { ritmo: "Fibrillazione atriale", qrs: 92, qt: 380 },
        eco: { fe: 55, atrioSinistro: 45, tapse: 20, paps: 34 },
        fa: { tipo: "parossistica", anticoagulante: "warfarin", cvIctus: true,
              hbIpertensioneNonControllata: true, hbInrLabile: true } },
      { data: "2026-04-08", prelievo: "2026-03-27", peso: 67, pa: "134/80", fc: 72, fumatore: "no",
        classeRischio: "alto",
        rischio: { ipertensione: true, diabete: true, dislipidemia: true },
        lab: { colesteroloTotale: 188, hdl: 55, trigliceridi: 130, creatinina: 1.15 },
        ecg: { ritmo: "Fibrillazione atriale", qrs: 94, qt: 386 },
        eco: { fe: 54, atrioSinistro: 46, tapse: 19, paps: 36 },
        fa: { tipo: "persistente", anticoagulante: "warfarin", cvIctus: true, cvVascolare: true,
              hbIpertensioneNonControllata: true, hbInrLabile: true, hbSanguinamento: true } },
    ],
  },
  {
    id: "prova-hfimpef",
    nome: "Luigi",
    cognome: "Prova Scompenso",
    cf: "PRVLGU61C12G702D",
    eta: 65,
    sesso: "M",
    altezza: 172,
    gruppi: [{ nome: "Registro scompenso", dal: "2023-02-14" }],
    scopo:
      "Frazione di eiezione che scende e poi risale: 30% nel 2023, 44% nel 2024, 52% nel 2026. Serve a vedere l'HFimpEF, che nasce dal confronto fra due misure e non dalla FE di oggi. Nota: con ESC 2026 il 44% e' HFrEF, non piu' HFmrEF.",
    visite: [
      { data: "2023-02-14", prelievo: "2023-02-02", peso: 88, pa: "118/72", fc: 82, fumatore: "no",
        classeRischio: "molto-alto",
        rischio: { ipertensione: true, eventoCvPregresso: true, dislipidemia: true },
        lab: { colesteroloTotale: 168, hdl: 40, trigliceridi: 190, creatinina: 1.2, emoglobina: 13.1 },
        eco: { ddvs: 62, siv: 10, fe: 30, atrioSinistro: 46, tapse: 16, paps: 42 },
        scompenso: { nyha: "III", ntProBnp: 1850, contestoBnp: "ambulatoriale", dataBnp: "2023-02-02" } },
      { data: "2024-06-20", prelievo: "2024-06-05", peso: 84, pa: "112/70", fc: 68, fumatore: "no",
        classeRischio: "molto-alto",
        rischio: { ipertensione: true, eventoCvPregresso: true, dislipidemia: true },
        lab: { colesteroloTotale: 148, hdl: 44, trigliceridi: 160, creatinina: 1.15 },
        eco: { ddvs: 58, siv: 10, fe: 44, atrioSinistro: 43, tapse: 19, paps: 34 },
        scompenso: { nyha: "II", ntProBnp: 620, contestoBnp: "ambulatoriale", dataBnp: "2024-06-05" } },
      { data: "2026-01-15", prelievo: "2026-01-08", peso: 82, pa: "116/74", fc: 64, fumatore: "no",
        classeRischio: "molto-alto",
        rischio: { ipertensione: true, eventoCvPregresso: true, dislipidemia: true },
        lab: { colesteroloTotale: 132, hdl: 48, trigliceridi: 140, creatinina: 1.1 },
        eco: { ddvs: 54, siv: 10, fe: 52, atrioSinistro: 41, tapse: 21, paps: 28 },
        scompenso: { nyha: "I", ntProBnp: 210, contestoBnp: "ambulatoriale", dataBnp: "2026-01-08" },
        sintesi:
          "Frazione di eiezione risalita da 30% a 52% sotto terapia. Il fenotipo resta di scompenso: la terapia di fondo non si alleggerisce." },
    ],
  },
  {
    id: "prova-coronarie",
    nome: "Sergio",
    cognome: "Prova Coronarie",
    cf: "PRVSRG66A12G702E",
    eta: 60,
    sesso: "M",
    altezza: 178,
    scopo:
      "Tre TC coronariche in quattro anni: collauda la progressione del calcium score (100 → 180 → 320, senza valori inventati fra un esame e l'altro) e l'angio-TC estesa con burden, segmenti, componenti di placca e FFR-TC. L'ultima TC supera 300 ma non 400: e' il caso per provare la soglia configurabile in Impostazioni.",
    visite: [
      { data: "2022-05-10", prelievo: "2022-04-28", peso: 90, pa: "142/88", fc: 74, fumatore: "si",
        classeRischio: "alto",
        rischio: { ipertensione: true, dislipidemia: true, familiaritaCad: true },
        lab: { colesteroloTotale: 240, hdl: 41, trigliceridi: 220, apoB: 128, creatinina: 1.0 },
        tc: { data: "2022-04-20", cac: 100, cadRads: "1", metodica: "TC 128 strati, protocollo dedicato" } },
      { data: "2024-05-22", prelievo: "2024-05-06", peso: 88, pa: "136/84", fc: 72, fumatore: "si",
        classeRischio: "alto",
        rischio: { ipertensione: true, dislipidemia: true, familiaritaCad: true },
        lab: { colesteroloTotale: 214, hdl: 43, trigliceridi: 205, apoB: 110, creatinina: 1.02 },
        tc: { data: "2024-05-02", cac: 180, cadRads: "2", metodica: "TC 128 strati, protocollo dedicato",
              burden: "P2", calcifica: 70, nonCalcifica: 30, segmenti: [1, 6], stenosi: 40, stenosiSegmento: 6 } },
      { data: "2026-06-18", prelievo: "2026-06-02", peso: 87, pa: "132/82", fc: 70, fumatore: "no",
        classeRischio: "molto-alto",
        rischio: { ipertensione: true, dislipidemia: true, familiaritaCad: true },
        lab: { colesteroloTotale: 186, hdl: 46, trigliceridi: 198, apoB: 92, creatinina: 1.05 },
        tc: { data: "2026-06-01", cac: 320, cadRads: "3", metodica: "TC 128 strati, protocollo dedicato",
              burden: "P3", modificatori: ["HRP"], calcifica: 55, nonCalcifica: 45,
              segmenti: [1, 5, 6, 11], stenosi: 65, stenosiSegmento: 6, ffr: 0.78, ffrEsito: "I+" },
        sintesi:
          "Rischio calcolato e reperti di imaging concordi verso l'alto: calcium score triplicato in quattro anni e stenosi moderata sulla discendente anteriore prossimale." },
    ],
  },
  {
    id: "prova-score2op",
    nome: "Teresa",
    cognome: "Prova Anziana",
    cf: "PRVTRS44H52G702F",
    eta: 82,
    sesso: "F",
    altezza: 154,
    scopo:
      "82 anni: SCORE2 passa la mano a SCORE2-OP, che resta spento finche' non si inseriscono i coefficienti. Serve a controllare che l'app dica perche' il numero manca invece di limitarsi a non mostrarlo.",
    visite: [
      { data: "2026-05-04", prelievo: "2026-04-22", peso: 62, pa: "156/86", fc: 76, fumatore: "no",
        classeRischio: "alto",
        rischio: { ipertensione: true, dislipidemia: true, sedentarieta: true },
        lab: { colesteroloTotale: 226, hdl: 58, trigliceridi: 152, creatinina: 1.0, emoglobina: 12.6 },
        eco: { fe: 60, atrioSinistro: 40, tapse: 21, paps: 30 } },
    ],
  },

];

// ─── Costruzione del backup ─────────────────────────────────────────────────

const patients = [];
const visits = [];
const attesi = [];

for (const caso of COORTE) {
  const ultima = caso.visite[caso.visite.length - 1];
  patients.push({
    id: caso.id,
    codiceFiscale: caso.cf,
    nome: caso.nome,
    cognome: caso.cognome,
    dataNascita: nascitaPerEta(caso.eta),
    luogoNascita: "Pisa",
    sesso: caso.sesso,
    email: `${caso.id}@prova.test`,
    altezza: caso.altezza,
    peso: ultima.peso,
    notaBene: `DATI DI PROVA — ${caso.scopo}`,
    ...(caso.gruppi ? { gruppiRicerca: caso.gruppi } : {}),
    createdAt: ora,
    updatedAt: ora,
  });

  caso.visite.forEach((v, i) => {
    const pieno = (o) => o && Object.keys(o).length > 0;
    visits.push({
      id: `${caso.id}-v${i + 1}`,
      patientId: caso.id,
      dataVisita: v.data,
      descrizioneClinica: "",
      anamnesi: "",
      esamiObiettivo: "",
      conclusioniDiagnostiche: "",
      terapie: "",
      tipo: "generale",
      visita: {
        problemaClinico: `Visita di prova ${i + 1} di ${caso.visite.length}. ${caso.scopo}`,
        prestazione: "Dati inventati a scopo di test, nessun valore clinico.",
        esameObiettivo: "",
        accertamenti: "",
        terapiaSpecifica: "",
        pesoCorporeo: v.peso,
        pressioneArteriosa: v.pa,
        frequenzaCardiaca: String(v.fc),
        ...(v.fumatore ? { fumatore: v.fumatore } : {}),
        ...(pieno(v.ecg) ? { ecg: v.ecg } : {}),
        ...(pieno(v.eco) ? { ecocardiogramma: v.eco } : {}),
        ...(pieno(v.lab) ? { laboratorio: { dataPrelievo: v.prelievo, ...v.lab } } : {}),
        ...(v.tc
          ? {
              tcCoronarica: {
                dataEsame: v.tc.data,
                struttura: "Radiologia di prova",
                cacScore: v.tc.cac,
                ...(v.tc.cadRads ? { cadRads: v.tc.cadRads } : {}),
                // Campi dell'angio-TC estesa: presenti solo dove servono, così
                // resta anche un caso di TC con il solo calcium score.
                ...(v.tc.metodica ? { metodica: v.tc.metodica } : {}),
                ...(v.tc.burden ? { burdenPlacca: v.tc.burden } : {}),
                ...(v.tc.modificatori ? { cadRadsModificatori: v.tc.modificatori } : {}),
                ...(v.tc.calcifica != null ? { componenteCalcifica: v.tc.calcifica } : {}),
                ...(v.tc.nonCalcifica != null
                  ? { componenteNonCalcifica: v.tc.nonCalcifica }
                  : {}),
                ...(v.tc.segmenti ? { segmenti: v.tc.segmenti } : {}),
                ...(v.tc.stenosi != null ? { stenosiMassima: v.tc.stenosi } : {}),
                ...(v.tc.stenosiSegmento != null
                  ? { stenosiMassimaSegmento: v.tc.stenosiSegmento }
                  : {}),
                ...(v.tc.ffr != null ? { ffrCt: v.tc.ffr } : {}),
                ...(v.tc.ffrEsito ? { ffrCtEsito: v.tc.ffrEsito } : {}),
              },
            }
          : {}),
        ...(pieno(v.ergo) ? { testErgometrico: v.ergo } : {}),
        ...(pieno(v.holterEcg) ? { holterEcg: v.holterEcg } : {}),
        ...(pieno(v.holterPa) ? { holterPressorio: v.holterPa } : {}),
        ...(pieno(v.scompenso) ? { scompenso: v.scompenso } : {}),
        ...(pieno(v.fa) ? { fibrillazioneAtriale: v.fa } : {}),
        ...(pieno(v.rischio) ? { fattoriRischio: v.rischio } : {}),
        ...(v.classeRischio ? { categoriaRischioCv: v.classeRischio } : {}),
        ...(v.sintesi ? { sintesiRischio: v.sintesi } : {}),
      },
      createdAt: `${v.data}T09:00:00.000Z`,
      updatedAt: `${v.data}T09:00:00.000Z`,
    });
  });

  // Valori attesi sull'ultima visita, calcolati da questo script.
  const l = ultima.lab || {};
  const righe = [];
  if (l.colesteroloTotale && l.hdl) {
    if (l.trigliceridi) {
      righe.push(["LDL (Friedewald)", ldlFriedewald(l.colesteroloTotale, l.hdl, l.trigliceridi)]);
    }
    righe.push(["Non-HDL", `${l.colesteroloTotale - l.hdl} mg/dL`]);
    righe.push(["CT / HDL", ctHdl(l.colesteroloTotale, l.hdl)]);
    if (l.trigliceridi) righe.push(["TG / HDL", tgHdl(l.trigliceridi, l.hdl)]);
  }
  if (l.glicemia && l.insulina) righe.push(["HOMA-IR", String(homa(l.glicemia, l.insulina))]);
  if (l.creatinina) righe.push(["eGFR", egfr(l.creatinina, caso.eta, caso.sesso)]);
  if (ultima.tc) righe.push(["Calcium score", `${ultima.tc.cac} (${fasciaCac(ultima.tc.cac)})`]);
  if (ultima.ergo) {
    righe.push(["% FC max teorica", pctFcMax(ultima.ergo.fcMax, caso.eta)]);
  }
  if (ultima.holterPa) {
    righe.push([
      "Calo notturno",
      caloNotturno(ultima.holterPa.mediaDiurnaSist, ultima.holterPa.mediaNotturnaSist),
    ]);
  }
  const sistolica = Number(String(ultima.pa).split("/")[0]);
  if (l.colesteroloTotale && l.hdl && ultima.fumatore && sistolica) {
    righe.push([
      "SCORE2 (Italia)",
      score2(caso.eta, caso.sesso, ultima.fumatore, sistolica, l.colesteroloTotale, l.hdl),
    ]);
  }
  const serieApoB = caso.visite.filter((v) => v.lab?.apoB).map((v) => v.lab.apoB);
  if (serieApoB.length >= 2) righe.push(["Serie ApoB", serieApoB.join(" → ")]);

  attesi.push({
    paziente: `${caso.nome} ${caso.cognome} (${caso.sesso}, ${caso.eta} anni, ${caso.visite.length} visite)`,
    scopo: caso.scopo,
    righe,
  });
}

// Il profilo dottore resta fuori: e' quello del medico, non di un file di prova.
const backup = {
  schemaVersion: 1,
  appVersion: "dati-di-prova-longitudinali",
  exportedAt: ora,
  patients,
  visits,
  visitRevisions: [],
  richiesteEsami: [],
  certificatiPaziente: [],
  ricettePaziente: [],
  documents: [],
  templates: [],
};

const qui = dirname(fileURLToPath(import.meta.url));
const destinazione = join(qui, "dati-prova-longitudinali.json");
writeFileSync(destinazione, JSON.stringify(backup, null, 2), "utf8");

// ─── Riepilogo a schermo ────────────────────────────────────────────────────

console.log(`\nScritto: ${destinazione}`);
console.log(`${patients.length} pazienti, ${visits.length} visite.\n`);
console.log("Import da Impostazioni → Backup, modalita' UNIONE.");
console.log("I gruppi di ricerca vanno attivati a parte in Impostazioni.\n");
console.log("Valori attesi sull'ultima visita di ogni paziente:");
console.log("(calcolati da questo script, non dall'app: servono per il confronto)\n");

for (const a of attesi) {
  console.log(`── ${a.paziente}`);
  console.log(`   ${a.scopo}`);
  for (const [nome, valore] of a.righe) {
    console.log(`   ${nome.padEnd(20)} ${valore}`);
  }
  console.log("");
}
