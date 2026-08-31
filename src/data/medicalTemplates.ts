export const MedicalTemplates = {
  visita: {
    prestazione: [
      {
        label: "Anamnesi standard",
        text: "Nega patologie di rilievo.\nNega pregressi interventi chirurgici.\nNega allergie note a farmaci o alimenti.\nNega familiarità per patologie di rilievo.\nNon terapie in corso.\nNega fumo e abuso alcolico."
      },
      {
        label: "Anamnesi paziente in terapia cronica",
        text: "Patologie note: ___.\nTerapia domiciliare in atto: ___ (posologia ___), assunta con buona aderenza.\nControlli periodici presso ___.\nNega reazioni avverse ai farmaci assunti.\nUltimi esami ematochimici in data ___: ___."
      },
      {
        label: "Anamnesi primo accesso",
        text: "Paziente al primo accesso ambulatoriale, inviato dal Medico di Medicina Generale per ___.\nSintomatologia insorta da ___, con andamento ___.\nNon precedenti valutazioni specialistiche per la stessa problematica.\nPorta in visione documentazione clinica: ___."
      }
    ],
    esameObiettivo: [
      {
        label: "Esame obiettivo generale nella norma",
        text: "Paziente vigile, orientato nel tempo e nello spazio, collaborante. Condizioni generali buone.\nCute e mucose normocolorate e normoidratate. Non edemi declivi.\nTorace: murmure vescicolare presente su tutto l'ambito, non rumori patologici aggiunti.\nAttività cardiaca ritmica, toni validi, non soffi apprezzabili.\nAddome trattabile, non dolente né dolorabile alla palpazione, peristalsi presente. Fegato e milza nei limiti.\nNon deficit neurologici focali."
      },
      {
        label: "Parametri vitali",
        text: "PA ___ mmHg (braccio ___, posizione seduta). FC ___ bpm, ritmica.\nSaturazione O2 in aria ambiente ___%. Frequenza respiratoria ___ atti/min.\nPeso ___ kg, altezza ___ cm, BMI ___."
      },
      {
        label: "Esame obiettivo cardiovascolare",
        text: "Itto della punta in sede. Attività cardiaca ritmica, toni validi, pause libere; non soffi né sfregamenti.\nPolsi periferici presenti, simmetrici e sincroni ai quattro arti.\nNon turgore giugulare, non reflusso epatogiugulare.\nNon edemi declivi. Non segni clinici di trombosi venosa profonda agli arti inferiori."
      },
      {
        label: "Esame obiettivo respiratorio",
        text: "Torace simmetrico, normoespansibile. Fremito vocale tattile conservato e simmetrico.\nSuono chiaro polmonare alla percussione.\nMurmure vescicolare presente su tutto l'ambito, non rumori patologici aggiunti.\nNon tirage né cornage. Eupnoico a riposo."
      },
      {
        label: "Esame obiettivo addominale",
        text: "Addome piano, trattabile, non dolente né dolorabile alla palpazione superficiale e profonda.\nNon masse palpabili. Blumberg negativo, Murphy negativo, Giordano negativo bilateralmente.\nFegato non debordante dall'arcata costale, milza non palpabile.\nPeristalsi presente e normorappresentata."
      },
      {
        label: "Refertazione esami visionati",
        text: "Si visionano gli accertamenti portati dal paziente:\n- Esami ematochimici del ___: ___.\n- ___ del ___: ___.\nIl quadro complessivo risulta ___."
      }
    ],
    conclusioni: [
      {
        label: "Quadro nella norma — controllo periodico",
        text: "Conclusioni: quadro clinico attuale nella norma, non si evidenziano elementi di rilievo patologico.\nSi consiglia controllo clinico a distanza di 12 mesi o prima in caso di comparsa di sintomi.\nSi raccomanda il mantenimento di un corretto stile di vita (attività fisica regolare, dieta equilibrata, astensione dal fumo)."
      },
      {
        label: "Prosecuzione della terapia in atto",
        text: "Conclusioni: quadro clinico stabile e in buon controllo con la terapia in atto.\nSi consiglia di proseguire la terapia domiciliare senza modifiche.\nControllo clinico e strumentale tra ___ mesi, con esami ematochimici da eseguire prima del controllo."
      },
      {
        label: "Approfondimento diagnostico",
        text: "Conclusioni: il quadro clinico rende opportuno un approfondimento diagnostico.\nSi richiedono i seguenti accertamenti: ___.\nSi rivaluterà il paziente alla luce dei referti; si raccomanda di riportare tutta la documentazione al controllo."
      },
      {
        label: "Invio ad altro specialista",
        text: "Conclusioni: si ritiene indicata una valutazione ___ per ___.\nSi rilascia impegnativa per visita specialistica.\nNel frattempo si consiglia di proseguire la terapia in atto e di rivolgersi al Pronto Soccorso in caso di peggioramento della sintomatologia."
      },
      {
        label: "Rivalutazione dopo terapia",
        text: "Conclusioni: si imposta la terapia indicata e si programma una rivalutazione clinica al termine del trattamento.\nSi raccomanda di tornare a controllo in caso di persistenza o peggioramento dei sintomi, o di comparsa di effetti indesiderati."
      }
    ]
  },
  terapie: [
    {
      label: "Controllo periodico",
      text: "Si consiglia di proseguire i controlli clinici di routine secondo il protocollo previsto e di mantenere uno stile di vita sano: attività fisica regolare, dieta equilibrata, astensione dal fumo e limitazione dell'alcol."
    },
    {
      label: "Rivalutazione dopo terapia",
      text: "Si imposta la terapia indicata e si programma una rivalutazione clinica al termine del trattamento. Si raccomanda di tornare a controllo in caso di persistenza o peggioramento dei sintomi."
    },
    {
      label: "Terapia sintomatica al bisogno",
      text: "Si consiglia terapia sintomatica al bisogno. In caso di mancato beneficio o comparsa di nuovi sintomi si raccomanda una nuova valutazione specialistica."
    },
    {
      label: "Modifiche dello stile di vita",
      text: "Si raccomandano: riduzione del sodio nella dieta, controllo del peso corporeo, attività fisica aerobica di intensità moderata per almeno 150 minuti a settimana, astensione completa dal fumo, consumo di alcol entro i limiti raccomandati."
    },
    {
      label: "Automonitoraggio domiciliare",
      text: "Si consiglia automonitoraggio domiciliare dei parametri (pressione arteriosa e frequenza cardiaca) due volte al giorno, a riposo da almeno 5 minuti, annotando i valori su un diario da portare al prossimo controllo."
    }
  ],
  ricette: [
    {
      label: "Antibiotico — infezione delle vie respiratorie",
      text: [
        "Amoxicillina/acido clavulanico 875/125 mg: 1 cpr ogni 12 ore per 6 giorni",
        "In caso di allergia alle penicilline: azitromicina 500 mg 1 cpr al giorno per 3 giorni",
        "",
        "Assumere a stomaco pieno. Associare fermenti lattici per la durata della terapia.",
      ].join("\n"),
    },
    {
      label: "Antidolorifico / antipiretico",
      text: [
        "Paracetamolo 1000 mg: 1 cpr fino a 3 volte al giorno al bisogno (massimo 3 g al giorno)",
        "Ibuprofene 600 mg: 1 cpr fino a 2 volte al giorno al bisogno, a stomaco pieno",
        "",
        "Non superare le dosi indicate. Sospendere e contattare il medico in caso di effetti indesiderati.",
      ].join("\n"),
    },
    {
      label: "Gastroprotezione",
      text: [
        "Pantoprazolo 20 mg: 1 cpr al mattino a digiuno per 30 giorni",
        "",
        "Da assumere 30 minuti prima della colazione.",
      ].join("\n"),
    },
    {
      label: "Terapia antipertensiva",
      text: [
        "___ (principio attivo) ___ mg: 1 cpr al mattino",
        "",
        "Controllo pressorio domiciliare quotidiano nelle prime due settimane.",
        "Controllo di funzione renale ed elettroliti dopo 15 giorni dall'inizio della terapia.",
      ].join("\n"),
    },
    {
      label: "Integrazione / supplementazione",
      text: [
        "Colecalciferolo 25.000 UI: 1 flaconcino a settimana per 8 settimane, poi 1 al mese",
        "Magnesio e potassio: 1 bustina al giorno per 20 giorni",
        "",
        "Rivalutare i dosaggi al controllo con esami ematochimici.",
      ].join("\n"),
    },
  ] as { label: string; text: string; note?: string }[],
  esami_complementari: [
    { label: "Esami ematochimici di base", text: "Esami ematochimici di routine", note: "Emocromo, glicemia, creatinina ed eGFR, elettroliti, assetto lipidico, AST/ALT, TSH, esame urine." },
    { label: "Elettrocardiogramma", text: "Elettrocardiogramma a 12 derivazioni", note: "A riposo, con refertazione." },
    { label: "Ecocardiogramma", text: "Ecocardiogramma color-Doppler transtoracico", note: "Valutazione morfo-funzionale delle camere cardiache e degli apparati valvolari." },
    { label: "Holter ECG 24 ore", text: "Monitoraggio ECG dinamico secondo Holter (24 ore)", note: "Per documentazione di aritmie o correlazione sintomo-evento." },
    { label: "Holter pressorio 24 ore", text: "Monitoraggio pressorio delle 24 ore (ABPM)", note: "Per conferma diagnostica di ipertensione arteriosa e valutazione del profilo notturno." },
    { label: "Test da sforzo", text: "Test ergometrico al cicloergometro o treadmill", note: "Secondo protocollo, con monitoraggio ECG e pressorio." },
    { label: "Radiografia del torace", text: "Radiografia del torace in due proiezioni", note: "Proiezione postero-anteriore e laterale." },
    { label: "Ecografia addome completo", text: "Ecografia dell'addome completo", note: "A digiuno da almeno 6 ore." },
    { label: "Ecocolordoppler dei tronchi sovraortici", text: "Ecocolordoppler dei tronchi sovraortici", note: "Valutazione morfologica ed emodinamica degli assi carotidei e vertebrali." },
    { label: "Ecocolordoppler arti inferiori", text: "Ecocolordoppler venoso o arterioso degli arti inferiori", note: "Specificare il distretto e il quesito clinico." },
    { label: "Spirometria", text: "Spirometria globale con test di broncodilatazione", note: "Sospendere i broncodilatatori secondo indicazione prima dell'esame." },
    { label: "Visita specialistica", text: "Visita specialistica ___", note: "Indicare la branca e il quesito clinico." },
  ],
  certificati: [
    {
      label: "Assenza dal lavoro — visita specialistica",
      note: "Attestato di presenza per visita o procedura ambulatoriale.",
      text: "Il/La sottoscritto/a Dott. ___ attesta che il/la paziente ___ (nato/a il ___, CF ___) è stato/a visitato/a in data odierna presso questo ambulatorio ed ha eseguito ___ (visita specialistica / procedura: specificare). Per tale motivo il/la paziente si è assentato/a dal lavoro in data odierna.\n\nSi rilascia il presente certificato per gli usi consentiti dalla legge."
    },
    {
      label: "Attestato di presenza alla visita",
      note: "Generico attestato di presenza.",
      text: "Il/La sottoscritto/a Dott. ___ attesta che il/la paziente ___ (nato/a il ___) si è presentato/a in data odierna presso questo ambulatorio per visita specialistica.\n\nSi rilascia il presente attestato per gli usi consentiti dalla legge."
    },
    {
      label: "Idoneità all'attività sportiva non agonistica",
      note: "Certificato per attività sportiva non agonistica (D.M. 24/04/2013).",
      text: "Il/La sottoscritto/a Dott. ___ attesta che il/la paziente ___ (nato/a il ___, CF ___), sottoposto/a in data odierna a visita medica ed esame obiettivo, non presenta controindicazioni in atto alla pratica di attività sportiva non agonistica.\n\nIl presente certificato ha validità annuale a partire dalla data di rilascio, ai sensi del D.M. 24/04/2013 e successive modifiche."
    },
    {
      label: "Idoneità alla mansione lavorativa",
      note: "Attestazione di idoneità o di limitazione alla mansione.",
      text: "Il/La sottoscritto/a Dott. ___ attesta che il/la paziente ___ (nato/a il ___, CF ___) è stato/a visitato/a in data odierna. In base al quadro clinico rilevato, il/la paziente risulta idoneo/a allo svolgimento della propria attività lavorativa / risulta temporaneamente non idoneo/a alle seguenti mansioni: ___ (barrare il non necessario).\n\nSi rilascia il presente certificato per gli usi consentiti dalla legge."
    },
    {
      label: "Convalescenza post-procedura",
      note: "Dopo un intervento o una procedura, con periodo di riposo.",
      text: "Il/La sottoscritto/a Dott. ___ attesta che il/la paziente ___ (nato/a il ___) è stato/a sottoposto/a a ___ in data ___. Il/La paziente è in periodo di convalescenza e necessita di astensione dall'attività lavorativa per ___ giorni, dal ___ al ___.\n\nSi rilascia il presente certificato per gli usi consentiti dalla legge."
    },
    {
      label: "Esonero da attività fisica scolastica",
      note: "Esonero temporaneo dalle lezioni di educazione fisica.",
      text: "Il/La sottoscritto/a Dott. ___ attesta che l'alunno/a ___ (nato/a il ___) per motivi di salute deve astenersi dall'attività fisica scolastica dal ___ al ___.\n\nSi rilascia il presente certificato su richiesta dell'interessato per gli usi consentiti dalla legge."
    },
    {
      label: "Patologia cronica in atto — uso amministrativo",
      note: "Attestazione della patologia per pratiche amministrative o assicurative.",
      text: "Il/La sottoscritto/a Dott. ___ attesta che il/la paziente ___ (nato/a il ___, CF ___) è affetto/a da ___, patologia in atto documentata e attualmente in trattamento con ___.\n\nSi rilascia il presente certificato per le pratiche amministrative richieste dall'interessato."
    },
    {
      label: "Lettera per il Medico di Medicina Generale",
      note: "Comunicazione dell'esito della valutazione al MMG.",
      text: "Lettera di comunicazione per il Medico di Medicina Generale.\n\nPaziente: ___ (nato/a il ___).\n\nIn data odierna il/la paziente è stato/a valutato/a presso questo ambulatorio per ___. Quadro clinico rilevato: ___. Accertamenti richiesti: ___. Terapia consigliata: ___.\n\nSi invia comunicazione per continuità assistenziale, restando a disposizione per ogni chiarimento.\n\nDistinti saluti."
    }
  ]
};
