/**
 * Schede di consultazione: i quattro pilastri dello scompenso e due farmaci di
 * nicchia (icosapent etile, colchicina).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  COSA FA E COSA NON FA
 *
 *  E' un **prontuario da consultare**, non un suggeritore di terapia. Riporta i
 *  criteri delle linee guida e dice, dei soli criteri che l'applicazione puo'
 *  verificare da sola (trigliceridi, frazione di eiezione, classe di rischio
 *  dichiarata), se il dato inserito ci cade dentro o fuori.
 *
 *  Non conclude mai che un paziente sia "candidato" a un farmaco, e non lo
 *  propone: i criteri che contano davvero — statina ottimizzata e aderenza
 *  verificata, cause secondarie escluse, stabilita' clinica, profilo di
 *  sicurezza — non stanno nei campi di una scheda, e un'applicazione che li
 *  desse per soddisfatti perche' non sa vederli farebbe un danno.
 *
 *  Fonti: criteri ESC come trasmessi dal cardiologo referente.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { CategoriaRischioCv } from "./rischioCv";

/**
 * Stato di un singolo criterio.
 *
 * `da-verificare` non e' un ripiego: e' la maggioranza dei criteri, e dirlo e'
 * il punto. Un criterio che l'applicazione non puo' controllare deve risultare
 * da controllare, non silenziosamente soddisfatto.
 */
export type StatoCriterio = "soddisfatto" | "non-soddisfatto" | "da-verificare";

export interface Criterio {
  label: string;
  stato: StatoCriterio;
  /** Perche' quello stato, oppure cosa deve controllare il medico. */
  nota: string;
}

// ─── Icosapent etile ─────────────────────────────────────────────────────────

/** Finestra di trigliceridi a digiuno dell'indicazione (mg/dL). */
export const TG_ICOSAPENT_MIN = 135;
export const TG_ICOSAPENT_MAX = 499;

/** Classi di rischio in cui l'indicazione e' formulata. */
const RISCHIO_IDONEO_ICOSAPENT: CategoriaRischioCv[] = [
  "alto",
  "molto-alto",
  "molto-alto-ricorrente",
];

/** La finestra dei trigliceridi anche in mmol/L, come la riportano le linee guida. */
export const TG_ICOSAPENT_MIN_MMOL = "1,52";
export const TG_ICOSAPENT_MAX_MMOL = "5,63";

export const SCHEDA_ICOSAPENT = {
  farmaco: "Icosapent etile (EPA altamente purificato)",
  dose: "2 g due volte al giorno, 4 g/die in totale",
  associazione:
    "Sempre in aggiunta alla statina. Non è una monoterapia alternativa alla statina.",
  trigliceridi: `A digiuno ${TG_ICOSAPENT_MIN}-${TG_ICOSAPENT_MAX} mg/dL, cioè ${TG_ICOSAPENT_MIN_MMOL}-${TG_ICOSAPENT_MAX_MMOL} mmol/L.`,
  /**
   * Il passaggio che viene saltato piu' spesso: prima dell'aggiunta di un
   * farmaco vanno affrontati lo stile di vita e le cause secondarie, altrimenti
   * si tratta un valore che si sarebbe abbassato da solo.
   */
  prerequisito:
    "Trigliceridi ancora elevati nonostante il trattamento con statina. Prima vanno affrontati lo stile di vita e le cause secondarie di ipertrigliceridemia.",
  finalita:
    "Riduzione degli eventi cardiovascolari, non il solo abbassamento dei trigliceridi.",
  raccomandazione: "Classe IIa, livello di evidenza B — «dovrebbe essere considerato».",
} as const;

/** Cause secondarie che tengono alti i trigliceridi e vanno cercate prima. */
export const CAUSE_SECONDARIE_IPERTRIGLICERIDEMIA = [
  "Diabete o insulino-resistenza",
  "Obesità viscerale",
  "Alcol",
  "Ipotiroidismo",
  "Malattia renale cronica",
  "Alimentazione ricca di zuccheri semplici",
  "Farmaci che aumentano i trigliceridi",
];

/**
 * Stato dei criteri ESC per l'icosapent etile.
 *
 * Solo i primi due si possono valutare dai campi della visita. Gli altri
 * restano `da-verificare` per costruzione: l'ottimizzazione della statina e le
 * cause secondarie non sono dati che la scheda contiene, e nemmeno il numero di
 * prelievi su cui il valore si ripete.
 */
