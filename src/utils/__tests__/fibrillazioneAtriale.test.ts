import { describe, expect, it } from "vitest";
import {
  CHADSVASC_MAX,
  FATTORI_CHADSVASC,
  HASBLED_MAX,
  HASBLED_SOGLIA_ALTA,
  calcolaChadsVasc,
  calcolaHasBled,
  puntiEtaChadsVasc,
} from "../fibrillazioneAtriale";

/** Scorciatoia: il punteggio, quando il calcolo e' andato a buon fine. */
function punti(esito: ReturnType<typeof calcolaChadsVasc>): number {
  if (!esito.ok) throw new Error(`atteso un punteggio, ricevuto: ${esito.reason}`);
  return esito.esito.punteggio;
}

describe("punti dell'età nel CHA₂DS₂-VASc", () => {
  it("vale 2 dai 75 anni, 1 fra 65 e 74, 0 sotto", () => {
    expect(puntiEtaChadsVasc(64)).toBe(0);
    expect(puntiEtaChadsVasc(65)).toBe(1);
    expect(puntiEtaChadsVasc(74)).toBe(1);
    expect(puntiEtaChadsVasc(75)).toBe(2);
    expect(puntiEtaChadsVasc(90)).toBe(2);
  });

  it("le due fasce non si sommano fra loro", () => {
    // Un 80enne prende 2 punti, non 3: l'eta' contribuisce una volta sola.
    const esito = calcolaChadsVasc({ eta: 80, sesso: "M", fattori: {} });
    expect(punti(esito)).toBe(2);
  });
});

describe("CHA₂DS₂-VASc", () => {
  it("senza età o sesso non restituisce un punteggio parziale", () => {
    const senzaEta = calcolaChadsVasc({ sesso: "F" });
    expect(senzaEta.ok).toBe(false);
    if (!senzaEta.ok) expect(senzaEta.reason).toContain("data di nascita");

    const senzaSesso = calcolaChadsVasc({ eta: 70 });
    expect(senzaSesso.ok).toBe(false);
    if (!senzaSesso.ok) expect(senzaSesso.reason).toContain("sesso");
  });

  it("l'ictus pregresso vale doppio", () => {
    const conIctus = calcolaChadsVasc({
      eta: 50,
      sesso: "M",
      fattori: { ictus: true },
    });
    expect(punti(conIctus)).toBe(2);
  });

  it("somma i fattori clinici con età e sesso", () => {
    // Donna di 78 anni, iperteso-diabetica con pregresso ictus:
    // 2 (eta') + 1 (ipertensione) + 1 (diabete) + 2 (ictus) + 1 (sesso) = 7.
    const esito = calcolaChadsVasc({
      eta: 78,
      sesso: "F",
      fattori: { ipertensione: true, diabete: true, ictus: true },
    });
    expect(punti(esito)).toBe(7);
  });

  it("raggiunge il massimo di 9 con tutti i fattori presenti", () => {
    const esito = calcolaChadsVasc({
      eta: 80,
      sesso: "F",
      fattori: {
        scompenso: true,
        ipertensione: true,
        diabete: true,
        ictus: true,
        vascolare: true,
      },
    });
    expect(punti(esito)).toBe(CHADSVASC_MAX);
  });

  it("elenca solo le voci che hanno dato punti", () => {
    const esito = calcolaChadsVasc({
      eta: 60,
      sesso: "M",
      fattori: { diabete: true },
    });
    if (!esito.ok) throw new Error("atteso un punteggio");
    expect(esito.esito.voci).toHaveLength(1);
    expect(esito.esito.voci[0].label).toContain("Diabete");
  });

  it("avverte quando il punto arriva dal solo sesso femminile", () => {
    const esito = calcolaChadsVasc({ eta: 50, sesso: "F", fattori: {} });
    if (!esito.ok) throw new Error("atteso un punteggio");
    expect(esito.esito.punteggio).toBe(1);
    // Il punto c'e', ma il profilo e' quello di un uomo a 0: la nota lo dice
    // invece di lasciare che l'1 venga letto come un fattore di rischio.
    expect(esito.esito.nota).toContain("uomo con punteggio 0");
  });

  it("non suggerisce terapie", () => {
    const esito = calcolaChadsVasc({
      eta: 80,
      sesso: "F",
      fattori: { ictus: true, scompenso: true },
    });
    if (!esito.ok) throw new Error("atteso un punteggio");
    expect(esito.esito.nota).not.toMatch(/inizia|prescriv|somministr/i);
    expect(esito.esito.nota).toContain("restano cliniche");
  });
});

