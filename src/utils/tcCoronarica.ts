/**
 * TC coronarica: calcium score secondo Agatston e angio-TC con CAD-RADS.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  DUE REGOLE CHE ATTRAVERSANO TUTTO IL FILE
 *
 *  1. **Il punteggio CAC non e' una diagnosi di stenosi.** Un Agatston alto
 *     dice che c'e' calcio, non che c'e' una coronaria chiusa; un Agatston zero
 *     non esclude una placca non calcifica. Per questo la lettura del punteggio
 *     porta sempre con se' `FLAG_INTERPRETATIVO_CAC`, che non e' modificabile.
 *
 *  2. **Niente valori inventati fra due esami.** La progressione si costruisce
 *     solo sui punti realmente misurati: nessuna interpolazione, nessun
 *     intervallo stimato del tipo "50-99", nessuna proiezione in avanti. Vedi
 *     `progressioneCac`.
 *
 *  Fonti: CAD-RADS 2.0; modello a 18 segmenti SCCT; soglie Agatston di uso
 *  comune in refertazione. Composizione dei campi come da specifica del
 *  cardiologo referente.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Avvertenza che accompagna sempre il punteggio CAC.
 *
 * Non e' un testo che il medico possa cambiare o togliere: e' la ragione per
 * cui mostrare un numero di Agatston in un gestionale e' accettabile.
 */
export const FLAG_INTERPRETATIVO_CAC =
  "Il punteggio CAC non equivale automaticamente a stenosi ostruttiva: va integrato con la clinica e, se indicato, con imaging funzionale.";

// ─── Calcium score ───────────────────────────────────────────────────────────

/**
 * Soglia oltre la quale la calcificazione si dice severa.
 *
 * Non e' fissa perche' i centri non concordano: alcuni usano 300, altri 400.
 * E' una impostazione, non una costante, e la categoria dice sempre quale
 * soglia ha applicato — altrimenti due referti con lo stesso Agatston si
 * leggerebbero diversi senza spiegazione.
 */
export type SogliaCacSevera = 300 | 400;

export const SOGLIA_CAC_PREDEFINITA: SogliaCacSevera = 300;

export type CategoriaCac = "assente" | "lieve" | "moderata" | "severa";

export interface EsitoCac {
  categoria: CategoriaCac;
  label: string;
  /** L'intervallo che definisce la categoria, con la soglia applicata. */
  intervallo: string;
  /** Sempre presente: vedi `FLAG_INTERPRETATIVO_CAC`. */
  flag: string;
}

/**
 * Categoria del calcium score.
 *
 * L'Agatston si usa **come e' stato misurato**, senza arrotondamenti: un 99 e
 * un 101 cadono in due categorie diverse, e limarli sarebbe cambiare il
 * referto del radiologo.
 */
export function categoriaCac(
  score: number | undefined,
  soglia: SogliaCacSevera = SOGLIA_CAC_PREDEFINITA,
): EsitoCac | null {
  if (score == null || !Number.isFinite(score) || score < 0) return null;

  const base = { flag: FLAG_INTERPRETATIVO_CAC };
  if (score === 0) {
    return {
      ...base,
      categoria: "assente",
      label: "Calcificazione assente",
      intervallo: "Agatston 0",
    };
  }
  if (score < 100) {
    return {
      ...base,
      categoria: "lieve",
      label: "Calcificazione lieve",
      intervallo: "Agatston 1-99",
    };
  }
  if (score < 300) {
    return {
      ...base,
      categoria: "moderata",
      label: "Calcificazione moderata",
      intervallo: "Agatston 100-299",
    };
  }
  // Fra 300 e 399 la risposta dipende dall'impostazione del centro.
  if (score < soglia) {
    return {
      ...base,
      categoria: "moderata",
      label: "Calcificazione moderata",
      intervallo: `Agatston 100-${soglia - 1} (soglia severa impostata a ${soglia})`,
    };
  }
  return {
    ...base,
    categoria: "severa",
    label: "Calcificazione severa",
    intervallo: `Agatston ≥ ${soglia} (soglia impostata dal centro)`,
  };
}