export function criteriIcosapentEtile(input: {
  trigliceridi?: number;
  categoriaRischio?: CategoriaRischioCv | "";
}): Criterio[] {
  const { trigliceridi, categoriaRischio } = input;
  const criteri: Criterio[] = [];

  // Rischio cardiovascolare
  if (!categoriaRischio) {
    criteri.push({
      label: "Rischio cardiovascolare alto o molto alto",
      stato: "da-verificare",
      nota: "La classe di rischio non è stata attribuita in questa visita.",
    });
  } else {
    const idoneo = RISCHIO_IDONEO_ICOSAPENT.includes(categoriaRischio);
    criteri.push({
      label: "Rischio cardiovascolare alto o molto alto",
      stato: idoneo ? "soddisfatto" : "non-soddisfatto",
      nota: idoneo
        ? "Classe dichiarata in questa visita compatibile con il contesto della raccomandazione."
        : "L'indicazione è formulata per il rischio alto o molto alto.",
    });
  }

  // Trigliceridi
  if (trigliceridi == null || !Number.isFinite(trigliceridi)) {
    criteri.push({
      label: `Trigliceridi a digiuno ${TG_ICOSAPENT_MIN}-${TG_ICOSAPENT_MAX} mg/dL`,
      stato: "da-verificare",
      nota: "Trigliceridi non inseriti nel laboratorio di questa visita.",
    });
  } else {
    const dentro =
      trigliceridi >= TG_ICOSAPENT_MIN && trigliceridi <= TG_ICOSAPENT_MAX;
    criteri.push({
      label: `Trigliceridi a digiuno ${TG_ICOSAPENT_MIN}-${TG_ICOSAPENT_MAX} mg/dL`,
      stato: dentro ? "soddisfatto" : "non-soddisfatto",
      nota: dentro
        ? `${trigliceridi} mg/dL: dentro la finestra. Serve però che il valore sia persistente, non di un singolo prelievo.`
        : trigliceridi < TG_ICOSAPENT_MIN
          ? `${trigliceridi} mg/dL: sotto la finestra dell'indicazione.`
          : `${trigliceridi} mg/dL: sopra la finestra. Oltre i ${TG_ICOSAPENT_MAX} mg/dL il quadro è un altro e va affrontato come tale.`,
    });
  }

  // Criteri che la scheda non puo' vedere.
  criteri.push(
    {
      label: "Trigliceridi persistenti su più prelievi",
      stato: "da-verificare",
      nota: "L'indicazione è per l'ipertrigliceridemia moderata persistente, non per un singolo valore occasionale.",
    },
    {
      label: "Statina già ottimizzata e aderenza verificata",
      stato: "da-verificare",
      nota: "È una terapia aggiuntiva: senza questo passaggio il criterio «nonostante statina» non è soddisfatto.",
    },
    {
      label: "LDL-C valutato rispetto al target",
      stato: "da-verificare",
      nota: "Se fuori target, la terapia LDL-lowering va ottimizzata prima o in parallelo.",
    },
    {
      label: "Cause secondarie di ipertrigliceridemia cercate",
      stato: "da-verificare",
      nota: `Da escludere prima: ${CAUSE_SECONDARIE_IPERTRIGLICERIDEMIA.join(", ").toLowerCase()}.`,
    },
    {
      label: "Storia di fibrillazione o flutter atriale e terapia antitrombotica",
      stato: "da-verificare",
      nota: "Rischio aritmico ed emorragico da valutare individualmente, in particolare con antiaggreganti o anticoagulanti.",
    },
  );

  return criteri;
}

// ─── Icosapent o colchicina ──────────────────────────────────────────────────

/**
 * I due farmaci a confronto.
 *
 * Non sono alternative fra cui scegliere: aggrediscono **rischi residui
 * diversi** — quello lipidico-metabolico e quello aterotrombotico-
 * infiammatorio — e un paziente puo' rientrare in entrambi o in nessuno dei
 * due. La riga sulla prevenzione primaria e' quella che separa davvero i due
 * casi, ed e' il motivo per cui il confronto sta scritto invece di essere
 * lasciato alla memoria.
 */
