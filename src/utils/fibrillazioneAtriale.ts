/**
 * Fibrillazione atriale: CHA₂DS₂-VASc (rischio tromboembolico) e HAS-BLED
 * (rischio emorragico).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  COSA FA E COSA NON FA
 *
 *  Somma i punti dei fattori che il medico ha selezionato e nomina la fascia.
 *  **Non decide l'anticoagulazione**, in nessuna delle due direzioni: non la
 *  propone quando il CHA₂DS₂-VASc e' alto e non la sconsiglia quando l'HAS-BLED
 *  lo e'. Il secondo punto e' il piu' importante dei due, perche' l'uso
 *  scorretto piu' diffuso dell'HAS-BLED e' proprio negare la terapia a chi ne
 *  avrebbe indicazione: il punteggio serve a **trovare i fattori modificabili**
 *  e a fissare l'intensita' del follow-up, non a escludere un paziente.
 *
 *  Eta' e sesso non sono caselle da spuntare: si ricavano dall'anagrafica, cosi'
 *  non possono contraddire la scheda del paziente.
 *
 *  Fonti: CHA₂DS₂-VASc, Lip et al. 2010; HAS-BLED, Pisters et al. 2010.
 *  Composizione dei fattori come da specifica clinica del referente.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Esito di un punteggio, oppure il motivo per cui non e' calcolabile. */
export type EsitoPunteggio<T> =
  | { ok: true; esito: T }
  | { ok: false; reason: string };

/** Una voce che ha effettivamente contribuito al totale. */
export interface VocePunteggio {
  label: string;
  punti: number;
}

/** "1 punto" / "2 punti": un punteggio di 1 e' frequente e va scritto giusto. */
function punti(n: number): string {
  return n === 1 ? "1 punto" : `${n} punti`;
}

// ─── CHA₂DS₂-VASc ────────────────────────────────────────────────────────────

/**
 * Fattori che il medico dichiara. Eta' e sesso mancano di proposito: arrivano
 * dall'anagrafica.
 */
export type FattoreChadsVasc =
  | "scompenso"
  | "ipertensione"
  | "diabete"
  | "ictus"
  | "vascolare";

/**
 * La tabella completa del punteggio.
 *
 * Resta completa anche se due voci non si spuntano qui: il punteggio **e'** la
 * sua tabella, e spezzarla su due file renderebbe impossibile verificarla
 * contro la fonte. `origine` dice soltanto dove il medico dichiara il fattore.
 */
export const FATTORI_CHADSVASC: {
  chiave: FattoreChadsVasc;
  label: string;
  punti: number;
  /** Cosa conta come positivo, per non lasciare la casella all'interpretazione. */
  nota: string;
  /**
   * `modulo`: casella del modulo FA.
   * `fattoriRischio`: gia' dichiarato fra i fattori di rischio accanto ai
   * parametri, e da li' viene letto — chiederlo due volte permetterebbe di
   * averlo spuntato di la' e no di qua.
   */
  origine: "modulo" | "fattoriRischio";
}[] = [
  {
    chiave: "scompenso",
    label: "Scompenso cardiaco o disfunzione ventricolare sinistra",
    punti: 1,
    nota: "Scompenso clinico o disfunzione sistolica documentata.",
    origine: "modulo",
  },
  {
    chiave: "ipertensione",
    label: "Ipertensione arteriosa",
    punti: 1,
    nota: "Anamnesi di ipertensione, anche se attualmente controllata dalla terapia.",
    origine: "fattoriRischio",
  },
  {
    chiave: "diabete",
    label: "Diabete mellito",
    punti: 1,
    nota: "Diabete noto o in trattamento.",
    origine: "fattoriRischio",
  },
  {
    chiave: "ictus",
    label: "Pregresso ictus, TIA o tromboembolismo",
    punti: 2,
    nota: "Vale doppio: è il predittore più pesante del punteggio.",
    origine: "modulo",
  },
  {
    chiave: "vascolare",
    label: "Malattia vascolare",
    punti: 1,
    nota: "Infarto miocardico pregresso, arteriopatia periferica o placca aortica.",
    origine: "modulo",
  },
];

/** Punti attribuiti dall'eta': 2 dai 75 anni, 1 fra 65 e 74, altrimenti 0. */
export function puntiEtaChadsVasc(eta: number): number {
  if (eta >= 75) return 2;
  if (eta >= 65) return 1;
  return 0;
}