// ─── Percentile MESA ─────────────────────────────────────────────────────────

/**
 * Interruttore di sicurezza del percentile MESA, sul modello di
 * `SCORE2_COEFFICIENTS_VALIDATED`.
 *
 * Il percentile per eta', sesso ed etnia si legge sulle tabelle di riferimento
 * MESA, che qui non ci sono. Finche' questo resta `false` l'applicazione
 * **non mostra un percentile**: un numero del genere inventato o approssimato
 * sposterebbe un paziente di fascia di rischio, ed e' esattamente il tipo di
 * dato che non si stima a occhio.
 */
export const MESA_PERCENTILI_VALIDATI = false;

export type EsitoPercentileMesa =
  | { ok: true; percentile: number; nota: string }
  | { ok: false; reason: string };

/**
 * Percentile MESA del calcium score.
 *
 * La pipeline c'e' ed e' pronta a ricevere le tabelle; finche' non ci sono,
 * dichiara perche' non risponde invece di rispondere male.
 */
export function percentileMesa(_input: {
  score?: number;
  eta?: number;
  sesso?: "M" | "F";
  etnia?: string;
}): EsitoPercentileMesa {
  if (!MESA_PERCENTILI_VALIDATI) {
    return {
      ok: false,
      reason:
        "Percentile MESA non attivo: le tabelle di riferimento per età, sesso ed etnia devono ancora essere inserite e verificate.",
    };
  }
  // Quando le tabelle ci saranno, il calcolo va qui.
  return { ok: false, reason: "Tabelle MESA non disponibili." };
}

// ─── CAD-RADS ────────────────────────────────────────────────────────────────

export const CAD_RADS_CATEGORIE: { key: string; label: string }[] = [
  { key: "0", label: "CAD-RADS 0 — nessuna placca (0%)" },
  { key: "1", label: "CAD-RADS 1 — minima (1-24%)" },
  { key: "2", label: "CAD-RADS 2 — lieve (25-49%)" },
  { key: "3", label: "CAD-RADS 3 — moderata (50-69%)" },
  { key: "4A", label: "CAD-RADS 4A — severa (70-99%), mono o bivasale" },
  { key: "4B", label: "CAD-RADS 4B — tronco comune ≥ 50% o trivasale ≥ 70%" },
  { key: "5", label: "CAD-RADS 5 — occlusione totale (100%)" },
  { key: "N", label: "CAD-RADS N — non diagnostica" },
];

/** Modificatori CAD-RADS: si applicano in aggiunta alla categoria, anche piu' di uno. */
export type ModificatoreCadRads = "N" | "HRP" | "S" | "G" | "E";

export const MODIFICATORI_CAD_RADS: {
  chiave: ModificatoreCadRads;
  label: string;
  nota: string;
}[] = [
  {
    chiave: "N",
    label: "N — non diagnostico",
    nota: "Segmenti non valutabili per qualità dell'esame.",
  },
  {
    chiave: "HRP",
    label: "HRP — placca ad alto rischio",
    nota: "Rimodellamento positivo, bassa attenuazione, calcificazioni puntiformi, napkin-ring.",
  },
  { chiave: "S", label: "S — stent", nota: "Presenza di stent coronarico." },
  { chiave: "G", label: "G — graft", nota: "Presenza di bypass aortocoronarico." },
  {
    chiave: "E",
    label: "E — eccezioni",
    nota: "Anomalie coronariche o reperti non aterosclerotici.",
  },
];

/**
 * Voce "nessuna menzione" delle tendine del modulo.
 *
 * Una tendina di NextUI, una volta scelta una voce, non si puo' piu' riportare
 * a vuoto: bastava sfiorare il burden di placca perche' il referto uscisse per
 * forza con un valore fra P1 e P4, anche quando il referto radiologico non lo
 * nominava affatto. Serve percio' una voce esplicita che riporti il campo a
 * vuoto, e non puo' essere la stringa vuota: il componente la interpreta come
 * "nessuna selezione" e la riga non risulta cliccabile.
 */