export const CONFRONTO_FARMACI: {
  aspetto: string;
  icosapent: string;
  colchicina: string;
}[] = [
  {
    aspetto: "Criterio centrale ESC",
    icosapent:
      "Rischio CV alto o molto alto, con trigliceridi a digiuno 135-499 mg/dL nonostante statina",
    colchicina: "Malattia coronarica aterosclerotica nel paziente con sindrome coronarica cronica",
  },
  {
    aspetto: "Prevenzione primaria ad alto rischio",
    icosapent: "Possibile, se soddisfatti i criteri di rischio e di trigliceridi",
    colchicina: "No",
  },
  {
    aspetto: "Coronaropatia documentata",
    icosapent:
      "Tipicamente rischio molto alto: possibile candidato se i trigliceridi sono nella finestra",
    colchicina: "È la popolazione diretta della raccomandazione",
  },
  {
    aspetto: "Dose",
    icosapent: "2 g due volte al giorno",
    colchicina: "0,5 mg una volta al giorno",
  },
  {
    aspetto: "Rischio residuo su cui agisce",
    icosapent: "Lipidico e metabolico",
    colchicina: "Aterotrombotico e infiammatorio",
  },
];

// ─── Classi di rischio ESC/EAS ───────────────────────────────────────────────

/**
 * Criteri delle due classi alte di rischio cardiovascolare.
 *
 * La classe la attribuisce il medico (vedi `rischioCv.ts`), e l'applicazione
 * non la calcola: questi criteri sono qui perche' li abbia sotto gli occhi
 * mentre sceglie, non perche' qualcuno li applichi al posto suo. Serve anche
 * all'icosapent etile, la cui indicazione parte proprio da queste due classi.
 */
export const CRITERI_RISCHIO_ESC: {
  classe: "Rischio molto alto" | "Rischio alto";
  voci: { titolo: string; esempi: string }[];
}[] = [
  {
    classe: "Rischio molto alto",
    voci: [
      {
        titolo: "Malattia aterosclerotica documentata",
        esempi:
          "Sindrome coronarica acuta o infarto pregressi, angina instabile, coronaropatia cronica, angioplastica o bypass, ictus o TIA ischemico, arteriopatia periferica.",
      },
      {
        titolo: "Aterosclerosi significativa all'imaging",
        esempi:
          "Placca significativa a coronarografia o angio-TC; placche carotidee o femorali significative; calcium score marcatamente elevato, se giudicato indicativo di aterosclerosi rilevante.",
      },
      {
        titolo: "Diabete ad alto impatto",
        esempi:
          "Diabete con danno d'organo bersaglio, oppure con almeno tre fattori di rischio maggiori; diabete di tipo 1 a esordio precoce e di durata superiore a 20 anni.",
      },
      {
        titolo: "Insufficienza renale grave",
        esempi: "Filtrato glomerulare < 30 mL/min/1,73 m².",
      },
      {
        titolo: "Rischio calcolato estremo",
        esempi: "SCORE2 o SCORE2-OP ≥ 20% a 10 anni.",
      },
      {
        titolo: "Ipercolesterolemia familiare",
        esempi:
          "Con malattia aterosclerotica, oppure con un altro fattore di rischio maggiore.",
      },
    ],
  },
  {
    classe: "Rischio alto",
    voci: [
      {
        titolo: "Un singolo fattore fortemente elevato",
        esempi:
          "LDL-C > 190 mg/dL, colesterolo totale > 310 mg/dL, pressione ≥ 180/110 mmHg.",
      },
      {
        titolo: "Ipercolesterolemia familiare senza altri fattori maggiori",
        esempi: "In prevenzione primaria.",
      },
      {
        titolo: "Diabete senza danno d'organo",
        esempi:
          "Durata ≥ 10 anni, oppure presenza di almeno un ulteriore fattore di rischio.",
      },
      {
        titolo: "Malattia renale cronica moderata",
        esempi: "Filtrato glomerulare 30-59 mL/min/1,73 m².",
      },
      {
        titolo: "Rischio calcolato elevato",
        esempi: "SCORE2 o SCORE2-OP ≥ 10% e < 20% a 10 anni.",
      },
    ],
  },
];

// ─── Colchicina ──────────────────────────────────────────────────────────────

export const SCHEDA_COLCHICINA = {
  farmaco: "Colchicina a basse dosi",
  dose: "0,5 mg una volta al giorno",
  popolazione:
    "Paziente con sindrome coronarica cronica e malattia coronarica aterosclerotica.",
  finalita:
    "Riduzione di infarto miocardico, ictus e necessità di rivascolarizzazione.",
  raccomandazione: "Classe IIa, livello di evidenza A.",
  posizionamento:
    "Terapia aggiuntiva di prevenzione secondaria. Non sostituisce antiaggregazione, riduzione aggressiva dell'LDL, controllo pressorio, cessazione del fumo e trattamento del diabete.",
} as const;

