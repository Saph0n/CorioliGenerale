/**
 * Coefficienti del modello SCORE2-OP (older persons, 70-89 anni).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PROVENIENZA DEI NUMERI — leggere prima di modificarli
 *
 *  **I coefficienti non ci sono ancora.** Quelli pubblicati stanno in
 *  "SCORE2-OP risk prediction algorithms" (Eur Heart J 2021;42:2455-2467) e nel
 *  suo materiale supplementare, che va consultato e riscontrato voce per voce
 *  come e' stato fatto per SCORE2 (vedi `score2Coefficients.ts`, dove il
 *  confronto con una implementazione indipendente aveva scoperto due errori).
 *
 *  Finche' quel lavoro non e' fatto, `SCORE2_OP_COEFFICIENTS_VALIDATED` resta
 *  `false` e l'applicazione **non mostra nessuna percentuale**: la struttura
 *  qui sotto e' l'incastellatura pronta a riceverli, non una stima.
 *
 *  SCORE2-OP non e' SCORE2 con l'eta' spostata. Differenze da rispettare
 *  quando si inseriranno i numeri:
 *   - l'eta' e' centrata sui **73 anni**, non sui 60;
 *   - il modello include i **termini di interazione con l'eta'** per fumo,
 *     pressione e colesterolo, che in SCORE2 non ci sono;
 *   - la sopravvivenza di base e la ricalibrazione per regione sono diverse.
 *  Copiare i coefficienti di SCORE2 qui dentro produrrebbe numeri plausibili e
 *  sbagliati, che e' il modo peggiore di sbagliare.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Interruttore di sicurezza, gemello di `SCORE2_COEFFICIENTS_VALIDATED`.
 * Va messo a `true` solo dopo il riscontro sulla pubblicazione.
 */
export const SCORE2_OP_COEFFICIENTS_VALIDATED = false;

/** Riferimento bibliografico da mostrare accanto al risultato. */
export const SCORE2_OP_SOURCE =
  "SCORE2-OP working group & ESC Cardiovascular risk collaboration, Eur Heart J 2021;42:2455-2467";

/** Eta' minima e massima di validita' del modello. */
export const SCORE2_OP_MIN_AGE = 70;
export const SCORE2_OP_MAX_AGE = 89;

/** Eta' su cui il modello centra il predittore. */
export const SCORE2_OP_AGE_CENTER = 73;

/**
 * Forma dei coefficienti attesi.
 *
 * I campi `x_age` sono le interazioni con l'eta': sono la ragione per cui il
 * peso del fumo e della pressione cala con gli anni, ed e' l'aspetto che
 * distingue SCORE2-OP dal modello per gli adulti piu' giovani.
 */
export interface Score2OpModelCoefficients {
  cAge: number;
  smoking: number;
  cSbp: number;
  cTchol: number;
  cHdl: number;
  diabetes: number;
  smokingXAge: number;
  sbpXAge: number;
  cholXAge: number;
  hdlXAge: number;
  diabetesXAge: number;
  /** Sopravvivenza di base a 10 anni. */
  baselineSurvival: number;
  /** Media del predittore lineare nella coorte di derivazione. */
  meanLinearPredictor: number;
}

/**
 * Segnaposto, tutti a zero **di proposito**.
 *
 * Non sono valori di ripiego: con il gate a `false` non vengono mai usati, e
 * lasciarli a zero fa fallire in modo evidente qualunque uso accidentale
 * invece di restituire un rischio credibile.
 */
export const SCORE2_OP_COEFFICIENTS: Record<"M" | "F", Score2OpModelCoefficients> = {
  M: {
    cAge: 0, smoking: 0, cSbp: 0, cTchol: 0, cHdl: 0, diabetes: 0,
    smokingXAge: 0, sbpXAge: 0, cholXAge: 0, hdlXAge: 0, diabetesXAge: 0,
    baselineSurvival: 0, meanLinearPredictor: 0,
  },
  F: {
    cAge: 0, smoking: 0, cSbp: 0, cTchol: 0, cHdl: 0, diabetes: 0,
    smokingXAge: 0, sbpXAge: 0, cholXAge: 0, hdlXAge: 0, diabetesXAge: 0,
    baselineSurvival: 0, meanLinearPredictor: 0,
  },
};
