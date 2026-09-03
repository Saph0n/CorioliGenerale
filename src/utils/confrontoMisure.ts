/**
 * Confronto con le visite precedenti.
 *
 * Il cardiologo che apre una visita di controllo vuole sapere subito com'era
 * l'ultimo valore e di quanto si e' mosso: la frazione di eiezione, il calcium
 * score, la creatinina. Finche' quel dato sta solo nella visita vecchia, per
 * vederlo bisogna uscire, aprire l'altra scheda e tornare indietro — ed e'
 * esattamente il tempo che il gestionale dovrebbe far risparmiare.
 *
 * Qui si costruisce una sola volta la mappa "ultimo valore noto" per ogni
 * misura, scorrendo le visite dalla piu' recente alla piu' vecchia e fermandosi
 * al primo valore trovato. La mappa viene poi letta dai campi del form.
 *
 * Il confronto e' solo informativo: il valore precedente non viene mai
 * ricopiato nel campo, perche' una misura non ripetuta e' un dato mancante,
 * non un dato uguale a prima.
 */

import type { Visit } from "../types/Storage";

/** Blocchi di misure confrontabili dentro `visita`. */
export const BLOCCHI_CONFRONTABILI = [
  "ecg",
  "ecocardiogramma",
  "tcCoronarica",
  "laboratorio",
  "holterEcg",
  "holterPressorio",
  "testErgometrico",
] as const;

export type BloccoConfrontabile = (typeof BLOCCHI_CONFRONTABILI)[number];

/**
 * Campi da non confrontare: referti liberi (troppo lunghi per un'anteprima) e
 * metadati che datano l'esame invece di misurarlo.
 */
const CAMPI_ESCLUSI = new Set([
  "referto",
  "dataEsame",
  "dataPrelievo",
  "struttura",
  "immagini",
]);

/**
 * Campo del blocco che porta la data propria dell'esame. Quando c'e', il
 * valore precedente viene datato con quella e non con la data della visita:
 * un prelievo puo' essere di mesi prima della visita in cui e' stato visto.
 */
const CAMPO_DATA_ESAME: Partial<Record<BloccoConfrontabile, string>> = {
  laboratorio: "dataPrelievo",
  tcCoronarica: "dataEsame",
  holterEcg: "dataEsame",
  holterPressorio: "dataEsame",
  testErgometrico: "dataEsame",
};

/** Misure che stanno direttamente su `visita`, fuori dai blocchi. */
const CAMPI_VITALI = ["pesoCorporeo", "pressioneArteriosa", "frequenzaCardiaca"] as const;

export interface ValorePrecedente {
  valore: number | string;
  /** Data ISO a cui il valore si riferisce. */
  data: string;
  /** `esame` quando la data viene dal modulo, `visita` quando dalla visita. */
  fonte: "visita" | "esame";
}

/** Chiave `blocco.campo` (es. `ecocardiogramma.fe`, `visita.pesoCorporeo`). */
export type MappaPrecedenti = Record<string, ValorePrecedente>;

/** True per i valori che vale la pena confrontare (esclude vuoti e zeri finti). */
function valoreUtile(v: unknown): v is number | string {
  if (typeof v === "number") return Number.isFinite(v) && v !== 0;
  if (typeof v === "string") return v.trim() !== "";
  return false;
}

function dataDelValore(
  visit: Visit,
  blocco: Record<string, unknown> | undefined,
  campoData: string | undefined,
): { data: string; fonte: "visita" | "esame" } {
  const propria = campoData ? blocco?.[campoData] : undefined;
  if (typeof propria === "string" && propria.trim() !== "") {
    return { data: propria, fonte: "esame" };
  }
  return { data: visit.dataVisita, fonte: "visita" };
}

/**
 * Ultimo valore noto di ogni misura, guardando solo le visite **precedenti** a
 * quella in corso.
 *
 * `visite` deve essere ordinato dalla piu' recente alla piu' vecchia (e' l'ordine
 * in cui la pagina della visita le carica). `escludiVisitaId` toglie dal
 * confronto la visita che si sta modificando, altrimenti in modifica ogni campo
 * mostrerebbe se stesso come valore precedente.
 */
export function costruisciPrecedenti(
  visite: Visit[],
  escludiVisitaId?: string,
): MappaPrecedenti {
  const mappa: MappaPrecedenti = {};

  for (const visit of visite) {
    if (escludiVisitaId && visit.id === escludiVisitaId) continue;
    const v = visit.visita;
    if (!v) continue;

    for (const campo of CAMPI_VITALI) {
      const chiave = `visita.${campo}`;
      if (mappa[chiave]) continue;
      const valore = (v as Record<string, unknown>)[campo];
      if (!valoreUtile(valore)) continue;
      mappa[chiave] = { valore, data: visit.dataVisita, fonte: "visita" };
    }

    for (const nome of BLOCCHI_CONFRONTABILI) {
      const blocco = (v as Record<string, unknown>)[nome] as
        | Record<string, unknown>
        | undefined;
      if (!blocco || typeof blocco !== "object") continue;

      for (const [campo, valore] of Object.entries(blocco)) {
        if (CAMPI_ESCLUSI.has(campo)) continue;
        const chiave = `${nome}.${campo}`;
        if (mappa[chiave]) continue;
        if (!valoreUtile(valore)) continue;
        const { data, fonte } = dataDelValore(visit, blocco, CAMPO_DATA_ESAME[nome]);
        mappa[chiave] = { valore, data, fonte };
      }
    }
  }

  return mappa;
}