export interface EsitoChadsVasc {
  punteggio: number;
  /** Massimo teorico, per scrivere "4 / 9" invece di un numero solo. */
  massimo: number;
  /** Le voci che hanno dato punti, nell'ordine della tabella. */
  voci: VocePunteggio[];
  /** Lettura della fascia, descrittiva e senza indicazioni terapeutiche. */
  nota: string;
}

/** Massimo teorico del CHA₂DS₂-VASc: 9 punti. */
export const CHADSVASC_MAX = 9;

/**
 * Calcola il CHA₂DS₂-VASc.
 *
 * Senza eta' o sesso non restituisce un numero: mancherebbero fino a 3 punti su
 * 9, e un punteggio incompleto letto come completo e' peggio di nessun
 * punteggio.
 */
export function calcolaChadsVasc(input: {
  eta?: number;
  sesso?: "M" | "F";
  fattori?: Partial<Record<FattoreChadsVasc, boolean>>;
}): EsitoPunteggio<EsitoChadsVasc> {
  const { eta, sesso, fattori = {} } = input;

  if (eta == null || !Number.isFinite(eta) || eta < 0) {
    return {
      ok: false,
      reason:
        "Serve la data di nascita del paziente: l'età vale fino a 2 punti sui 9 del punteggio.",
    };
  }
  if (sesso !== "M" && sesso !== "F") {
    return {
      ok: false,
      reason: "Serve il sesso del paziente: nel CHA₂DS₂-VASc vale 1 punto.",
    };
  }

  const voci: VocePunteggio[] = [];

  const puntiEta = puntiEtaChadsVasc(eta);
  if (puntiEta > 0) {
    voci.push({
      label: puntiEta === 2 ? "Età ≥ 75 anni" : "Età 65-74 anni",
      punti: puntiEta,
    });
  }
  for (const f of FATTORI_CHADSVASC) {
    if (fattori[f.chiave]) voci.push({ label: f.label, punti: f.punti });
  }
  if (sesso === "F") voci.push({ label: "Sesso femminile", punti: 1 });

  const punteggio = voci.reduce((tot, v) => tot + v.punti, 0);

  return {
    ok: true,
    esito: {
      punteggio,
      massimo: CHADSVASC_MAX,
      voci,
      nota: notaChadsVasc(punteggio, sesso),
    },
  };
}

/**
 * Lettura della fascia.
 *
 * Dice dove cade il punteggio e si ferma li'. La riga sul sesso femminile non
 * e' un dettaglio: da sola vale 1 punto e non e' considerata un fattore di
 * rischio indipendente, per cui una donna con 1 punto e un uomo con 0 hanno lo
 * stesso profilo di rischio pur avendo punteggi diversi.
 */
function notaChadsVasc(punteggio: number, sesso: "M" | "F"): string {
  const soloSesso = sesso === "F" && punteggio === 1;
  if (soloSesso) {
    return "Il punto deriva dal solo sesso femminile, che non è considerato un fattore di rischio indipendente: il profilo corrisponde a quello di un uomo con punteggio 0.";
  }
  if (punteggio === 0) {
    return "Nessun fattore di rischio fra quelli del punteggio.";
  }
  return `${punti(punteggio)} su ${CHADSVASC_MAX}. Le linee guida legano a questo punteggio la valutazione dell'indicazione all'anticoagulazione: la decisione, e la scelta del farmaco, restano cliniche.`;
}

// ─── HAS-BLED ────────────────────────────────────────────────────────────────

export type FattoreHasBled =
  | "ipertensioneNonControllata"
  | "funzioneRenale"
  | "funzioneEpatica"
  | "ictus"
  | "sanguinamento"
  | "inrLabile"
  | "farmaci"
  | "alcol";

