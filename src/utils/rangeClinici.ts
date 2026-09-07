/**
 * Semafori descrittivi sulle misure della visita cardiologica.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  COSA FA E COSA NON FA
 *
 *  Segnala che un valore cade fuori dai limiti di riferimento e dice **quale**
 *  limite ha superato. Non stratifica il rischio del paziente, non suggerisce
 *  terapie e non stabilisce dosaggi: sono decisioni che dipendono dal quadro
 *  complessivo e restano del medico. Un valore isolato fuori range su un
 *  paziente compensato e uno su un paziente diabetico e iperteso hanno lo
 *  stesso colore qui, e significati clinici diversi in ambulatorio.
 *
 *  Per questo ogni soglia porta con se' la sua etichetta ("BAV di I grado",
 *  "FE lievemente ridotta"): il colore serve a far trovare il valore
 *  nell'elenco, il testo a dire perche' e' stato marcato.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Livello del semaforo. `nella-norma` non viene mostrato: colorare di verde
 * ogni casella corretta trasformerebbe il modulo in un albero di Natale e
 * toglierebbe risalto proprio ai valori che vanno guardati.
 */
export type LivelloSegnale = "nella-norma" | "attenzione" | "alterato";

export interface Segnale {
  livello: LivelloSegnale;
  /** Perche' e' segnalato, con la soglia di riferimento. */
  nota: string;
  /**
   * Nome breve della fascia ("borderline", "sfavorevole"), per le tabelle
   * compatte dove una frase intera per riga sarebbe un muro di testo. La
   * `nota` per esteso resta disponibile nel tooltip.
   */
  etichetta?: string;
}

/** Sesso del paziente, dove la soglia ne dipende. */
export type Sesso = "M" | "F" | undefined;

const norma: Segnale = { livello: "nella-norma", nota: "" };

/**
 * Variante "nella norma" con un testo: serve dove il valore viene mostrato
 * comunque (il riquadro del BMI, per esempio) e la fascia va nominata anche
 * quando e' quella giusta. Nell'elenco dei valori segnalati resta esclusa.
 */
function nellaNorma(nota: string, etichetta?: string): Segnale {
  return { livello: "nella-norma", nota, etichetta };
}

function attenzione(nota: string, etichetta?: string): Segnale {
  return { livello: "attenzione", nota, etichetta };
}

function alterato(nota: string, etichetta?: string): Segnale {
  return { livello: "alterato", nota, etichetta };
}

/** Chiavi delle misure con una soglia di riferimento definita. */
export type ChiaveMisura =
  | "ecg.pr"
  | "ecg.qrs"
  | "ecg.qtc"
  | "eco.fe"
  | "eco.siv"
  | "eco.pp"
  | "eco.atrioSinistro"
  | "eco.aortaAscendente"
  | "eco.tapse"
  | "eco.paps"
  | "eco.rapportoEe"
  | "lab.ldl"
  | "lab.ctHdl"
  | "lab.tgHdl"
  | "lab.apoB"
  | "lab.lpa"
  | "lab.trigliceridi"
  | "lab.glicemia"
  | "lab.hba1c"
  | "lab.egfr"
  | "lab.albuminuria"
  | "lab.emoglobina"
  | "lab.ast"
  | "lab.alt"
  | "lab.uricemia"
  | "lab.tsh"
  | "vitali.frequenzaCardiaca"
  | "vitali.bmi";

/**
 * Valuta una misura rispetto ai limiti di riferimento correnti.
 *
 * Restituisce sempre un `Segnale`: quando il valore manca o e' nella norma il
 * livello e' `nella-norma` e chi disegna non mostra nulla.
 */