/** Un valore della serie storica, con la data a cui si riferisce. */
export interface PuntoStorico {
  valore: number;
  /** Data ISO del valore (dell'esame quando ce l'ha, altrimenti della visita). */
  data: string;
  /** Visita da cui proviene, per poterla aprire dal grafico. */
  visitaId: string;
}

/** Serie storiche indicizzate per `blocco.campo`, in ordine cronologico. */
export type MappeSerie = Record<string, PuntoStorico[]>;

/**
 * Tutti i valori numerici di ogni misura lungo le visite del paziente.
 *
 * Serve all'andamento nel tempo: una singola registrazione non dice niente,
 * mentre la traiettoria di ApoB o LDL sotto terapia e' proprio la cosa che il
 * cardiologo guarda al controllo. I valori testuali (ritmo, CAD-RADS) restano
 * fuori: non si possono mettere su un asse.
 *
 * Le date sono quelle dell'esame quando il modulo ne porta una, così un
 * prelievo fatto mesi prima della visita si colloca dove e' stato eseguito.
 */
export function costruisciSerie(
  visite: Visit[],
  escludiVisitaId?: string,
): MappeSerie {
  const serie: MappeSerie = {};

  const aggiungi = (
    chiave: string,
    valore: unknown,
    data: string,
    visitaId: string,
  ) => {
    if (typeof valore !== "number" || !Number.isFinite(valore) || valore === 0) return;
    (serie[chiave] ??= []).push({ valore, data, visitaId });
  };

  for (const visit of visite) {
    if (escludiVisitaId && visit.id === escludiVisitaId) continue;
    const v = visit.visita;
    if (!v) continue;

    for (const campo of CAMPI_VITALI) {
      aggiungi(
        `visita.${campo}`,
        (v as Record<string, unknown>)[campo],
        visit.dataVisita,
        visit.id,
      );
    }

    for (const nome of BLOCCHI_CONFRONTABILI) {
      const blocco = (v as Record<string, unknown>)[nome] as
        | Record<string, unknown>
        | undefined;
      if (!blocco || typeof blocco !== "object") continue;
      const { data } = dataDelValore(visit, blocco, CAMPO_DATA_ESAME[nome]);
      for (const [campo, valore] of Object.entries(blocco)) {
        if (CAMPI_ESCLUSI.has(campo)) continue;
        aggiungi(`${nome}.${campo}`, valore, data, visit.id);
      }
    }
  }

  // Dalla piu' vecchia alla piu' recente: e' il verso in cui si legge un grafico.
  for (const punti of Object.values(serie)) {
    punti.sort((a, b) => a.data.localeCompare(b.data));
  }
  return serie;
}

export interface Variazione {
  /** Differenza rispetto al valore precedente. */
  delta: number;
  /** Delta gia' formattato con segno e virgola decimale (es. "+3,5"). */
  display: string;
  verso: "su" | "giu" | "stabile";
}

/**
 * Variazione fra il valore corrente e quello precedente.
 *
 * Restituisce `null` quando uno dei due non e' numerico: per ritmo o CAD-RADS
 * il confronto e' fra etichette e la differenza non ha senso.
 */
export function variazione(
  corrente: number | string | undefined,
  precedente: number | string | undefined,
): Variazione | null {
  if (typeof corrente !== "number" || typeof precedente !== "number") return null;
  if (!Number.isFinite(corrente) || !Number.isFinite(precedente)) return null;

  const delta = corrente - precedente;
  // Le misure sono salvate con al piu' un decimale: sotto questa soglia la
  // differenza e' rumore di arrotondamento, non un cambiamento.
  if (Math.abs(delta) < 0.05) {
    return { delta: 0, display: "invariato", verso: "stabile" };
  }
  const arrotondato = Math.round(delta * 10) / 10;
  const testo = `${arrotondato > 0 ? "+" : "−"}${Math.abs(arrotondato)
    .toString()
    .replace(".", ",")}`;
  return { delta, display: testo, verso: arrotondato > 0 ? "su" : "giu" };
}

/** Data in forma breve `gg/mm/aa` per stare sotto un campo senza mandarlo a capo. */
export function dataBreve(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/** Quanti mesi interi separano la data indicata da oggi. */
export function mesiDa(iso: string, oggi = new Date()): number | undefined {
  if (!iso) return undefined;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  const mesi =
    (oggi.getFullYear() - d.getFullYear()) * 12 + (oggi.getMonth() - d.getMonth());
  return mesi < 0 ? 0 : mesi;
}

/** Testo esteso per il tooltip: da dove viene il valore precedente e quando. */
export function descriviPrecedente(p: ValorePrecedente): string {
  const quando = dataBreve(p.data);
  const origine = p.fonte === "esame" ? "esame del" : "visita del";
  const mesi = mesiDa(p.data);
  const fa =
    mesi == null || mesi === 0
      ? ""
      : mesi < 12
        ? ` · ${mesi} mes${mesi === 1 ? "e" : "i"} fa`
        : ` · ${Math.floor(mesi / 12)} ann${Math.floor(mesi / 12) === 1 ? "o" : "i"} fa`;
  return `Valore precedente: ${p.valore} — ${origine} ${quando}${fa}`;
}