describe("HAS-BLED", () => {
  it("senza età non restituisce un punteggio parziale", () => {
    const esito = calcolaHasBled({ fattori: { alcol: true } });
    expect(esito.ok).toBe(false);
  });

  it("l'età entra sopra i 65 anni, non a 65", () => {
    // Soglia diversa da quella del CHA₂DS₂-VASc, dove i 65 compiuti gia'
    // valgono 1 punto.
    const a65 = calcolaHasBled({ eta: 65 });
    const a66 = calcolaHasBled({ eta: 66 });
    if (!a65.ok || !a66.ok) throw new Error("atteso un punteggio");
    expect(a65.esito.punteggio).toBe(0);
    expect(a66.esito.punteggio).toBe(1);
  });

  it("ogni fattore vale 1 punto", () => {
    const esito = calcolaHasBled({
      eta: 40,
      fattori: {
        ipertensioneNonControllata: true,
        funzioneRenale: true,
        funzioneEpatica: true,
      },
    });
    if (!esito.ok) throw new Error("atteso un punteggio");
    expect(esito.esito.punteggio).toBe(3);
  });

  it("ignora l'INR labile se il paziente non è in terapia con warfarin", () => {
    // Un paziente in DOAC non puo' prendere quel punto: darglielo lo
    // sposterebbe artificialmente sopra la soglia.
    const inDoac = calcolaHasBled({
      eta: 40,
      fattori: { inrLabile: true },
      inTao: false,
    });
    const inWarfarin = calcolaHasBled({
      eta: 40,
      fattori: { inrLabile: true },
      inTao: true,
    });
    if (!inDoac.ok || !inWarfarin.ok) throw new Error("atteso un punteggio");
    expect(inDoac.esito.punteggio).toBe(0);
    expect(inWarfarin.esito.punteggio).toBe(1);
  });

  it("marca come alto il punteggio dalla soglia in su", () => {
    const sotto = calcolaHasBled({
      eta: 40,
      fattori: { alcol: true, farmaci: true },
    });
    const soglia = calcolaHasBled({
      eta: 40,
      fattori: { alcol: true, farmaci: true, sanguinamento: true },
    });
    if (!sotto.ok || !soglia.ok) throw new Error("atteso un punteggio");
    expect(sotto.esito.alto).toBe(false);
    expect(soglia.esito.punteggio).toBe(HASBLED_SOGLIA_ALTA);
    expect(soglia.esito.alto).toBe(true);
  });

  it("raggiunge il massimo di 9 con età e tutti i fattori", () => {
    const esito = calcolaHasBled({
      eta: 70,
      inTao: true,
      fattori: {
        ipertensioneNonControllata: true,
        funzioneRenale: true,
        funzioneEpatica: true,
        ictus: true,
        sanguinamento: true,
        inrLabile: true,
        farmaci: true,
        alcol: true,
      },
    });
    if (!esito.ok) throw new Error("atteso un punteggio");
    expect(esito.esito.punteggio).toBe(HASBLED_MAX);
  });

  it("isola i fattori modificabili, che sono il motivo per cui si calcola", () => {
    const esito = calcolaHasBled({
      eta: 70,
      fattori: {
        ipertensioneNonControllata: true,
        alcol: true,
        funzioneRenale: true,
      },
    });
    if (!esito.ok) throw new Error("atteso un punteggio");
    expect(esito.esito.modificabili).toHaveLength(2);
    expect(esito.esito.modificabili.join(" ")).toContain("Ipertensione");
    expect(esito.esito.modificabili.join(" ")).toContain("alcol");
    // La funzione renale alterata non e' modificabile: non compare fra i
    // fattori su cui intervenire.
    expect(esito.esito.modificabili.join(" ")).not.toContain("renale");
  });

  it("un punteggio alto non è un motivo per non anticoagulare", () => {
    const esito = calcolaHasBled({
      eta: 70,
      fattori: { sanguinamento: true, funzioneRenale: true, alcol: true },
    });
    if (!esito.ok) throw new Error("atteso un punteggio");
    expect(esito.esito.alto).toBe(true);
    expect(esito.esito.nota).toContain("Non è un motivo per sospendere");
  });
});

describe("forma delle note", () => {
  it("scrive 'punto' al singolare", () => {
    const hb = calcolaHasBled({ eta: 70 });
    if (!hb.ok) throw new Error("atteso un punteggio");
    expect(hb.esito.nota).toContain("1 punto su 9");
    expect(hb.esito.nota).not.toContain("1 punti");

    const cv = calcolaChadsVasc({ eta: 50, sesso: "M", fattori: { diabete: true } });
    if (!cv.ok) throw new Error("atteso un punteggio");
    expect(cv.esito.nota).toContain("1 punto su 9");
  });
});

describe("origine dei fattori del CHA₂DS₂-VASc", () => {
  it("la tabella resta completa: 9 punti fra tutte le voci", () => {
    // Ipertensione e diabete si spuntano fra i fattori di rischio e non nel
    // modulo FA, ma restano nella tabella: il punteggio e' la sua tabella, e
    // spezzarla renderebbe impossibile verificarla contro la fonte.
    const totale =
      FATTORI_CHADSVASC.reduce((s, f) => s + f.punti, 0) + 2 /* età */ + 1 /* sesso */;
    expect(totale).toBe(CHADSVASC_MAX);
  });

  it("ipertensione e diabete arrivano da fuori il modulo", () => {
    const daFuori = FATTORI_CHADSVASC.filter((f) => f.origine === "fattoriRischio");
    expect(daFuori.map((f) => f.chiave).sort()).toEqual(["diabete", "ipertensione"]);
  });

  it("il calcolo li conta comunque, da qualunque parte arrivino", () => {
    const esito = calcolaChadsVasc({
      eta: 50,
      sesso: "M",
      fattori: { ipertensione: true, diabete: true },
    });
    expect(punti(esito)).toBe(2);
  });
});