export const SENZA_MENZIONE = "__nessuna__";

/** Etichetta della voce che lascia il campo fuori dal referto. */
export const SENZA_MENZIONE_LABEL = "Nessuna menzione";

/** Burden di placca secondo CAD-RADS, da Agatston, SIS o stima visiva. */
export type BurdenPlacca = "P1" | "P2" | "P3" | "P4";

export const BURDEN_PLACCA: { chiave: BurdenPlacca; label: string }[] = [
  { chiave: "P1", label: "P1 — lieve" },
  { chiave: "P2", label: "P2 — moderato" },
  { chiave: "P3", label: "P3 — severo" },
  { chiave: "P4", label: "P4 — esteso" },
];

/** Esito del FFR-TC quando disponibile. */
export type EsitoFfrCt = "I+" | "I-" | "I±";

export const ESITI_FFR_CT: { chiave: EsitoFfrCt; label: string }[] = [
  { chiave: "I+", label: "I+ — ischemia significativa" },
  { chiave: "I-", label: "I− — assenza di ischemia significativa" },
  { chiave: "I±", label: "I± — risultato borderline" },
];

/**
 * Modello a 18 segmenti coronarici della SCCT.
 *
 * Serve a registrare **quali** segmenti portano placca, non solo il vaso
 * principale: due pazienti con "placca sulla discendente anteriore" possono
 * avere quadri molto diversi a seconda che sia prossimale o distale.
 */
export const SEGMENTI_SCCT: { numero: number; nome: string; vaso: string }[] = [
  { numero: 1, nome: "Coronaria destra prossimale", vaso: "Coronaria destra" },
  { numero: 2, nome: "Coronaria destra media", vaso: "Coronaria destra" },
  { numero: 3, nome: "Coronaria destra distale", vaso: "Coronaria destra" },
  { numero: 4, nome: "Discendente posteriore", vaso: "Coronaria destra" },
  { numero: 5, nome: "Tronco comune", vaso: "Tronco comune" },
  { numero: 6, nome: "Discendente anteriore prossimale", vaso: "Discendente anteriore" },
  { numero: 7, nome: "Discendente anteriore media", vaso: "Discendente anteriore" },
  { numero: 8, nome: "Discendente anteriore distale", vaso: "Discendente anteriore" },
  { numero: 9, nome: "Primo ramo diagonale", vaso: "Discendente anteriore" },
  { numero: 10, nome: "Secondo ramo diagonale", vaso: "Discendente anteriore" },
  { numero: 11, nome: "Circonflessa prossimale", vaso: "Circonflessa" },
  { numero: 12, nome: "Primo ramo marginale ottuso", vaso: "Circonflessa" },
  { numero: 13, nome: "Circonflessa media e distale", vaso: "Circonflessa" },
  { numero: 14, nome: "Secondo ramo marginale ottuso", vaso: "Circonflessa" },
  { numero: 15, nome: "Discendente posteriore sinistra", vaso: "Circonflessa" },
  { numero: 16, nome: "Ramo postero-laterale destro", vaso: "Coronaria destra" },
  { numero: 17, nome: "Ramo intermedio", vaso: "Tronco comune" },
  { numero: 18, nome: "Ramo postero-laterale sinistro", vaso: "Circonflessa" },
];

/** Il segmento corrispondente a un numero, se esiste. */
export function segmentoScct(numero: number) {
  return SEGMENTI_SCCT.find((s) => s.numero === numero) ?? null;
}

/**
 * Controllo di coerenza fra le due componenti della placca.
 *
 * Calcifica e non calcifica sono **due campi distinti** e non un unico valore
 * aggregato, ma restano due quote della stessa placca: se sommano a piu' di
 * 100 uno dei due e' sbagliato, e conviene dirlo mentre si digita.
 */
