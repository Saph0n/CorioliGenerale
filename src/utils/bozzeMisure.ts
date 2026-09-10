/**
 * Bozze dei campi di misura.
 *
 * Un campo numerico della maschera tiene il testo digitato in una bozza finché
 * ha il focus, e lo passa nella visita quando lo perde: così si può scrivere
 * "1," senza che il valore venga riletto e riscritto a metà. Il rovescio è che
 * il valore digitato per ultimo non è ancora nella visita quando si preme
 * "Salva Visita" o "Stampa" senza uscire dal campo, e il salvataggio lo
 * perdeva in silenzio.
 */

/**
 * Numero scritto in un campo di misura, con la virgola o con il punto.
 *
 * `undefined` quando il campo è vuoto o illeggibile: uno zero avrebbe il
 * significato clinico di "misurato e pari a zero".
 */
export function numeroDaBozza(testo: string): number | undefined {
  const t = testo.trim().replace(",", ".");
  if (t === "" || t === ".") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Riporta nella visita le bozze non ancora confermate, come se ogni campo
 * avesse perso il focus.
 *
 * `percorso` dà per ogni chiave di bozza il campo di destinazione, nella forma
 * "blocco.campo". Le chiavi senza percorso e le bozze chiuse (`null`) restano
 * fuori; la visita di partenza non viene modificata.
 */
export function applicaBozze<T extends object>(
  visita: T,
  bozze: Record<string, string | null>,
  percorso: (chiave: string) => string | undefined,
): T {
  let fuori = { ...visita } as unknown as Record<string, unknown>;
  for (const [chiave, bozza] of Object.entries(bozze)) {
    if (bozza === null) continue;
    const [blocco, campo] = (percorso(chiave) ?? "").split(".");
    if (!blocco || !campo) continue;
    const attuale = (fuori[blocco] ?? {}) as Record<string, unknown>;
    fuori = { ...fuori, [blocco]: { ...attuale, [campo]: numeroDaBozza(bozza) } };
  }
  return fuori as unknown as T;
}
