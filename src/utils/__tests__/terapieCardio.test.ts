import { describe, expect, it } from "vitest";
import {
  CONFRONTO_FARMACI,
  CRITERI_RISCHIO_ESC,
  PILASTRI_SCOMPENSO,
  PROFILI_COLCHICINA,
  SCHEDA_COLCHICINA,
  SCHEDA_ICOSAPENT,
  TG_ICOSAPENT_MAX,
  TG_ICOSAPENT_MIN,
  colonnaPilastri,
  criteriIcosapentEtile,
} from "../terapieCardio";

/** Lo stato del criterio che contiene una certa parola nell'etichetta. */
const stato = (criteri: ReturnType<typeof criteriIcosapentEtile>, parola: string) =>
  criteri.find((c) => c.label.toLowerCase().includes(parola.toLowerCase()))?.stato;

describe("criteri dell'icosapent etile", () => {
  it("colloca i trigliceridi rispetto alla finestra 135-499", () => {
    const dentro = criteriIcosapentEtile({ trigliceridi: 210 });
    expect(stato(dentro, "trigliceridi a digiuno")).toBe("soddisfatto");

    const sotto = criteriIcosapentEtile({ trigliceridi: 120 });
    expect(stato(sotto, "trigliceridi a digiuno")).toBe("non-soddisfatto");

    const sopra = criteriIcosapentEtile({ trigliceridi: 600 });
    expect(stato(sopra, "trigliceridi a digiuno")).toBe("non-soddisfatto");
  });

  it("i confini della finestra appartengono all'indicazione", () => {
    expect(
      stato(criteriIcosapentEtile({ trigliceridi: TG_ICOSAPENT_MIN }), "trigliceridi a digiuno"),
    ).toBe("soddisfatto");
    expect(
      stato(criteriIcosapentEtile({ trigliceridi: TG_ICOSAPENT_MAX }), "trigliceridi a digiuno"),
    ).toBe("soddisfatto");
    expect(
      stato(criteriIcosapentEtile({ trigliceridi: TG_ICOSAPENT_MIN - 1 }), "trigliceridi a digiuno"),
    ).toBe("non-soddisfatto");
    expect(
      stato(criteriIcosapentEtile({ trigliceridi: TG_ICOSAPENT_MAX + 1 }), "trigliceridi a digiuno"),
    ).toBe("non-soddisfatto");
  });

  it("accetta solo il rischio alto o molto alto", () => {
    expect(stato(criteriIcosapentEtile({ categoriaRischio: "alto" }), "rischio")).toBe(
      "soddisfatto",
    );
    expect(stato(criteriIcosapentEtile({ categoriaRischio: "molto-alto" }), "rischio")).toBe(
      "soddisfatto",
    );
    expect(
      stato(criteriIcosapentEtile({ categoriaRischio: "molto-alto-ricorrente" }), "rischio"),
    ).toBe("soddisfatto");
    expect(stato(criteriIcosapentEtile({ categoriaRischio: "moderato" }), "rischio")).toBe(
      "non-soddisfatto",
    );
    expect(stato(criteriIcosapentEtile({ categoriaRischio: "basso" }), "rischio")).toBe(
      "non-soddisfatto",
    );
  });

  it("senza dati non da' per soddisfatto niente", () => {
    // Il punto della scheda: cio' che non si puo' controllare risulta da
    // controllare, mai soddisfatto in silenzio.
    const vuoto = criteriIcosapentEtile({});
    expect(vuoto.every((c) => c.stato === "da-verificare")).toBe(true);
  });

  it("lascia al medico i criteri che la scheda non può vedere", () => {
    const pieno = criteriIcosapentEtile({ trigliceridi: 200, categoriaRischio: "molto-alto" });
    expect(stato(pieno, "statina già ottimizzata")).toBe("da-verificare");
    expect(stato(pieno, "cause secondarie")).toBe("da-verificare");
    expect(stato(pieno, "persistenti")).toBe("da-verificare");
    // Anche con i due criteri verificabili soddisfatti, restano criteri aperti:
    // non esiste uno stato in cui la scheda dichiari il paziente candidato.
    expect(pieno.some((c) => c.stato === "da-verificare")).toBe(true);
  });

  it("avverte che un singolo prelievo dentro la finestra non basta", () => {
    const dentro = criteriIcosapentEtile({ trigliceridi: 210 });
    const tg = dentro.find((c) => c.label.includes("Trigliceridi a digiuno"))!;
    expect(tg.nota).toContain("persistente");
  });
});

describe("profili della colchicina", () => {
  it("tiene separate indicazione, fuori indicazione e area grigia", () => {
    const per = (c: string) => PROFILI_COLCHICINA.filter((p) => p.collocazione === c).length;
    expect(per("indicata")).toBeGreaterThan(0);
    expect(per("fuori-indicazione")).toBeGreaterThan(0);
    expect(per("area-grigia")).toBe(1);
  });

  it("il rischio calcolato alto senza malattia documentata resta fuori", () => {
    const p = PROFILI_COLCHICINA.find((x) => x.profilo.includes("Rischio calcolato"))!;
    expect(p.collocazione).toBe("fuori-indicazione");
  });

  it("l'aterosclerosi subclinica non viene equiparata a una CCS", () => {
    const p = PROFILI_COLCHICINA.find((x) => x.profilo.includes("subclinica"))!;
    expect(p.collocazione).toBe("area-grigia");
  });
});

