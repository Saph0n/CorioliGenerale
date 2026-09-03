/**
 * Coefficienti del modello SCORE2 (ESC 2021).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PROVENIENZA DEI NUMERI — leggere prima di modificarli
 *
 *  I coefficienti pubblicati stanno nel materiale supplementare di
 *  "SCORE2 risk prediction algorithms" (Eur Heart J 2021;42:2439-2454), non nel
 *  testo dell'articolo. La tabella qui sotto è stata confrontata voce per voce
 *  con l'implementazione indipendente del pacchetto CRAN `RiskScorescvd`
 *  (file `R/11_SCORE2_func.R`), che cita la stessa pubblicazione, e la
 *  struttura del modello è stata verificata sull'articolo primario.
 *
 *  Il confronto ha corretto due errori:
 *   - i fattori di ricalibrazione della regione a rischio moderato per le donne
 *     erano una copia di quelli della regione ad alto rischio (le pazienti
 *     italiane risultavano quindi sovrastimate);
 *   - il modello riceveva il colesterolo non-HDL al posto di quello totale
 *     (vedi `computeScore2`): SCORE2 usa totale e HDL come predittori
 *     separati, il non-HDL compare solo sull'asse delle carte a stampa.
 *
 *  Resta da fare, prima di considerare chiusa la verifica: il riscontro
 *  diretto sulla Supplementary Table del paper, che non è liberamente
 *  scaricabile. Se un numero non torna, la fonte è quella, non questo file.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Interruttore di sicurezza: finché è `false` l'app non mostra il punteggio.
 * Messo a `true` dopo il confronto descritto qui sopra; rimetterlo a `false`
 * se si tocca un coefficiente senza riverificarlo.
 */
export const SCORE2_COEFFICIENTS_VALIDATED = true;

/** Riferimento bibliografico mostrato accanto al risultato. */
export const SCORE2_SOURCE =
  "SCORE2 working group & ESC Cardiovascular risk collaboration, Eur Heart J 2021;42:2439-2454";

/** Regioni di rischio SCORE2. L'Italia rientra nella regione a rischio moderato. */
export type Score2Region = "basso" | "moderato" | "alto" | "molto_alto";

export const SCORE2_REGION_LABELS: Record<Score2Region, string> = {
  basso: "Rischio basso",
  moderato: "Rischio moderato (Italia)",
  alto: "Rischio alto",
  molto_alto: "Rischio molto alto",
};

/** Regione predefinita per un ambulatorio italiano. */
export const SCORE2_DEFAULT_REGION: Score2Region = "moderato";

export interface Score2ModelCoefficients {
  /** Eta' centrata: (eta' - 60) / 5 */
  cAge: number;
  /** Fumatore attuale (0/1) */
  smoking: number;
  /** PA sistolica centrata: (PAS - 120) / 20 */
  cSbp: number;
  /** Colesterolo totale centrato: (tot - 6) mmol/L */
  cTchol: number;
  /** HDL centrato: (hdl - 1.3) / 0.5 mmol/L */
  cHdl: number;
  /** Interazioni con l'eta' */
  smokingXAge: number;
  cSbpXAge: number;
  cTcholXAge: number;
  cHdlXAge: number;
  /** Sopravvivenza di base a 10 anni */
  baselineSurvival: number;
}

/** Coefficienti sesso-specifici del modello non ricalibrato. */
export const SCORE2_COEFFICIENTS: Record<"M" | "F", Score2ModelCoefficients> = {
  M: {
    cAge: 0.3742,
    smoking: 0.6012,
    cSbp: 0.2777,
    cTchol: 0.1458,
    cHdl: -0.2698,
    smokingXAge: -0.0755,
    cSbpXAge: -0.0255,
    cTcholXAge: -0.0281,
    cHdlXAge: 0.0426,
    baselineSurvival: 0.9605,
  },
  F: {
    cAge: 0.4648,
    smoking: 0.7744,
    cSbp: 0.3131,
    cTchol: 0.1002,
    cHdl: -0.2606,
    smokingXAge: -0.1088,
    cSbpXAge: -0.0277,
    cTcholXAge: -0.0226,
    cHdlXAge: 0.0613,
    baselineSurvival: 0.9776,
  },
};

/** Fattori di ricalibrazione per regione e sesso. */
export const SCORE2_RECALIBRATION: Record<
  Score2Region,
  Record<"M" | "F", { scale1: number; scale2: number }>
> = {
  basso: {
    M: { scale1: -0.5699, scale2: 0.7476 },
    F: { scale1: -0.738, scale2: 0.7019 },
  },
  moderato: {
    M: { scale1: -0.1565, scale2: 0.8009 },
    F: { scale1: -0.3143, scale2: 0.7701 },
  },
  alto: {
    M: { scale1: 0.3207, scale2: 0.936 },
    F: { scale1: 0.571, scale2: 0.9369 },
  },
  molto_alto: {
    M: { scale1: 0.5836, scale2: 0.8294 },
    F: { scale1: 0.9412, scale2: 0.8329 },
  },
};

/** Eta' di validita' del modello SCORE2 (per SCORE2-OP servono altri coefficienti). */
export const SCORE2_MIN_AGE = 40;
export const SCORE2_MAX_AGE = 69;