/** Come si colloca un profilo clinico rispetto all'indicazione. */
export type CollocazioneColchicina = "indicata" | "fuori-indicazione" | "area-grigia";

/**
 * I profili della tabella ESC 2024 sulla sindrome coronarica cronica.
 *
 * Restano un elenco da leggere e non una domanda a cui l'applicazione risponde:
 * distinguere una CCS con CAD aterosclerotica da un'aterosclerosi subclinica
 * e' esattamente il giudizio che la riga "area grigia" dice di non
 * automatizzare.
 */
export const PROFILI_COLCHICINA: {
  profilo: string;
  collocazione: CollocazioneColchicina;
  nota: string;
}[] = [
  {
    profilo: "Malattia coronarica cronica documentata, stabile",
    collocazione: "indicata",
    nota: "Da considerare se il profilo di sicurezza è favorevole.",
  },
  {
    profilo: "Pregresso infarto o sindrome coronarica acuta, ora in fase cronica",
    collocazione: "indicata",
    nota: "Se persiste malattia coronarica aterosclerotica e il paziente è stabilizzato.",
  },
  {
    profilo: "Pregressa angioplastica o bypass per malattia aterosclerotica",
    collocazione: "indicata",
    nota: "Nel contesto della prevenzione secondaria cronica.",
  },
  {
    profilo: "Angina con coronaropatia aterosclerotica documentata",
    collocazione: "indicata",
    nota: "Ostruttiva o non ostruttiva, purché il substrato sia aterosclerotico.",
  },
  {
    profilo: "Ictus ischemico o TIA senza malattia coronarica nota",
    collocazione: "fuori-indicazione",
    nota: "I dati possono suggerire un beneficio sull'ictus, ma la raccomandazione ESC 2024 è coronarica.",
  },
  {
    profilo: "Arteriopatia periferica isolata senza malattia coronarica nota",
    collocazione: "fuori-indicazione",
    nota: "Da sola non costituisce l'indicazione formulata per la sindrome coronarica cronica.",
  },
  {
    profilo: "Diabete o malattia renale cronica senza coronaropatia documentata",
    collocazione: "fuori-indicazione",
    nota: "Non è un'indicazione autonoma a fini di prevenzione cardiovascolare.",
  },
  {
    profilo: "Rischio calcolato alto senza malattia aterosclerotica documentata",
    collocazione: "fuori-indicazione",
    nota: "Non è una terapia di prevenzione primaria basata sul punteggio di rischio.",
  },
  {
    profilo: "Aterosclerosi subclinica all'imaging senza CAD clinicamente definita",
    collocazione: "area-grigia",
    nota: "Non equiparabile in automatico a una sindrome coronarica cronica: decisione individuale, non chiaramente sostenuta dalle linee guida.",
  },
];

// ─── I quattro pilastri dello scompenso ──────────────────────────────────────

/**
 * Applicabilita' di un pilastro alle due fasce di frazione di eiezione.
 *
 * `selettivo` e' la casella che conta: nella FE conservata due dei quattro
 * pilastri non sono terapia prognostica universale, e appiattirli su un "sì"
 * trasformerebbe una tabella in un protocollo.
 */
export type ApplicabilitaPilastro = "si" | "selettivo";

export interface Pilastro {
  classe: string;
  indicazione: string;
  /** FE < 50%. */
  feRidotta: { stato: ApplicabilitaPilastro; nota: string };
  /** FE ≥ 50%. */
  feConservata: { stato: ApplicabilitaPilastro; nota: string };
  /** Quando iniziare. */
  quando: string;
  /** Dose iniziale abituale. */
  doseIniziale: string;
  /** Condizioni essenziali e attenzioni. */
  attenzioni: string;
}