export function valutaMisura(
  chiave: ChiaveMisura,
  valore: number | undefined,
  sesso: Sesso = undefined,
): Segnale {
  if (valore == null || !Number.isFinite(valore)) return norma;
  const n = Number(valore);

  switch (chiave) {
    // ── Elettrocardiogramma ─────────────────────────────────────────────────
    case "ecg.pr":
      if (n > 200) return attenzione("PR > 200 ms: BAV di I grado");
      if (n < 120) return attenzione("PR < 120 ms: conduzione accelerata");
      return norma;

    case "ecg.qrs":
      if (n >= 120) return attenzione("QRS ≥ 120 ms: ritardo di conduzione intraventricolare");
      return norma;

    case "ecg.qtc": {
      // Soglie ESC/AHA per il QT corretto: il limite femminile e' piu' alto.
      const limite = sesso === "F" ? 460 : 450;
      if (n >= 500) return alterato("QTc ≥ 500 ms: prolungamento marcato");
      if (n > limite) return attenzione(`QTc > ${limite} ms: prolungato`);
      if (n < 340) return attenzione("QTc < 340 ms: QT corto");
      return norma;
    }

    // ── Ecocardiogramma ─────────────────────────────────────────────────────
    case "eco.fe":
      // Il 40 sta nella fascia ridotta, non in quella di mezzo: e' il confine
      // che ESC 2021 usa per definire HFrEF, e su cui si decide il fenotipo
      // dello scompenso (vedi `scompenso.ts`).
      if (n <= 40) return alterato("FE ≤ 40%: funzione sistolica ridotta");
      if (n < 50) return attenzione("FE 41-49%: funzione sistolica lievemente ridotta");
      if (n > 70) return attenzione("FE > 70%: ipercinesia");
      return norma;

    case "eco.siv":
    case "eco.pp": {
      // Limiti superiori di normalita' degli spessori parietali (ASE/EACVI).
      const limite = sesso === "F" ? 9 : 10;
      if (n > limite + 6) return alterato(`> ${limite + 6} mm: ipertrofia severa`);
      if (n > limite) return attenzione(`> ${limite} mm: spessore aumentato`);
      return norma;
    }

    case "eco.atrioSinistro":
      if (n > 45) return alterato("> 45 mm: dilatazione atriale marcata");
      if (n > 40) return attenzione("> 40 mm: atrio sinistro dilatato");
      return norma;

    case "eco.aortaAscendente":
      if (n >= 45) return alterato("≥ 45 mm: dilatazione da sorvegliare");
      if (n > 40) return attenzione("> 40 mm: aorta ascendente dilatata");
      return norma;

    case "eco.tapse":
      if (n < 17) return attenzione("TAPSE < 17 mm: funzione del ventricolo destro ridotta");
      return norma;

    case "eco.paps":
      if (n > 50) return alterato("> 50 mmHg: PAPs elevata");
      if (n > 35) return attenzione("> 35 mmHg: PAPs ai limiti superiori");
      return norma;

    case "eco.rapportoEe":
      if (n > 14) return attenzione("E/e' > 14: pressioni di riempimento elevate");
      return norma;

    // ── Laboratorio ─────────────────────────────────────────────────────────
    case "lab.ldl":
      // Soglia generica: l'obiettivo terapeutico dipende dalla categoria di
      // rischio e non viene deciso qui.
      if (n >= 190) {
        return alterato("LDL ≥ 190 mg/dL: ipercolesterolemia marcata", "marcata");
      }
      if (n >= 115) {
        return attenzione(
          "LDL ≥ 115 mg/dL: sopra il riferimento generale",
          "sopra riferimento",
        );
      }
      return norma;

    case "lab.ctHdl":
      // Fasce indicate dal cardiologo: < 4 ottimale, 4-5 borderline, > 5 a
      // rischio. Il rapporto descrive il profilo lipidico, non stratifica il
      // rischio del paziente.
      if (n > 5) return alterato("> 5: profilo lipidico sfavorevole", "sfavorevole");
      if (n >= 4) return attenzione("4-5: profilo lipidico borderline", "borderline");
      return norma;

    case "lab.tgHdl":
      // Valgono per valori in mg/dL: in mmol/L le fasce sono altre.
      if (n > 3.5) {
        return alterato(
          "> 3,5: suggestivo di insulino-resistenza e LDL piccole e dense",
          "a rischio",
        );
      }
      if (n >= 2) return attenzione("2-3,5: fascia intermedia", "intermedio");
      return norma;

    case "lab.apoB":
      // Senza la classe di rischio dichiarata dal medico l'ApoB non ha una
      // soglia propria: il confronto con l'obiettivo si fa in `rischioCv.ts`.
      // Qui resta solo il limite oltre il quale il dato e' comunque elevato.
      if (n >= 130) return attenzione("≥ 130 mg/dL: ApoB elevata");
      return norma;

    case "lab.lpa":
      if (n > 180) {
        return alterato(
          "> 180 mg/dL: rischio molto elevato, paragonabile all'ipercolesterolemia familiare eterozigote",
        );
      }
      if (n >= 50) return attenzione("≥ 50 mg/dL: sopra il riferimento comune");
      return norma;

    case "lab.trigliceridi":
      if (n >= 500) return alterato("≥ 500 mg/dL: ipertrigliceridemia severa");
      if (n >= 150) return attenzione("≥ 150 mg/dL: ipertrigliceridemia");
      return norma;

    case "lab.glicemia":
      if (n >= 126) return alterato("≥ 126 mg/dL a digiuno: soglia diagnostica di diabete");
      if (n >= 100) return attenzione("100-125 mg/dL: alterata glicemia a digiuno");
      if (n < 70) return attenzione("< 70 mg/dL: sotto il limite inferiore di norma");
      return norma;

    case "lab.hba1c":
      if (n >= 6.5) return alterato("≥ 6,5%: soglia diagnostica di diabete");
      if (n >= 5.7) return attenzione("5,7-6,4%: disglicemia");
      return norma;

    case "lab.egfr":
      if (n < 30) {
        return alterato("eGFR < 30: insufficienza renale severa (G4-G5)", "severa");
      }
      if (n < 60) return attenzione("eGFR < 60: funzione renale ridotta (G3)", "ridotta");
      return norma;

    case "lab.albuminuria":
      if (n >= 300) return alterato("≥ 300 mg/g: albuminuria marcata (A3)");
      if (n >= 30) return attenzione("≥ 30 mg/g: albuminuria moderata (A2)");
      return norma;

    case "lab.emoglobina": {
      const limite = sesso === "F" ? 12 : 13;
      if (n < limite - 2) return alterato(`< ${limite - 2} g/dL: anemia di grado rilevante`);
      if (n < limite) return attenzione(`< ${limite} g/dL: anemia`);
      return norma;
    }

    case "lab.ast":
    case "lab.alt":
      // Range indicativo: ogni laboratorio pubblica il proprio, ed e' quello
      // che fa fede sul referto cartaceo.
      if (n > 120) return alterato("> 120 U/L: aumento marcato delle transaminasi");
      if (n > 40) return attenzione("> 40 U/L: sopra il riferimento indicativo");
      return norma;

    case "lab.uricemia": {
      const limite = sesso === "F" ? 6.0 : 7.2;
      const minimo = sesso === "F" ? 2.6 : 3.5;
      if (n > limite) return attenzione(`> ${limite} mg/dL: iperuricemia`);
      if (n < minimo) return attenzione(`< ${minimo} mg/dL: sotto il riferimento`);
      return norma;
    }

    case "lab.tsh":
      if (n > 10) return alterato("> 10 mU/L: marcatamente elevato");
      if (n > 4) return attenzione("> 4 mU/L: sopra il riferimento indicativo");
      if (n < 0.4) return attenzione("< 0,4 mU/L: sotto il riferimento indicativo");
      return norma;

    // ── Parametri vitali ────────────────────────────────────────────────────
    case "vitali.bmi":
      // Fasce OMS per l'adulto. Il BMI non distingue massa magra e massa
      // grassa: in un soggetto molto muscoloso o in presenza di edemi la
      // fascia va letta con l'occhio clinico, non presa alla lettera.
      if (n >= 40) return alterato("BMI ≥ 40: obesità di III grado", "obesità III");
      if (n >= 35) return alterato("BMI 35-39,9: obesità di II grado", "obesità II");
      if (n >= 30) return alterato("BMI 30-34,9: obesità di I grado", "obesità I");
      if (n >= 25) return attenzione("BMI 25-29,9: sovrappeso", "sovrappeso");
      if (n >= 18.5) return nellaNorma("BMI 18,5-24,9: normopeso", "normopeso");
      if (n >= 16) return attenzione("BMI 16-18,4: sottopeso", "sottopeso");
      return alterato("BMI < 16: sottopeso grave", "sottopeso grave");

    case "vitali.frequenzaCardiaca":
      if (n > 100) return attenzione("> 100 bpm: tachicardia");
      if (n < 50) return attenzione("< 50 bpm: bradicardia");
      return norma;

    default:
      return norma;
  }
}