describe("colonna dei pilastri per la frazione di eiezione", () => {
  it("sceglie la colonna al taglio del 50%", () => {
    expect(colonnaPilastri(35)?.chiave).toBe("feRidotta");
    expect(colonnaPilastri(49)?.chiave).toBe("feRidotta");
    expect(colonnaPilastri(50)?.chiave).toBe("feConservata");
    expect(colonnaPilastri(60)?.chiave).toBe("feConservata");
  });

  it("senza FE non sceglie una colonna a caso", () => {
    expect(colonnaPilastri(undefined)).toBeNull();
    expect(colonnaPilastri(0)).toBeNull();
    expect(colonnaPilastri(120)).toBeNull();
  });

  it("sono quattro, e nella FE conservata non sono tutti pilastri", () => {
    expect(PILASTRI_SCOMPENSO).toHaveLength(4);
    // Nella FE ridotta sono tutti e quattro pilastri pieni.
    expect(PILASTRI_SCOMPENSO.every((p) => p.feRidotta.stato === "si")).toBe(true);
    // Nella FE conservata l'unico con un "sì" pieno e' l'inibitore di SGLT2:
    // gli altri tre restano selettivi, e appiattirli trasformerebbe la tabella
    // in un protocollo.
    const pieni = PILASTRI_SCOMPENSO.filter((p) => p.feConservata.stato === "si");
    expect(pieni).toHaveLength(1);
    expect(pieni[0].classe).toContain("SGLT2");
  });

  it("ogni pilastro porta dose iniziale e attenzioni", () => {
    for (const p of PILASTRI_SCOMPENSO) {
      expect(p.doseIniziale.length).toBeGreaterThan(10);
      expect(p.attenzioni.length).toBeGreaterThan(10);
      expect(p.quando.length).toBeGreaterThan(10);
    }
  });
});

describe("criteri delle classi di rischio ESC/EAS", () => {
  it("copre le due classi da cui parte l'indicazione dell'icosapent", () => {
    expect(CRITERI_RISCHIO_ESC.map((c) => c.classe)).toEqual([
      "Rischio molto alto",
      "Rischio alto",
    ]);
  });

  it("ogni voce porta il criterio e i suoi esempi", () => {
    for (const c of CRITERI_RISCHIO_ESC) {
      expect(c.voci.length).toBeGreaterThan(3);
      for (const v of c.voci) {
        expect(v.titolo.length).toBeGreaterThan(5);
        expect(v.esempi.length).toBeGreaterThan(10);
      }
    }
  });

  it("le due soglie di SCORE2 non si sovrappongono", () => {
    const testo = JSON.stringify(CRITERI_RISCHIO_ESC);
    expect(testo).toContain("≥ 20%");
    expect(testo).toContain("≥ 10% e < 20%");
  });
});

describe("confronto fra i due farmaci", () => {
  it("copre i cinque aspetti della tabella", () => {
    expect(CONFRONTO_FARMACI).toHaveLength(5);
    for (const r of CONFRONTO_FARMACI) {
      expect(r.aspetto.trim()).not.toBe("");
      // Nessuna casella vuota. Non si chiede di piu': la risposta giusta per
      // la colchicina in prevenzione primaria e' "No", lunga due caratteri.
      expect(r.icosapent.trim()).not.toBe("");
      expect(r.colchicina.trim()).not.toBe("");
    }
  });

  it("tiene ferma la differenza che conta: la prevenzione primaria", () => {
    // E' la riga che separa davvero i due farmaci.
    const r = CONFRONTO_FARMACI.find((x) => x.aspetto.includes("primaria"))!;
    expect(r.colchicina).toBe("No");
    expect(r.icosapent).toContain("Possibile");
  });

  it("le dosi coincidono con quelle delle schede", () => {
    const r = CONFRONTO_FARMACI.find((x) => x.aspetto === "Dose")!;
    expect(SCHEDA_ICOSAPENT.dose).toContain("2 g due volte al giorno");
    expect(r.icosapent).toContain("2 g due volte al giorno");
    expect(SCHEDA_COLCHICINA.dose).toContain("0,5 mg");
    expect(r.colchicina).toContain("0,5 mg");
  });
});

describe("scheda dell'icosapent", () => {
  it("porta la finestra dei trigliceridi in entrambe le unita'", () => {
    expect(SCHEDA_ICOSAPENT.trigliceridi).toContain("135-499 mg/dL");
    expect(SCHEDA_ICOSAPENT.trigliceridi).toContain("1,52-5,63 mmol/L");
  });

  it("dice che prima vengono stile di vita e cause secondarie", () => {
    // E' il passaggio che si salta piu' spesso: senza, si tratta un valore
    // che si sarebbe abbassato da solo.
    expect(SCHEDA_ICOSAPENT.prerequisito).toContain("stile di vita");
    expect(SCHEDA_ICOSAPENT.prerequisito).toContain("cause secondarie");
    expect(SCHEDA_ICOSAPENT.prerequisito).toContain("nonostante il trattamento con statina");
  });
});
