/**
 * Gruppi di ricerca: etichette che il medico assegna ai pazienti per poterli
 * ritrovare tutti insieme (es. "Progetto SCORE2 2026").
 *
 * L'appartenenza è salvata **sul paziente** (`Patient.gruppiRicerca`), come
 * nome del gruppo più la data di arruolamento. Due motivi concreti:
 *
 *  - i backup contengono i pazienti ma non le preferenze: con i dati sul
 *    paziente un ripristino non perde né le assegnazioni né le date;
 *  - l'import in modalità "unione" rimappa gli id dei pazienti; dover rimappare
 *    anche gli id dei gruppi avrebbe aggiunto un punto di rottura a un percorso
 *    già delicato.
 *
 * L'elenco dei gruppi mostrato nei menu è quindi l'unione fra quelli creati in
 * Impostazioni e quelli effettivamente usati dai pazienti: se le preferenze
 * vengono perse, i gruppi ricompaiono da soli dai dati.
 *
 * La durata di un progetto si ricava dalla data di arruolamento più vecchia fra
 * i suoi pazienti: non serve una data di inizio a parte, e il valore resta
 * corretto anche dopo un ripristino da backup.
 */

import type { AppartenenzaGruppo, Patient } from "../types/Storage";

/** Lunghezza massima del nome di un gruppo. */
export const MAX_GRUPPO_LEN = 40;

/** Numero massimo di gruppi assegnabili allo stesso paziente. */
export const MAX_GRUPPI_PER_PAZIENTE = 10;

/** Ripulisce un nome: niente a capo, spazi compattati, lunghezza limitata. */
export function sanitizeGruppo(value: string): string {
  return (value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, MAX_GRUPPO_LEN);
}

/** Chiave di confronto: il confronto fra nomi ignora maiuscole e spaziatura. */
export function gruppoKey(value: string): string {
  return sanitizeGruppo(value).toLocaleLowerCase("it-IT");
}

/** True se i due nomi indicano lo stesso gruppo. */
export function stessoGruppo(a: string, b: string): boolean {
  return gruppoKey(a) === gruppoKey(b);
}