export const PILASTRI_SCOMPENSO: Pilastro[] = [
  {
    classe: "ARNI o ACE-inibitore / sartano",
    indicazione:
      "Scompenso sintomatico a frazione di eiezione ridotta, per ridurre morte cardiovascolare e ospedalizzazioni.",
    feRidotta: {
      stato: "si",
      nota: "Sacubitril/valsartan preferibile quando tollerato; ACE-inibitore o sartano se l'ARNI non è praticabile.",
    },
    feConservata: {
      stato: "selettivo",
      nota: "Non di routine come pilastro: scelta individuale secondo pressione, ischemia, funzione renale e comorbilità.",
    },
    quando:
      "Dopo stabilizzazione clinica. Se il paziente assume un ACE-inibitore, attendere 36 ore dalla sospensione.",
    doseIniziale:
      "Sacubitril/valsartan 24/26 mg due volte al giorno, oppure 49/51 mg se pressione e funzione renale lo consentono.",
    attenzioni:
      "Evitare in caso di angioedema pregresso da ACE-inibitore o sartano, ipotensione significativa, iperkaliemia rilevante o deterioramento renale instabile.",
  },
  {
    classe: "Beta-bloccante con evidenza nello scompenso",
    indicazione:
      "Scompenso a frazione di eiezione ridotta, stabile ed euvolemico. Prognosi nella FE ridotta; altrove, controllo di frequenza, ischemia o fibrillazione atriale.",
    feRidotta: {
      stato: "si",
      nota: "Bisoprololo, carvedilolo o metoprololo succinato.",
    },
    feConservata: {
      stato: "selettivo",
      nota: "Non terapia prognostica universale: si usa per le indicazioni concomitanti — fibrillazione atriale e controllo della frequenza, coronaropatia o angina, post-infarto, ipertensione.",
    },
    quando:
      "Quando il paziente è euvolemico e non ipoperfuso. Non in piena congestione né durante necessità di inotropo endovena.",
    doseIniziale:
      "Bisoprololo 1,25 mg/die; carvedilolo 3,125 mg due volte al giorno; metoprololo succinato 12,5-25 mg/die.",
    attenzioni:
      "Frequenza bassa, blocco atrioventricolare avanzato senza pacemaker, shock o instabilità emodinamica impongono di rinviare o individualizzare.",
  },
  {
    classe: "Antagonista del recettore dei mineralcorticoidi",
    indicazione:
      "Riduzione di morte e ricoveri nello scompenso sintomatico. Richiede potassio e funzione renale adeguati.",
    feRidotta: {
      stato: "si",
      nota: "Spironolattone o eplerenone, se filtrato glomerulare e potassio lo permettono.",
    },
    feConservata: {
      stato: "selettivo",
      nota: "Da considerare secondo fenotipo: ESC 2026 rafforza il ruolo dell'MRA anche nella FE conservata sintomatica, con il finerenone come opzione nel contesto appropriato.",
    },
    quando: "Subito o molto precocemente, se potassio e funzione renale sono idonei.",
    doseIniziale: "Spironolattone 12,5-25 mg/die oppure eplerenone 25 mg/die.",
    attenzioni:
      "In genere da evitare con potassio ≥ 5,0 mmol/L o filtrato ≤ 30 mL/min/1,73 m². Monitoraggio ravvicinato di potassio e creatinina.",
  },
  {
    classe: "Inibitore di SGLT2",
    indicazione:
      "Riduzione di ospedalizzazione per scompenso e morte cardiovascolare, indipendentemente dalla presenza di diabete.",
    feRidotta: {
      stato: "si",
      nota: "Dapagliflozin 10 mg/die oppure empagliflozin 10 mg/die.",
    },
    feConservata: {
      stato: "si",
      nota: "Evidenza e raccomandazione forte anche nella frazione di eiezione conservata.",
    },
    quando: "Precocemente, anche in assenza di diabete. Non richiede titolazione.",
    doseIniziale: "Dapagliflozin 10 mg/die oppure empagliflozin 10 mg/die.",
    attenzioni:
      "Valutare volemia e rischio di infezioni genitali. Nel diabete, educare sulla chetoacidosi e sulla sospensione temporanea durante digiuno, chirurgia o malattia acuta.",
  },
];

/**
 * Nota sull'applicabilita' dei pilastri alla frazione di eiezione inserita.
 *
 * Restituisce `null` senza FE: senza quel numero non si sa quale delle due
 * colonne della tabella leggere, e mostrarle come se fossero equivalenti
 * sarebbe peggio che non mostrare nulla.
 */
export function colonnaPilastri(
  fe: number | undefined,
): { chiave: "feRidotta" | "feConservata"; titolo: string } | null {
  if (fe == null || !Number.isFinite(fe) || fe <= 0 || fe > 100) return null;
  return fe < 50
    ? { chiave: "feRidotta", titolo: "FE < 50% — frazione di eiezione ridotta" }
    : { chiave: "feConservata", titolo: "FE ≥ 50% — frazione di eiezione conservata" };
}
