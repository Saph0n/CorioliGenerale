import { describe, expect, it } from "vitest";
import type { Visit } from "../../types/Storage";
import {
  costruisciPrecedenti,
  costruisciSerie,
  dataBreve,
  descriviPrecedente,
  mesiDa,
  variazione,
} from "../confrontoMisure";

/** Visita minima con il solo contenuto clinico che serve al confronto. */
function visita(
  id: string,
  dataVisita: string,
  contenuto: NonNullable<Visit["visita"]>,
): Visit {
  return {
    id,
    patientId: "p1",
    dataVisita,
    descrizioneClinica: "",
    anamnesi: "",
    esamiObiettivo: "",
    conclusioniDiagnostiche: "",
    terapie: "",
    visita: contenuto,
    createdAt: `${dataVisita}T10:00:00.000Z`,
    updatedAt: `${dataVisita}T10:00:00.000Z`,
  } as Visit;
}

const vuota = {
  problemaClinico: "",
  prestazione: "",
  esameObiettivo: "",
  accertamenti: "",
  terapiaSpecifica: "",
} as NonNullable<Visit["visita"]>;

describe("mappa dei valori precedenti", () => {
  it("prende il valore piu' recente fra quelli disponibili", () => {
    const visite = [
      visita("v3", "2026-06-01", { ...vuota, ecocardiogramma: { fe: 55 } }),
      visita("v2", "2025-06-01", { ...vuota, ecocardiogramma: { fe: 60 } }),
      visita("v1", "2024-06-01", { ...vuota, ecocardiogramma: { fe: 65 } }),
    ];
    const mappa = costruisciPrecedenti(visite);
    expect(mappa["ecocardiogramma.fe"]).toEqual({
      valore: 55,
      data: "2026-06-01",
      fonte: "visita",
    });
  });

  it("scende alla visita precedente per le misure non ripetute", () => {
    const visite = [
      visita("v2", "2026-06-01", { ...vuota, ecocardiogramma: { fe: 55 } }),
      visita("v1", "2025-06-01", {
        ...vuota,
        ecocardiogramma: { fe: 60, tapse: 22 },
      }),
    ];
    const mappa = costruisciPrecedenti(visite);
    expect(mappa["ecocardiogramma.fe"].valore).toBe(55);
    expect(mappa["ecocardiogramma.tapse"]).toEqual({
      valore: 22,
      data: "2025-06-01",
      fonte: "visita",
    });
  });

  it("esclude la visita che si sta modificando", () => {
    const visite = [
      visita("in-corso", "2026-06-01", { ...vuota, ecocardiogramma: { fe: 55 } }),
      visita("v1", "2025-06-01", { ...vuota, ecocardiogramma: { fe: 60 } }),
    ];
    const mappa = costruisciPrecedenti(visite, "in-corso");
    expect(mappa["ecocardiogramma.fe"].valore).toBe(60);
  });

  it("data l'esame con la sua data quando ce l'ha, non con quella della visita", () => {
    const visite = [
      visita("v1", "2026-06-01", {
        ...vuota,
        laboratorio: { dataPrelievo: "2026-04-12", colesteroloTotale: 210 },
      }),
    ];
    const mappa = costruisciPrecedenti(visite);
    expect(mappa["laboratorio.colesteroloTotale"]).toEqual({
      valore: 210,
      data: "2026-04-12",
      fonte: "esame",
    });
  });

  it("ripiega sulla data della visita quando l'esame non ne porta una", () => {
    const visite = [
      visita("v1", "2026-06-01", {
        ...vuota,
        laboratorio: { colesteroloTotale: 210 },
      }),
    ];
    expect(mappaDi(visite)["laboratorio.colesteroloTotale"].fonte).toBe("visita");
  });

  it("ignora referti, date e struttura: non sono misure da confrontare", () => {
    const visite = [
      visita("v1", "2026-06-01", {
        ...vuota,
        tcCoronarica: {
          dataEsame: "2026-05-01",
          struttura: "Ospedale X",
          referto: "Placca calcifica prossimale.",
          cacScore: 120,
        },
      }),
    ];
    const mappa = mappaDi(visite);
    expect(mappa["tcCoronarica.cacScore"].valore).toBe(120);
    expect(mappa["tcCoronarica.referto"]).toBeUndefined();
    expect(mappa["tcCoronarica.struttura"]).toBeUndefined();
    expect(mappa["tcCoronarica.dataEsame"]).toBeUndefined();
  });

  it("tiene i valori testuali confrontabili, come il ritmo", () => {
    const visite = [
      visita("v1", "2026-06-01", {
        ...vuota,
        ecg: { ritmo: "fibrillazione atriale" },
      }),
    ];
    expect(mappaDi(visite)["ecg.ritmo"].valore).toBe("fibrillazione atriale");
  });

  it("include i parametri vitali della visita", () => {
    const visite = [
      visita("v1", "2026-06-01", {
        ...vuota,
        pesoCorporeo: 82,
        pressioneArteriosa: "140/85",
        frequenzaCardiaca: "72",
      }),
    ];
    const mappa = mappaDi(visite);
    expect(mappa["visita.pesoCorporeo"].valore).toBe(82);
    expect(mappa["visita.pressioneArteriosa"].valore).toBe("140/85");
  });

  it("salta i valori vuoti e gli zeri, che significano 'non misurato'", () => {
    const visite = [
      visita("v2", "2026-06-01", {
        ...vuota,
        pesoCorporeo: 0,
        ecocardiogramma: { fe: undefined },
      }),
      visita("v1", "2025-06-01", { ...vuota, pesoCorporeo: 80 }),
    ];
    const mappa = mappaDi(visite);
    expect(mappa["visita.pesoCorporeo"].valore).toBe(80);
    expect(mappa["ecocardiogramma.fe"]).toBeUndefined();
  });

  it("non si rompe sulle visite senza contenuto clinico", () => {
    const senzaVisita = {
      id: "v0",
      patientId: "p1",
      dataVisita: "2024-01-01",
      descrizioneClinica: "",
      anamnesi: "",
      esamiObiettivo: "",
      conclusioniDiagnostiche: "",
      terapie: "",
      createdAt: "2024-01-01T10:00:00.000Z",
      updatedAt: "2024-01-01T10:00:00.000Z",
    } as Visit;
    expect(() => costruisciPrecedenti([senzaVisita])).not.toThrow();
    expect(costruisciPrecedenti([senzaVisita])).toEqual({});
  });
});