export function coerenzaComponenti(
  calcifica: number | undefined,
  nonCalcifica: number | undefined,
): string | null {
  const a = calcifica == null || !Number.isFinite(calcifica) ? null : calcifica;
  const b = nonCalcifica == null || !Number.isFinite(nonCalcifica) ? null : nonCalcifica;
  if (a == null && b == null) return null;
  if ((a != null && (a < 0 || a > 100)) || (b != null && (b < 0 || b > 100))) {
    return "Le componenti si esprimono in percentuale, fra 0 e 100.";
  }
  if (a == null || b == null) return null;
  const somma = a + b;
  if (somma > 100.5) {
    return `Le due componenti sommano a ${Math.round(somma)}%: sono quote della stessa placca e non possono superare il 100%.`;
  }
  if (somma < 99.5) {
    return `Le due componenti sommano a ${Math.round(somma)}%: manca un ${Math.round(100 - somma)}% da attribuire.`;
  }
  return null;
}

// ─── Progressione nel tempo ──────────────────────────────────────────────────

/** Un esame realmente eseguito. Niente di questo elenco viene stimato. */
export interface EsameCac {
  /** Agatston misurato. */
  score: number;
  /** Data ISO dell'esame. */
  data: string;
}

export interface VariazioneCac {
  da: EsameCac;
  a: EsameCac;
  /** Differenza assoluta di Agatston. */
  delta: number;
  /**
   * Variazione percentuale, `null` quando il punto di partenza e' zero: da 0 a
   * 40 non e' un aumento "infinito" ne' del 100%, e scrivere una percentuale
   * significherebbe inventarla.
   */
  deltaPercentuale: number | null;
  /** Mesi fra i due esami, per dare la scala del cambiamento. */
  mesi: number | null;
}

/**
 * Variazioni fra esami consecutivi.
 *
 * Calcola **solo** sui valori realmente disponibili: fra due esami distanti tre
 * anni non compare nessun punto intermedio, e la progressione non viene
 * proiettata in avanti. Un grafico che riempie i buchi racconta una malattia
 * che nessuno ha misurato.
 */
export function progressioneCac(esami: EsameCac[]): VariazioneCac[] {
  const validi = esami
    .filter((e) => Number.isFinite(e.score) && e.score >= 0 && !!e.data)
    .sort((x, y) => x.data.localeCompare(y.data));

  const fuori: VariazioneCac[] = [];
  for (let i = 1; i < validi.length; i++) {
    const da = validi[i - 1];
    const a = validi[i];
    const delta = a.score - da.score;
    fuori.push({
      da,
      a,
      delta,
      deltaPercentuale: da.score === 0 ? null : (delta / da.score) * 100,
      mesi: mesiFra(da.data, a.data),
    });
  }
  return fuori;
}

/** Mesi interi fra due date ISO; `null` se una delle due non e' leggibile. */
function mesiFra(daIso: string, aIso: string): number | null {
  const da = new Date(`${daIso.slice(0, 10)}T12:00:00`);
  const a = new Date(`${aIso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(da.getTime()) || Number.isNaN(a.getTime())) return null;
  const mesi =
    (a.getFullYear() - da.getFullYear()) * 12 + (a.getMonth() - da.getMonth());
  return mesi;
}

/** Variazione formattata come si scrive in un referto. */
export function descriviVariazione(v: VariazioneCac): string {
  const segno = v.delta > 0 ? "+" : v.delta < 0 ? "−" : "";
  const assoluto = `${segno}${Math.abs(v.delta)}`;
  const percentuale =
    v.deltaPercentuale == null
      ? "partenza da 0, la variazione percentuale non è definita"
      : `${segno}${Math.abs(Math.round(v.deltaPercentuale))}%`;
  const tempo = v.mesi == null ? "" : ` in ${v.mesi} mesi`;
  return `${assoluto} Agatston (${percentuale})${tempo}`;
}
