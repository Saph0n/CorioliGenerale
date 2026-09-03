export const MedicalTemplates = {
  visita: {
    prestazione: [
      {
        label: "Anamnesi cardiologica standard",
        text: "Nega precedenti eventi cardiovascolari maggiori.\nNega angina da sforzo, dispnea, cardiopalmo, sincopi o lipotimie.\nNega ipertensione arteriosa nota, diabete mellito, dislipidemia.\nNega familiarita' per cardiopatia ischemica precoce.\nNega fumo e abuso alcolico. Attivita' fisica regolare.\nNon terapie in corso."
      },
      {
        label: "Paziente iperteso in terapia",
        text: "Ipertensione arteriosa nota da ___ anni, in trattamento con ___.\nAutomisurazioni domiciliari riferite: ___ mmHg.\nNega crisi ipertensive, cefalea, epistassi.\nUltimo controllo pressorio delle 24 ore in data ___: ___.\nNega altri fattori di rischio cardiovascolare oltre a ___."
      },
      {
        label: "Cardiopatia ischemica nota",
        text: "Cardiopatia ischemica nota: ___ (IMA / angina stabile) in data ___.\nSottoposto a ___ (coronarografia, PTCA con stent su ___, bypass) in data ___.\nTerapia in atto: antiaggregante ___, statina ___, betabloccante ___, ACE-inibitore/sartano ___.\nAttualmente asintomatico per angor, classe CCS ___.\nUltimo controllo strumentale: ___."
      },
      {
        label: "Fibrillazione atriale",
        text: "Fibrillazione atriale ___ (parossistica / persistente / permanente) nota dal ___.\nCHA2DS2-VASc ___, HAS-BLED ___.\nIn terapia anticoagulante con ___ dal ___.\nNega episodi emorragici. Nega cardiopalmo sintomatico nell'ultimo periodo.\nControllo della frequenza con ___."
      },
      {
        label: "Primo accesso — inquadramento del rischio",
        text: "Paziente al primo accesso, inviato dal Medico di Medicina Generale per ___.\nFattori di rischio cardiovascolare: fumo ___, ipertensione ___, dislipidemia ___, diabete ___, familiarita' ___.\nSintomatologia insorta da ___, con andamento ___.\nPorta in visione: ___."
      }
    ],
    esameObiettivo: [
      {
        label: "Esame obiettivo cardiovascolare nella norma",
        text: "Paziente in condizioni generali buone, eupnoico a riposo.\nItto della punta in sede. Attivita' cardiaca ritmica, toni validi, pause libere; non soffi ne' sfregamenti.\nPolsi periferici presenti, simmetrici e sincroni ai quattro arti.\nNon turgore giugulare, non reflusso epatogiugulare.\nTorace: murmure vescicolare presente su tutto l'ambito, non rumori patologici aggiunti.\nAddome trattabile, fegato non debordante. Non edemi declivi.\nNon segni clinici di trombosi venosa profonda agli arti inferiori."
      },
      {
        label: "Soffio sistolico",
        text: "Attivita' cardiaca ritmica. Soffio sistolico ___/6 sul focolaio ___ (aortico / mitralico / polmonare / tricuspidale), irradiato ___.\nToni validi, non sfregamenti pericardici.\nPolsi periferici ___. Non turgore giugulare.\nSi programma approfondimento ecocardiografico."
      },
      {
        label: "Segni di scompenso",
        text: "Paziente dispnoico per sforzi ___ (lievi / moderati), classe NYHA ___.\nTurgore giugulare ___, reflusso epatogiugulare ___.\nAll'auscultazione toracica: rantoli crepitanti alle basi ___.\nEpatomegalia ___. Edemi declivi improntabili ___ fino a ___.\nPeso attuale ___ kg (variazione rispetto al precedente controllo: ___)."
      },
      {
        label: "Misurazione pressoria",
        text: "PA ___ mmHg al braccio ___, in posizione seduta dopo 5 minuti di riposo.\nControllo controlaterale: ___ mmHg. Differenza interbraccio ___ mmHg.\nFC ___ bpm, ritmica.\nMisurazione ripetuta dopo 2 minuti: ___ mmHg."
      }
    ],
    ecg: [
      {
        label: "ECG nella norma",
        text: "Ritmo sinusale regolare, frequenza ___ bpm.\nConduzione atrioventricolare e intraventricolare nei limiti.\nAsse elettrico del QRS normoposizionato.\nNon alterazioni della ripolarizzazione ventricolare.\nNon segni di ipertrofia ventricolare sinistra. Non onde Q patologiche."
      },
      {
        label: "Fibrillazione atriale",
        text: "Ritmo da fibrillazione atriale a risposta ventricolare ___ (media ___ bpm).\nAssenza di onde P, intervalli R-R irregolarmente irregolari.\nQRS stretto. Non alterazioni acute della ripolarizzazione.\nRispetto al tracciato precedente: ___."
      },
      {
        label: "Ipertrofia ventricolare sinistra",
        text: "Ritmo sinusale, frequenza ___ bpm.\nIndici di voltaggio positivi per ipertrofia ventricolare sinistra (Sokolow-Lyon ___ mm).\nAlterazioni secondarie della ripolarizzazione nelle derivazioni laterali.\nAsse ___. Conduzione AV nei limiti."
      },
      {
        label: "Blocco di branca sinistra",
        text: "Ritmo sinusale, frequenza ___ bpm.\nQRS di durata ___ ms con morfologia da blocco di branca sinistra.\nAlterazioni secondarie della ripolarizzazione.\nNon confrontabile per la ricerca di alterazioni ischemiche acute.\nRispetto al precedente tracciato: ___."
      },
      {
        label: "Alterazioni della ripolarizzazione",
        text: "Ritmo sinusale, frequenza ___ bpm.\nSottoslivellamento del tratto ST di ___ mm nelle derivazioni ___.\nOnde T ___ (negative / appiattite / bifasiche) in ___.\nSi consiglia confronto con tracciati precedenti e approfondimento clinico."
      }
    ],
    ecocardiogramma: [
      {
        label: "Ecocardiogramma nella norma",
        text: "Ventricolo sinistro di normali dimensioni e spessori parietali, con cinesi segmentaria e globale conservata. Frazione di eiezione ___% (Simpson biplano).\nFunzione diastolica nei limiti per l'eta'.\nAtrio sinistro di normali dimensioni.\nValvola mitrale e valvola aortica morfologicamente normali, normofunzionanti.\nSezioni destre nei limiti; TAPSE ___ mm. PAPs stimata ___ mmHg.\nRadice aortica e aorta ascendente di normali dimensioni.\nNon versamento pericardico."
      },
      {
        label: "Disfunzione sistolica",
        text: "Ventricolo sinistro dilatato (DTD ___ mm), con ipocinesia ___ (diffusa / dei segmenti ___).\nFrazione di eiezione ridotta, pari a ___% (Simpson biplano).\nPattern diastolico ___. Rapporto E/e' ___.\nAtrio sinistro ___ mm. Insufficienza mitralica ___.\nSezioni destre: TAPSE ___ mm, PAPs ___ mmHg.\nNon versamento pericardico."
      },
      {
        label: "Cardiopatia ipertensiva",
        text: "Ventricolo sinistro di normali dimensioni con ipertrofia concentrica (SIV ___ mm, PP ___ mm).\nCinesi globale e segmentaria conservata, frazione di eiezione ___%.\nAlterato rilasciamento diastolico. Rapporto E/A ___, E/e' ___.\nAtrio sinistro ___ mm.\nRadice aortica ___ mm, aorta ascendente ___ mm.\nNon versamento pericardico."
      },
      {
        label: "Valvulopatia aortica",
        text: "Valvola aortica ___ (tricuspide / bicuspide) con ___ (sclerosi / calcificazioni) dei lembi.\nGradiente medio transvalvolare ___ mmHg, gradiente massimo ___ mmHg, area valvolare stimata ___ cm².\nInsufficienza aortica di grado ___.\nVentricolo sinistro con spessori ___ e frazione di eiezione ___%.\nRadice aortica ___ mm, aorta ascendente ___ mm."
      }
    ],
    tcCoronarica: [
      {
        label: "TC coronarica negativa",
        text: "Esame eseguito presso ___ in data ___.\nCalcium score (Agatston) pari a ___.\nAlbero coronarico ad origine e decorso regolari, senza placche emodinamicamente significative.\nCAD-RADS ___.\nConclusioni del radiologo: ___."
      },
      {
        label: "TC coronarica con placche",
        text: "Esame eseguito presso ___ in data ___.\nCalcium score (Agatston) pari a ___.\nPlacca ___ (calcifica / mista / non calcifica) a carico di ___, con stenosi stimata del ___%.\nCAD-RADS ___.\nConclusioni del radiologo: ___.\nSi programma ___ (ottimizzazione terapia / test funzionale / coronarografia)."
      }
    ],
    testErgometrico: [
      {
        label: "Test massimale negativo",
        text: "Test ergometrico al ___ (cicloergometro / treadmill) secondo protocollo ___.\nInterrotto per esaurimento muscolare al carico di ___ (___ METs), dopo ___ minuti.\nFC massima raggiunta ___ bpm, pari al ___% della teorica per l'eta'.\nComportamento pressorio ___ (fisiologico / ipertensivo), PA massima ___ mmHg.\nNon sintomi durante lo sforzo e nel recupero.\nNon alterazioni significative del tratto ST ne' aritmie da sforzo.\nTest massimale, negativo per ischemia miocardica inducibile."
      },
      {
        label: "Test submassimale",
        text: "Test ergometrico al ___ secondo protocollo ___.\nInterrotto a ___ per ___ (affaticamento / dispnea / raggiungimento della FC target).\nFC massima raggiunta ___ bpm, pari al ___% della teorica: test submassimale.\nComportamento pressorio ___. Non sintomi anginosi.\nNon alterazioni diagnostiche del tratto ST.\nTest non diagnostico per ischemia inducibile per mancato raggiungimento dell'85% della FC teorica."
      },
      {
        label: "Test positivo per ischemia",
        text: "Test ergometrico al ___ secondo protocollo ___.\nInterrotto al carico di ___ dopo ___ minuti per ___ (comparsa di dolore toracico / sottoslivellamento del tratto ST).\nFC massima ___ bpm (___% della teorica). PA massima ___ mmHg.\nSottoslivellamento del tratto ST di ___ mm nelle derivazioni ___, regredito in ___ minuti di recupero.\nTest positivo per ischemia miocardica inducibile.\nSi programma approfondimento con ___."
      }
    ],
    holterEcg: [
      {
        label: "Holter nella norma",
        text: "Registrazione ECG dinamica della durata di ___ ore, di buona qualita' tecnica.\nRitmo sinusale per tutta la durata della registrazione.\nFC media ___ bpm (minima ___ bpm alle ore ___, massima ___ bpm alle ore ___).\nRari battiti ectopici sopraventricolari (___ nelle 24 ore) e ventricolari (___ nelle 24 ore), isolati.\nNon pause significative. Non alterazioni della conduzione atrioventricolare.\nNon episodi sintomatici segnalati sul diario."
      },
      {
        label: "Extrasistolia ventricolare",
        text: "Registrazione ECG dinamica della durata di ___ ore.\nRitmo sinusale, FC media ___ bpm (___-___ bpm).\nBattiti ectopici ventricolari ___ nelle 24 ore (___% del totale), ___ (monomorfi / polimorfi), organizzati in ___ (coppie / triplette / brevi run di TVNS della durata massima di ___ battiti).\nBattiti ectopici sopraventricolari ___ nelle 24 ore.\nDistribuzione ___ (prevalentemente diurna / notturna / uniforme).\nSintomi riferiti sul diario: ___, con correlazione elettrocardiografica ___."
      },
      {
        label: "Fibrillazione atriale",
        text: "Registrazione ECG dinamica della durata di ___ ore.\nRitmo da fibrillazione atriale ___ (permanente / con episodi parossistici, il piu' lungo di ___).\nFC media ___ bpm (minima ___ bpm, massima ___ bpm).\nPausa massima di ___ secondi alle ore ___.\nControllo della frequenza ___ (adeguato / non adeguato) con la terapia in atto.\nSintomi riferiti sul diario: ___."
      }
    ],
    holterPressorio: [
      {
        label: "Profilo pressorio nei limiti",
        text: "Monitoraggio pressorio delle 24 ore, ___ misurazioni valide su ___ (___%).\nMedia delle 24 ore ___/___ mmHg, media diurna ___/___ mmHg, media notturna ___/___ mmHg.\nCalo pressorio notturno pari al ___%: profilo dipper.\nCarico pressorio sistolico ___%, diastolico ___%.\nNon episodi ipotensivi sintomatici.\nProfilo pressorio nei limiti di norma secondo le soglie per il monitoraggio ambulatoriale."
      },
      {
        label: "Ipertensione non controllata",
        text: "Monitoraggio pressorio delle 24 ore, ___ misurazioni valide.\nMedia delle 24 ore ___/___ mmHg, media diurna ___/___ mmHg, media notturna ___/___ mmHg.\nCalo pressorio notturno pari al ___%: profilo ___ (non-dipper / riverso).\nCarico pressorio sistolico ___%, diastolico ___%.\nValori medi superiori alle soglie di riferimento per il monitoraggio ambulatoriale: controllo pressorio non adeguato con la terapia in atto.\nSi modifica la terapia come da prescrizione; si programma nuovo controllo dopo ___."
      }
    ],
    conclusioni: [
      {
        label: "Quadro nella norma — controllo periodico",
        text: "Conclusioni: quadro cardiologico clinico e strumentale nei limiti di norma.\nSi consiglia controllo cardiologico a distanza di 12 mesi o prima in caso di comparsa di sintomi.\nSi raccomanda il mantenimento di uno stile di vita corretto: attivita' fisica aerobica regolare, dieta iposodica e mediterranea, astensione dal fumo, controllo del peso corporeo."
      },
      {
        label: "Prosecuzione della terapia in atto",
        text: "Conclusioni: quadro clinico stabile, in buon compenso con la terapia in atto.\nSi consiglia di proseguire la terapia domiciliare senza modifiche.\nControllo clinico ed ecocardiografico tra ___ mesi, con esami ematochimici (assetto lipidico, funzione renale ed elettroliti) da eseguire prima del controllo."
      },
      {
        label: "Ottimizzazione della terapia",
        text: "Conclusioni: ___.\nSi modifica la terapia come da prescrizione allegata.\nSi raccomanda automisurazione domiciliare di pressione arteriosa e frequenza cardiaca due volte al giorno, con annotazione dei valori su diario da portare al controllo.\nControllo di funzione renale ed elettroliti a 15 giorni dall'inizio della nuova terapia.\nRivalutazione clinica tra ___."
      },
      {
        label: "Approfondimento di secondo livello",
        text: "Conclusioni: il quadro clinico rende opportuno un approfondimento diagnostico.\nSi richiede ___ (test ergometrico / ECG dinamico secondo Holter / monitoraggio pressorio delle 24 ore / TC coronarica).\nSi rivalutera' il paziente alla luce dei referti; si raccomanda di riportare tutta la documentazione al controllo."
      },
      {
        label: "Stratificazione del rischio cardiovascolare",
        text: "Conclusioni: fattori di rischio cardiovascolare rilevati: ___.\nGli indici calcolati in cartella sono riportati a titolo di supporto e vanno letti nel contesto clinico complessivo.\nSi consiglia ___ (correzione dello stile di vita / terapia ipolipemizzante / rivalutazione a ___ mesi) secondo le raccomandazioni ESC vigenti."
      }
    ]
  },
  terapie: [
    {
      label: "Controllo periodico",
      text: "Si consiglia di proseguire i controlli cardiologici periodici e di mantenere uno stile di vita sano: attivita' fisica aerobica di intensita' moderata almeno 150 minuti a settimana, dieta iposodica e mediterranea, astensione dal fumo, consumo di alcol entro i limiti raccomandati."
    },
    {
      label: "Automonitoraggio pressorio",
      text: "Si consiglia automisurazione domiciliare della pressione arteriosa e della frequenza cardiaca due volte al giorno (mattino e sera), a riposo da almeno 5 minuti e in posizione seduta, annotando i valori su un diario da portare al prossimo controllo."
    },
    {
      label: "Rivalutazione dopo modifica terapeutica",
      text: "Si imposta la terapia indicata e si programma una rivalutazione clinica al termine del periodo di titolazione. Si raccomanda controllo di funzione renale ed elettroliti a 15 giorni. Tornare a controllo in caso di comparsa di effetti indesiderati."
    },
    {
      label: "Correzione dei fattori di rischio",
      text: "Si raccomandano: riduzione dell'apporto di sodio, calo ponderale fino a un BMI inferiore a 25, attivita' fisica aerobica regolare, astensione completa dal fumo e correzione dell'assetto lipidico secondo il profilo di rischio complessivo."
    },
    {
      label: "Quando rivolgersi al Pronto Soccorso",
      text: "Si raccomanda di rivolgersi al Pronto Soccorso in caso di dolore toracico prolungato, dispnea a riposo di nuova insorgenza, sincope, cardiopalmo persistente o comparsa di edemi rapidamente ingravescenti."
    }
  ],
  ricette: [
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
      label: "Terapia ipolipemizzante",
      text: [
        "___ (statina) ___ mg: 1 cpr la sera",
        "",
        "Controllo di assetto lipidico e transaminasi dopo 6-8 settimane.",
        "Segnalare eventuali mialgie.",
      ].join("\n"),
    },
    {
      label: "Terapia antiaggregante",
      text: [
        "Acido acetilsalicilico 100 mg: 1 cpr al giorno dopo pranzo",
        "",
        "Assumere a stomaco pieno. Segnalare eventuali episodi emorragici.",
      ].join("\n"),
    },
    {
      label: "Terapia anticoagulante orale",
      text: [
        "___ (anticoagulante orale diretto) ___ mg: 1 cpr ogni ___ ore",
        "",
        "Non sospendere autonomamente la terapia.",
        "Controllo di emocromo e funzione renale ogni ___ mesi.",
        "Segnalare al medico ogni sanguinamento e ogni nuova terapia concomitante.",
      ].join("\n"),
    },
    {
      label: "Gastroprotezione",
      text: [
        "Pantoprazolo 20 mg: 1 cpr al mattino a digiuno",
        "",
        "Da assumere 30 minuti prima della colazione.",
      ].join("\n"),
    },
  ] as { label: string; text: string; note?: string }[],
  esami_complementari: [
    { label: "Elettrocardiogramma", text: "Elettrocardiogramma a 12 derivazioni", note: "A riposo, con refertazione." },
    { label: "Ecocardiogramma", text: "Ecocardiogramma color-Doppler transtoracico", note: "Valutazione morfo-funzionale delle camere cardiache e degli apparati valvolari." },
    { label: "Holter ECG 24 ore", text: "Monitoraggio ECG dinamico secondo Holter (24 ore)", note: "Per documentazione di aritmie o correlazione sintomo-evento." },
    { label: "Holter pressorio 24 ore", text: "Monitoraggio pressorio delle 24 ore (ABPM)", note: "Per conferma diagnostica di ipertensione arteriosa e valutazione del profilo notturno." },
    { label: "Test ergometrico", text: "Test ergometrico al cicloergometro o treadmill", note: "Secondo protocollo, con monitoraggio ECG e pressorio." },
    { label: "TC coronarica", text: "Angio-TC delle arterie coronarie con calcium score", note: "Valutazione anatomica diretta dell'albero coronarico. Indicare la funzione renale recente." },
    { label: "Ecocolordoppler tronchi sovraortici", text: "Ecocolordoppler dei tronchi sovraortici", note: "Valutazione morfologica ed emodinamica degli assi carotidei e vertebrali." },
    { label: "Ecocolordoppler arti inferiori", text: "Ecocolordoppler venoso o arterioso degli arti inferiori", note: "Specificare il distretto e il quesito clinico." },
    { label: "Assetto lipidico", text: "Assetto lipidico completo", note: "Colesterolo totale, HDL, LDL diretto, trigliceridi, lipoproteina(a)." },
    { label: "Esami ematochimici cardiologici", text: "Esami ematochimici per inquadramento cardiologico", note: "Emocromo, glicemia, HbA1c, creatinina ed eGFR, elettroliti, assetto lipidico, TSH, NT-proBNP se indicato." },
    { label: "Funzione renale e albuminuria", text: "Creatinina con eGFR e rapporto albumina/creatinina urinaria", note: "Parte della stratificazione del rischio cardiovascolare." },
    { label: "Radiografia del torace", text: "Radiografia del torace in due proiezioni", note: "Proiezione postero-anteriore e laterale." },
    { label: "Visita specialistica", text: "Visita specialistica ___", note: "Indicare la branca e il quesito clinico." },
  ],
  certificati: [
    {
      label: "Idoneita' all'attivita' sportiva non agonistica",
      note: "Certificato per attivita' sportiva non agonistica (D.M. 24/04/2013).",
      text: "Il/La sottoscritto/a Dott. ___ attesta che il/la paziente ___ (nato/a il ___, CF ___), sottoposto/a in data odierna a visita medica, esame obiettivo cardiovascolare ed elettrocardiogramma a riposo, non presenta controindicazioni in atto alla pratica di attivita' sportiva non agonistica.\n\nIl presente certificato ha validita' annuale a partire dalla data di rilascio, ai sensi del D.M. 24/04/2013 e successive modifiche."
    },
    {
      label: "Assenza dal lavoro — visita specialistica",
      note: "Attestato di presenza per visita o procedura ambulatoriale.",
      text: "Il/La sottoscritto/a Dott. ___ attesta che il/la paziente ___ (nato/a il ___, CF ___) e' stato/a visitato/a in data odierna presso questo ambulatorio ed ha eseguito ___ (visita cardiologica / elettrocardiogramma / ecocardiogramma). Per tale motivo il/la paziente si e' assentato/a dal lavoro in data odierna.\n\nSi rilascia il presente certificato per gli usi consentiti dalla legge."
    },
    {
      label: "Attestato di presenza alla visita",
      note: "Generico attestato di presenza.",
      text: "Il/La sottoscritto/a Dott. ___ attesta che il/la paziente ___ (nato/a il ___) si e' presentato/a in data odierna presso questo ambulatorio per visita cardiologica.\n\nSi rilascia il presente attestato per gli usi consentiti dalla legge."
    },
    {
      label: "Idoneita' alla mansione lavorativa",
      note: "Attestazione di idoneita' o di limitazione alla mansione.",
      text: "Il/La sottoscritto/a Dott. ___ attesta che il/la paziente ___ (nato/a il ___, CF ___) e' stato/a visitato/a in data odierna. In base al quadro cardiologico rilevato, il/la paziente risulta idoneo/a allo svolgimento della propria attivita' lavorativa / risulta temporaneamente non idoneo/a alle seguenti mansioni: ___ (barrare il non necessario).\n\nSi rilascia il presente certificato per gli usi consentiti dalla legge."
    },
    {
      label: "Convalescenza post-procedura",
      note: "Dopo una procedura cardiologica, con periodo di riposo.",
      text: "Il/La sottoscritto/a Dott. ___ attesta che il/la paziente ___ (nato/a il ___) e' stato/a sottoposto/a a ___ in data ___. Il/La paziente e' in periodo di convalescenza e necessita di astensione dall'attivita' lavorativa per ___ giorni, dal ___ al ___.\n\nSi rilascia il presente certificato per gli usi consentiti dalla legge."
    },
    {
      label: "Portatore di dispositivo cardiaco impiantabile",
      note: "Per viaggi, controlli aeroportuali e pratiche amministrative.",
      text: "Il/La sottoscritto/a Dott. ___ attesta che il/la paziente ___ (nato/a il ___, CF ___) e' portatore/portatrice di ___ (pacemaker / defibrillatore impiantabile) modello ___, impiantato in data ___ presso ___.\n\nSi rilascia il presente certificato per gli usi consentiti dalla legge, ivi compresi i controlli di sicurezza aeroportuali."
    },
    {
      label: "Patologia cronica in atto — uso amministrativo",
      note: "Attestazione della patologia per pratiche amministrative o assicurative.",
      text: "Il/La sottoscritto/a Dott. ___ attesta che il/la paziente ___ (nato/a il ___, CF ___) e' affetto/a da ___, patologia in atto documentata e attualmente in trattamento con ___.\n\nSi rilascia il presente certificato per le pratiche amministrative richieste dall'interessato."
    },
    {
      label: "Lettera per il Medico di Medicina Generale",
      note: "Comunicazione dell'esito della valutazione al MMG.",
      text: "Lettera di comunicazione per il Medico di Medicina Generale.\n\nPaziente: ___ (nato/a il ___).\n\nIn data odierna il/la paziente e' stato/a valutato/a presso questo ambulatorio per ___. Quadro clinico rilevato: ___. Esami strumentali eseguiti: ___. Terapia consigliata: ___. Controllo programmato: ___.\n\nSi invia comunicazione per continuita' assistenziale, restando a disposizione per ogni chiarimento.\n\nDistinti saluti."
    }
  ]
};