/** Pressione arteriosa: la soglia si applica alla coppia, non al singolo valore. */
export function valutaPressione(
  sistolica: number | undefined,
  diastolica: number | undefined,
): Segnale {
  const s = sistolica != null && Number.isFinite(sistolica) ? sistolica : null;
  const d = diastolica != null && Number.isFinite(diastolica) ? diastolica : null;
  if (s == null && d == null) return norma;

  // Classificazione ESC: basta che uno dei due superi la soglia.
  if ((s ?? 0) >= 180 || (d ?? 0) >= 110) {
    return alterato("≥ 180/110 mmHg: ipertensione di grado 3");
  }
  if ((s ?? 0) >= 160 || (d ?? 0) >= 100) {
    return alterato("≥ 160/100 mmHg: ipertensione di grado 2");
  }
  if ((s ?? 0) >= 140 || (d ?? 0) >= 90) {
    return attenzione("≥ 140/90 mmHg: ipertensione di grado 1");
  }
  if ((s ?? 0) >= 130 || (d ?? 0) >= 85) {
    return attenzione("130-139/85-89 mmHg: pressione normale-alta");
  }
  if (s != null && s < 90) return attenzione("< 90 mmHg: ipotensione");
  return norma;
}

/** Scompone "130/85" nei due valori; restituisce `undefined` per i pezzi assenti. */
export function scomponiPressione(pa: string | undefined): {
  sistolica?: number;
  diastolica?: number;
} {
  const m = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec((pa ?? "").trim());
  if (!m) return {};
  const sistolica = parseInt(m[1], 10);
  const diastolica = parseInt(m[2], 10);
  return {
    sistolica: Number.isFinite(sistolica) ? sistolica : undefined,
    diastolica: Number.isFinite(diastolica) ? diastolica : undefined,
  };
}

/**
 * Riepilogo dei valori segnalati in tutta la visita, per il pannello di sintesi.
 * L'ordine e' quello di inserimento: i moduli sono gia' in ordine clinico.
 */
export interface VoceSegnalata {
  etichetta: string;
  valore: string;
  segnale: Segnale;
}

/** Tiene solo le voci effettivamente fuori range, alterate prima. */
export function ordinaSegnalati(voci: VoceSegnalata[]): VoceSegnalata[] {
  const peso: Record<LivelloSegnale, number> = {
    alterato: 0,
    attenzione: 1,
    "nella-norma": 2,
  };
  return voci
    .filter((v) => v.segnale.livello !== "nella-norma")
    .sort((a, b) => peso[a.segnale.livello] - peso[b.segnale.livello]);
}