function mappaDi(visite: Visit[]) {
  return costruisciPrecedenti(visite);
}

describe("variazione fra due misure", () => {
  it("calcola la differenza e la direzione", () => {
    expect(variazione(58, 52)).toMatchObject({ verso: "su", display: "+6" });
    expect(variazione(52, 58)).toMatchObject({ verso: "giu", display: "−6" });
  });

  it("tratta come invariate le differenze sotto il decimo", () => {
    expect(variazione(55.01, 55)).toMatchObject({ verso: "stabile" });
  });

  it("usa la virgola come separatore decimale", () => {
    expect(variazione(1.5, 1.2)?.display).toBe("+0,3");
  });

  it("non confronta i valori testuali", () => {
    expect(variazione("sinusale", "fibrillazione atriale")).toBeNull();
    expect(variazione(60, undefined)).toBeNull();
  });
});

describe("formattazione delle date del confronto", () => {
  it("scrive la data in forma breve", () => {
    expect(dataBreve("2026-04-12")).toBe("12/04/26");
  });

  it("regge una data assente o malformata", () => {
    expect(dataBreve("")).toBe("");
    expect(dataBreve("non-una-data")).toBe("");
  });

  it("conta i mesi trascorsi", () => {
    const oggi = new Date("2026-09-02T12:00:00");
    expect(mesiDa("2026-06-02", oggi)).toBe(3);
    expect(mesiDa("2024-09-02", oggi)).toBe(24);
  });

  it("descrive origine e distanza nel tempo del valore precedente", () => {
    const testo = descriviPrecedente({
      valore: 55,
      data: "2026-04-12",
      fonte: "esame",
    });
    expect(testo).toContain("55");
    expect(testo).toContain("esame del");
    expect(testo).toContain("12/04/26");
  });
});

describe("serie storica per l'andamento nel tempo", () => {
  it("raccoglie tutte le rilevazioni, dalla piu' vecchia alla piu' recente", () => {
    const visite = [
      visita("v3", "2026-06-01", { ...vuota, laboratorio: { apoB: 78 } }),
      visita("v2", "2025-06-01", { ...vuota, laboratorio: { apoB: 96 } }),
      visita("v1", "2024-06-01", { ...vuota, laboratorio: { apoB: 130 } }),
    ];
    const serie = costruisciSerie(visite)["laboratorio.apoB"];
    expect(serie.map((p) => p.valore)).toEqual([130, 96, 78]);
    expect(serie.map((p) => p.data)).toEqual([
      "2024-06-01",
      "2025-06-01",
      "2026-06-01",
    ]);
  });

  it("data ogni punto con la data del prelievo quando c'e'", () => {
    const visite = [
      visita("v2", "2026-06-01", {
        ...vuota,
        laboratorio: { dataPrelievo: "2026-05-02", apoB: 80 },
      }),
      visita("v1", "2025-06-01", {
        ...vuota,
        laboratorio: { dataPrelievo: "2025-04-10", apoB: 110 },
      }),
    ];
    const serie = costruisciSerie(visite)["laboratorio.apoB"];
    expect(serie.map((p) => p.data)).toEqual(["2025-04-10", "2026-05-02"]);
  });

  it("tiene traccia della visita di provenienza di ogni punto", () => {
    const visite = [
      visita("recente", "2026-06-01", { ...vuota, ecocardiogramma: { fe: 52 } }),
      visita("vecchia", "2024-06-01", { ...vuota, ecocardiogramma: { fe: 60 } }),
    ];
    const serie = costruisciSerie(visite)["ecocardiogramma.fe"];
    expect(serie.map((p) => p.visitaId)).toEqual(["vecchia", "recente"]);
  });

  it("esclude la visita in modifica, che non e' ancora storia", () => {
    const visite = [
      visita("in-corso", "2026-06-01", { ...vuota, laboratorio: { apoB: 70 } }),
      visita("v1", "2025-06-01", { ...vuota, laboratorio: { apoB: 110 } }),
    ];
    const serie = costruisciSerie(visite, "in-corso")["laboratorio.apoB"];
    expect(serie).toHaveLength(1);
    expect(serie[0].valore).toBe(110);
  });

  it("lascia fuori i valori testuali, che non stanno su un asse", () => {
    const visite = [
      visita("v1", "2026-06-01", {
        ...vuota,
        ecg: { ritmo: "sinusale", pr: 160 },
      }),
    ];
    const serie = costruisciSerie(visite);
    expect(serie["ecg.pr"]).toHaveLength(1);
    expect(serie["ecg.ritmo"]).toBeUndefined();
  });

  it("non crea serie per le misure mai rilevate", () => {
    const visite = [visita("v1", "2026-06-01", { ...vuota, laboratorio: {} })];
    expect(costruisciSerie(visite)["laboratorio.apoB"]).toBeUndefined();
  });

  it("regge un archivio senza visite", () => {
    expect(costruisciSerie([])).toEqual({});
  });
});