export const FATTORI_HASBLED: {
  chiave: FattoreHasBled;
  label: string;
  nota: string;
  /** I fattori su cui si puo' intervenire: sono il motivo per cui si calcola. */
  modificabile: boolean;
  /** Ha senso solo per chi e' in terapia con warfarin. */
  soloWarfarin?: boolean;
}[] = [
  {
    chiave: "ipertensioneNonControllata",
    label: "Ipertensione non controllata (PAS > 160 mmHg)",
    nota: "Conta la pressione non controllata, non l'ipertensione in sé.",
    modificabile: true,
  },
  {
    chiave: "funzioneRenale",
    label: "Funzione renale alterata",
    nota: "Dialisi, trapianto renale o creatinina elevata in modo persistente.",
    modificabile: false,
  },
  {
    chiave: "funzioneEpatica",
    label: "Funzione epatica alterata",
    nota: "Epatopatia cronica o alterazione biochimica significativa.",
    modificabile: false,
  },
  {
    chiave: "ictus",
    label: "Ictus pregresso",
    nota: "Presente anche nel CHA₂DS₂-VASc: qui pesa sul versante emorragico.",
    modificabile: false,
  },
  {
    chiave: "sanguinamento",
    label: "Storia di sanguinamento o predisposizione",
    nota: "Emorragia maggiore pregressa, anemia o diatesi emorragica.",
    modificabile: false,
  },
  {
    chiave: "inrLabile",
    label: "INR labile",
    nota: "Solo per chi è in terapia con warfarin: tempo in range terapeutico insufficiente.",
    modificabile: true,
    soloWarfarin: true,
  },
  {
    chiave: "farmaci",
    label: "Farmaci che favoriscono il sanguinamento",
    nota: "Antiaggreganti o FANS in associazione.",
    modificabile: true,
  },
  {
    chiave: "alcol",
    label: "Consumo eccessivo di alcol",
    nota: "Consumo elevato e continuativo.",
    modificabile: true,
  },
];

/** Massimo teorico dell'HAS-BLED: 9 punti, contando anche quello dell'eta'. */
export const HASBLED_MAX = 9;

/** Soglia dalla quale il punteggio e' considerato alto (Pisters 2010). */
export const HASBLED_SOGLIA_ALTA = 3;

export interface EsitoHasBled {
  punteggio: number;
  massimo: number;
  voci: VocePunteggio[];
  /** `true` dal punteggio 3 in su. */
  alto: boolean;
  nota: string;
  /** Fattori selezionati su cui si puo' intervenire, il vero uso del punteggio. */
  modificabili: string[];
}

/**
 * Calcola l'HAS-BLED.
 *
 * Ogni fattore vale 1 punto. L'eta' entra sopra i 65 anni — soglia diversa da
 * quella del CHA₂DS₂-VASc, che parte dai 65 compiuti e distingue la fascia
 * 65-74 dagli over 75.
 *
 * `inTao` filtra la voce sull'INR labile: chi non e' in terapia con warfarin
 * non puo' prendere quel punto, e lasciarlo selezionabile significherebbe
 * gonfiare il punteggio di un paziente in DOAC.
 */
export function calcolaHasBled(input: {
  eta?: number;
  fattori?: Partial<Record<FattoreHasBled, boolean>>;
  inTao?: boolean;
}): EsitoPunteggio<EsitoHasBled> {
  const { eta, fattori = {}, inTao = false } = input;

  if (eta == null || !Number.isFinite(eta) || eta < 0) {
    return {
      ok: false,
      reason:
        "Serve la data di nascita del paziente: oltre i 65 anni l'età vale 1 punto.",
    };
  }

  const voci: VocePunteggio[] = [];
  if (eta > 65) voci.push({ label: "Età > 65 anni", punti: 1 });

  const modificabili: string[] = [];
  for (const f of FATTORI_HASBLED) {
    if (f.soloWarfarin && !inTao) continue;
    if (!fattori[f.chiave]) continue;
    voci.push({ label: f.label, punti: 1 });
    if (f.modificabile) modificabili.push(f.label);
  }

  const punteggio = voci.reduce((tot, v) => tot + v.punti, 0);
  const alto = punteggio >= HASBLED_SOGLIA_ALTA;

  return {
    ok: true,
    esito: {
      punteggio,
      massimo: HASBLED_MAX,
      voci,
      alto,
      modificabili,
      nota: alto
        ? `${punti(punteggio)} su ${HASBLED_MAX}: rischio emorragico alto (soglia ≥ ${HASBLED_SOGLIA_ALTA}). Non è un motivo per sospendere o non iniziare l'anticoagulazione, ma per correggere i fattori modificabili e ravvicinare i controlli.`
        : `${punti(punteggio)} su ${HASBLED_MAX}: sotto la soglia di ${HASBLED_SOGLIA_ALTA} punti. Il punteggio va rivalutato nel tempo, perché diversi fattori cambiano insieme alla terapia.`,
    },
  };
}
