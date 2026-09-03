/**
 * Matematica dell'andamento nel tempo: composizione della serie e proiezione
 * sui punti da disegnare.
 *
 * Sta fuori dal file del grafico perche' e' logica pura e verificabile da
 * sola, senza montare un componente: le scale sono la parte in cui un errore
 * non si vede a occhio ma falsa quello che il medico legge.
 */

import type { PuntoStorico } from "./confrontoMisure";

/** Marcatore della rilevazione che si sta scrivendo adesso. */
export const VISITA_IN_CORSO = "in-corso";

/**
 * Serie da disegnare: lo storico piu' il valore che il medico sta scrivendo.
 *
 * Il punto in corso porta la data della visita aperta, non una data fittizia:
 * l'asse orizzontale e' in scala temporale reale, quindi una data lontana
 * schiaccerebbe tutto lo storico contro il bordo sinistro. Il riordino finale
 * serve ai casi in cui la visita viene retrodatata rispetto all'ultimo esame.
 */
export function serieConCorrente(
  serie: PuntoStorico[],
  corrente: number | undefined,
  dataCorrente: string,
): PuntoStorico[] {
  if (corrente == null || !Number.isFinite(corrente)) return serie;
  const completa = [
    ...serie,
    { valore: corrente, data: dataCorrente, visitaId: VISITA_IN_CORSO },
  ];
  return completa.sort((a, b) => a.data.localeCompare(b.data));
}

/** Punto proiettato nello spazio del disegno. */
interface PuntoDisegno {
  x: number;
  y: number;
  punto: PuntoStorico;
}

/**
 * Proietta la serie dentro un riquadro di larghezza e altezza date.
 *
 * Quando tutti i valori sono uguali la scala verticale sarebbe degenere: in
 * quel caso la linea viene messa a metà altezza, che è il modo onesto di
 * disegnare "non è cambiato niente".
 */
export function proietta(
  serie: PuntoStorico[],
  larghezza: number,
  altezza: number,
  margine: number,
): { punti: PuntoDisegno[]; min: number; max: number } {
  const valori = serie.map((p) => p.valore);
  const min = Math.min(...valori);
  const max = Math.max(...valori);
  const span = max - min;

  const tempi = serie.map((p) => new Date(`${p.data.slice(0, 10)}T12:00:00`).getTime());
  const t0 = Math.min(...tempi);
  const t1 = Math.max(...tempi);
  const durata = t1 - t0;

  const l = larghezza - margine * 2;
  const a = altezza - margine * 2;

  const punti = serie.map((punto, i) => {
    const fx = durata === 0 ? (serie.length === 1 ? 0.5 : i / (serie.length - 1)) : (tempi[i] - t0) / durata;
    const fy = span === 0 ? 0.5 : (punto.valore - min) / span;
    return {
      x: margine + fx * l,
      // L'asse y dello schermo cresce verso il basso: il valore alto sta in alto.
      y: margine + (1 - fy) * a,
      punto,
    };
  });

  return { punti, min, max };
}