/** True se la stringa è una data ISO `aaaa-mm-gg` valida. */
function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00`);
  return !Number.isNaN(d.getTime());
}

/**
 * Normalizza le appartenenze di un paziente: accetta sia il formato attuale
 * (`{ nome, dal }`) sia il vecchio elenco di sole stringhe, scarta i vuoti,
 * elimina i duplicati (vince la prima grafia, e fra due date vince la più
 * vecchia) e applica il tetto per paziente.
 */
export function normalizeGruppi(values: unknown): AppartenenzaGruppo[] {
  if (!Array.isArray(values)) return [];
  const perKey = new Map<string, AppartenenzaGruppo>();
  for (const raw of values) {
    let nome = "";
    let dal: string | undefined;
    if (typeof raw === "string") {
      nome = sanitizeGruppo(raw);
    } else if (raw && typeof raw === "object") {
      const o = raw as Record<string, unknown>;
      nome = sanitizeGruppo(typeof o.nome === "string" ? o.nome : "");
      if (isIsoDate(o.dal)) dal = o.dal;
    }
    if (!nome) continue;
    const key = gruppoKey(nome);
    const esistente = perKey.get(key);
    if (!esistente) {
      perKey.set(key, dal ? { nome, dal } : { nome });
      continue;
    }
    // Duplicato: tiene la data di arruolamento più vecchia fra le due.
    if (dal && (!esistente.dal || dal < esistente.dal)) {
      perKey.set(key, { ...esistente, dal });
    }
  }
  return [...perKey.values()].slice(0, MAX_GRUPPI_PER_PAZIENTE);
}

/**
 * Normalizza il registro dei gruppi salvato nelle preferenze: solo nomi, senza
 * date (quelle stanno sui pazienti). Tollera valori sporchi e duplicati.
 */
export function normalizeRegistro(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const visti = new Map<string, string>();
  for (const raw of values) {
    const nome = sanitizeGruppo(
      typeof raw === "string"
        ? raw
        : raw && typeof raw === "object" && typeof (raw as { nome?: unknown }).nome === "string"
          ? ((raw as { nome: string }).nome)
          : "",
    );
    if (!nome) continue;
    const key = gruppoKey(nome);
    if (!visti.has(key)) visti.set(key, nome);
  }
  return [...visti.values()];
}

/** Appartenenze del paziente, già normalizzate. */
export function gruppiDelPaziente(
  patient: Pick<Patient, "gruppiRicerca">,
): AppartenenzaGruppo[] {
  return normalizeGruppi(patient.gruppiRicerca);
}

/** Solo i nomi dei gruppi del paziente. */
export function nomiGruppiDelPaziente(
  patient: Pick<Patient, "gruppiRicerca">,
): string[] {
  return gruppiDelPaziente(patient).map((g) => g.nome);
}

/**
 * Elenco completo dei gruppi selezionabili: quelli definiti in Impostazioni più
 * quelli già in uso sui pazienti, ordinati alfabeticamente.
 */
export function elencoGruppi(
  registro: string[],
  patients: Pick<Patient, "gruppiRicerca">[],
): string[] {
  const visti = new Map<string, string>();
  const aggiungi = (raw: string) => {
    const nome = sanitizeGruppo(raw);
    if (!nome) return;
    const key = gruppoKey(nome);
    if (!visti.has(key)) visti.set(key, nome);
  };
  for (const g of registro ?? []) aggiungi(g);
  for (const p of patients ?? []) {
    for (const g of gruppiDelPaziente(p)) aggiungi(g.nome);
  }
  return [...visti.values()].sort((a, b) => a.localeCompare(b, "it-IT"));
}

/** True se il paziente appartiene al gruppo indicato. */
export function pazienteInGruppo(
  patient: Pick<Patient, "gruppiRicerca">,
  gruppo: string,
): boolean {
  const key = gruppoKey(gruppo);
  return gruppiDelPaziente(patient).some((g) => gruppoKey(g.nome) === key);
}

/**
 * Aggiunge un gruppo al paziente registrando la data di arruolamento.
 * No-op se già presente o se si supera il tetto.
 */
export function aggiungiGruppo(
  correnti: AppartenenzaGruppo[],
  gruppo: string,
  dal: string,
): AppartenenzaGruppo[] {
  const nome = sanitizeGruppo(gruppo);
  if (!nome) return normalizeGruppi(correnti);
  const attuali = normalizeGruppi(correnti);
  if (attuali.some((g) => stessoGruppo(g.nome, nome))) return attuali;
  if (attuali.length >= MAX_GRUPPI_PER_PAZIENTE) return attuali;
  return [...attuali, isIsoDate(dal) ? { nome, dal } : { nome }];
}

/** Rimuove un gruppo dal paziente. */
export function rimuoviGruppo(
  correnti: AppartenenzaGruppo[],
  gruppo: string,
): AppartenenzaGruppo[] {
  const key = gruppoKey(gruppo);
  return normalizeGruppi(correnti).filter((g) => gruppoKey(g.nome) !== key);
}

/** Cambia la data di arruolamento in un gruppo già assegnato. */
export function impostaDataArruolamento(
  correnti: AppartenenzaGruppo[],
  gruppo: string,
  dal: string,
): AppartenenzaGruppo[] {
  const key = gruppoKey(gruppo);
  return normalizeGruppi(correnti).map((g) =>
    gruppoKey(g.nome) === key
      ? isIsoDate(dal)
        ? { ...g, dal }
        : { nome: g.nome }
      : g,
  );
}

/** Applica una rinomina alle appartenenze di un paziente. */
export function rinominaInElenco(
  correnti: AppartenenzaGruppo[],
  da: string,
  a: string,
): AppartenenzaGruppo[] {
  const key = gruppoKey(da);
  const nuovo = sanitizeGruppo(a);
  if (!nuovo) return normalizeGruppi(correnti);
  return normalizeGruppi(
    normalizeGruppi(correnti).map((g) =>
      gruppoKey(g.nome) === key ? { ...g, nome: nuovo } : g,
    ),
  );
}

/** Motivo per cui un nome non è utilizzabile, oppure `null` se va bene. */
export function validaNomeGruppo(
  nome: string,
  esistenti: string[],
  nomeOriginale?: string,
): string | null {
  const pulito = sanitizeGruppo(nome);
  if (!pulito) return "Il nome del gruppo non può essere vuoto.";
  const key = gruppoKey(pulito);
  if (nomeOriginale && gruppoKey(nomeOriginale) === key) return null;
  if (esistenti.some((g) => gruppoKey(g) === key)) {
    return "Esiste già un gruppo con questo nome.";
  }
  return null;
}

/**
 * Valore speciale del filtro: "tutti i pazienti che stanno in almeno un
 * gruppo". Viaggia anche nell'URL dell'elenco pazienti (`?gruppo=*`).
 */
export const GRUPPO_QUALSIASI = "*";

/**
 * Applica il filtro per gruppo a un elenco di pazienti.
 * `null` = nessun filtro, `GRUPPO_QUALSIASI` = chi sta in un gruppo qualsiasi.
 */
export function filtraPerGruppo<T extends Pick<Patient, "gruppiRicerca">>(
  patients: T[],
  filtro: string | null,
): T[] {
  if (!filtro) return patients;
  if (filtro === GRUPPO_QUALSIASI) {
    return patients.filter((p) => gruppiDelPaziente(p).length > 0);
  }
  return patients.filter((p) => pazienteInGruppo(p, filtro));
}

// ─── Statistiche di progetto ─────────────────────────────────────────────────

/** Riepilogo di un gruppo, usato dal pannello in dashboard. */
export interface StatoGruppo {
  nome: string;
  /** Pazienti attualmente inclusi. */
  partecipanti: number;
  /** Data di arruolamento più vecchia (ISO), se almeno una è registrata. */
  dataInizio?: string;
  /** Data di arruolamento più recente (ISO). */
  ultimoArruolamento?: string;
  /** Giorni trascorsi dal primo arruolamento, se calcolabile. */
  giorniAttivo?: number;
}

/** Giorni interi trascorsi fra una data ISO e oggi (mai negativi). */
export function giorniDa(iso: string, oggi = new Date()): number | undefined {
  if (!isIsoDate(iso)) return undefined;
  const inizio = new Date(`${iso}T12:00:00`).getTime();
  const fine = new Date(
    `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, "0")}-${String(
      oggi.getDate(),
    ).padStart(2, "0")}T12:00:00`,
  ).getTime();
  return Math.max(0, Math.round((fine - inizio) / 86400000));
}

/**
 * Durata leggibile: "oggi", "3 giorni", "2 mesi", "1 anno e 3 mesi".
 * Sopra l'anno si smette di contare i giorni, che a quel punto non dicono nulla.
 */
export function formattaDurata(giorni: number): string {
  if (giorni <= 0) return "oggi";
  if (giorni === 1) return "1 giorno";
  if (giorni < 30) return `${giorni} giorni`;
  const mesi = Math.floor(giorni / 30);
  if (mesi < 12) return mesi === 1 ? "1 mese" : `${mesi} mesi`;
  const anni = Math.floor(mesi / 12);
  const resto = mesi % 12;
  const parteAnni = anni === 1 ? "1 anno" : `${anni} anni`;
  if (resto === 0) return parteAnni;
  return `${parteAnni} e ${resto === 1 ? "1 mese" : `${resto} mesi`}`;
}

/** Riepilogo di tutti i gruppi, ordinato per numero di partecipanti. */
export function statoGruppi(
  registro: string[],
  patients: Pick<Patient, "gruppiRicerca">[],
  oggi = new Date(),
): StatoGruppo[] {
  const nomi = elencoGruppi(registro, patients);
  const stati = nomi.map((nome) => {
    const key = gruppoKey(nome);
    const date: string[] = [];
    let partecipanti = 0;
    for (const p of patients ?? []) {
      const g = gruppiDelPaziente(p).find((x) => gruppoKey(x.nome) === key);
      if (!g) continue;
      partecipanti += 1;
      if (g.dal) date.push(g.dal);
    }
    date.sort();
    const dataInizio = date[0];
    return {
      nome,
      partecipanti,
      dataInizio,
      ultimoArruolamento: date[date.length - 1],
      giorniAttivo: dataInizio ? giorniDa(dataInizio, oggi) : undefined,
    };
  });
  return stati.sort(
    (a, b) =>
      b.partecipanti - a.partecipanti || a.nome.localeCompare(b.nome, "it-IT"),
  );
}
