import { beforeEach, describe, expect, it } from "vitest";

/**
 * I modelli predefiniti venivano seminati **solo a store vuoto**: un modello
 * aggiunto dopo — e il cardiologo ne manda a ogni giro — non raggiungeva mai
 * chi aveva gia' l'applicazione installata.
 */
const store = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
  },
});
Object.defineProperty(globalThis, "window", { configurable: true, value: {} });

const { storageService } = await import("../StorageServiceFallback");
const { MedicalTemplates } = await import("../../data/medicalTemplates");

const sezioniVisita = async () => {
  const t = await storageService.getTemplates();
  return new Set(t.filter((x) => x.category === "visita").map((x) => x.section));
};

const etichette = async (sezione: string) => {
  const t = await storageService.getTemplates();
  return t.filter((x) => x.section === sezione).map((x) => x.label);
};

beforeEach(() => {
  store.clear();
});

describe("seed dei modelli della visita", () => {
  it("semina tutte le sezioni presenti nel file dei modelli", async () => {
    // Le sezioni erano elencate a mano e tre erano rimaste indietro: test
    // ergometrico e i due Holter avevano il selettore "Modello" vuoto.
    const attese = Object.keys(MedicalTemplates.visita);
    const ottenute = await sezioniVisita();
    for (const sezione of attese) expect(ottenute).toContain(sezione);
    expect(ottenute).toContain("testErgometrico");
    expect(ottenute).toContain("holterEcg");
    expect(ottenute).toContain("holterPressorio");
  });

  it("porta un modello nuovo anche a chi ha già lo store popolato", async () => {
    // Store di un'installazione vecchia: un solo modello, nessun elenco dei
    // modelli gia' seminati.
    store.set(
      "AppDottori_templates",
      JSON.stringify([
        {
          id: "1",
          category: "visita",
          section: "ecocardiogramma",
          label: "Ecocardiogramma nella norma",
          text: "vecchio",
          isDefault: true,
        },
      ]),
    );

    const eco = await etichette("ecocardiogramma");
    expect(eco).toContain("Ecocardiogramma normale (referto discorsivo)");
    // Il modello gia' presente non viene duplicato ne' sovrascritto.
    expect(eco.filter((l) => l === "Ecocardiogramma nella norma")).toHaveLength(1);
    const t = await storageService.getTemplates();
    expect(t.find((x) => x.label === "Ecocardiogramma nella norma")?.text).toBe("vecchio");
  });

  it("non ripropone a ogni avvio un modello cancellato dal medico", async () => {
    await storageService.getTemplates(); // seed iniziale
    const tutti = await storageService.getTemplates();
    const daCancellare = tutti.find(
      (t) => t.label === "Ecocardiogramma normale (referto discorsivo)",
    )!;
    await storageService.deleteTemplate(daCancellare.id);

    // Riavvio: il modello resta cancellato perche' risulta gia' seminato.
    const dopo = await etichette("ecocardiogramma");
    expect(dopo).not.toContain("Ecocardiogramma normale (referto discorsivo)");
  });

  it("non duplica i modelli a ogni chiamata", async () => {
    const prima = (await storageService.getTemplates()).length;
    await storageService.getTemplates();
    const dopo = (await storageService.getTemplates()).length;
    expect(dopo).toBe(prima);
  });
});

describe("modelli di ogni categoria", () => {
  it("semina anche terapie, ricette, esami e certificati", async () => {
    const t = await storageService.getTemplates();
    const categorie = new Set(t.map((x) => x.category));
    expect(categorie).toContain("terapie");
    expect(categorie).toContain("ricette");
    expect(categorie).toContain("esame_complementare");
    expect(categorie).toContain("certificato");
  });

  it("porta gli schemi dietetici anche a chi ha già lo store popolato", async () => {
    store.set(
      "AppDottori_templates",
      JSON.stringify([
        {
          id: "1",
          category: "terapie",
          section: "generale",
          label: "Controllo periodico",
          text: "vecchio",
          isDefault: true,
        },
      ]),
    );
    const t = await storageService.getTemplates();
    const diete = t.filter((x) => x.category === "terapie").map((x) => x.label);
    expect(diete).toContain("Dieta mediterranea — impostazione generale");
    expect(diete).toContain("Dieta iposodica — ipertensione e scompenso");
    // Il modello gia' presente non viene toccato.
    expect(t.find((x) => x.label === "Controllo periodico")?.text).toBe("vecchio");
  });
});

describe("regressione: elenco dei seminati più vecchio dei predefiniti", () => {
  it("non duplica i modelli che il marker non conosce", async () => {
    // Marker scritto da una versione che seminava la sola categoria "visita":
    // non conosce le terapie, che pero' sono gia' nello store.
    store.set(
      "AppDottori_templates",
      JSON.stringify([
        {
          id: "1",
          category: "terapie",
          section: "generale",
          label: "Controllo periodico",
          text: "vecchio",
          isDefault: true,
        },
      ]),
    );
    store.set(
      "AppDottori_templates_seeded",
      JSON.stringify(["visita|ecg|ECG nella norma"]),
    );

    const t = await storageService.getTemplates();
    const controlli = t.filter((x) => x.label === "Controllo periodico");
    expect(controlli).toHaveLength(1);
    expect(controlli[0].text).toBe("vecchio");
    // I modelli davvero nuovi arrivano lo stesso.
    expect(t.some((x) => x.label === "Dieta mediterranea — impostazione generale")).toBe(true);
  });

  it("dopo il riallineamento una cancellazione resta tale", async () => {
    await storageService.getTemplates();
    const tutti = await storageService.getTemplates();
    const bersaglio = tutti.find((x) => x.label === "Controllo periodico")!;
    await storageService.deleteTemplate(bersaglio.id);

    const dopo = await storageService.getTemplates();
    expect(dopo.some((x) => x.label === "Controllo periodico")).toBe(false);
  });
});

describe("nessun doppione", () => {
  it("un'installazione pulita non semina lo stesso modello due volte", async () => {
    const t = await storageService.getTemplates();
    const firme = t.map((x) => `${x.category}|${x.section}|${x.label}`);
    expect(firme.length).toBe(new Set(firme).size);
  });

  it("né dopo più avvii di seguito", async () => {
    await storageService.getTemplates();
    await storageService.getTemplates();
    const t = await storageService.getTemplates();
    const firme = t.map((x) => `${x.category}|${x.section}|${x.label}`);
    expect(firme.length).toBe(new Set(firme).size);
  });
});

describe("accenti nei modelli già in archivio", () => {
  it("corregge i modelli già in archivio una volta sola", async () => {
    store.set(
      "AppDottori_templates",
      JSON.stringify([
        { id: "1", category: "visita", section: "esameObiettivo",
          label: "Idoneità sportiva", text: "Attività fisica regolare.", isDefault: true },
      ]),
    );
    const t = await storageService.getTemplates();
    const mio = t.find((x) => x.id === "1")!;
    expect(mio.text).toBe("Attività fisica regolare.");
    expect(mio.label).toBe("Idoneità sportiva");
    expect(store.get("AppDottori_templates_accenti_v1")).toBe("1");
  });
});
