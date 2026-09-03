# Corioli Cardiologia

Applicazione desktop per la gestione di pazienti e visite di un ambulatorio
**cardiologico**. Stessa base di Corioli, senza i moduli di ginecologia e
ostetricia, con i moduli strumentali e gli indici della cardiologia. I dati
clinici restano **in locale** sul computer del medico: non esiste un archivio
pazienti sul server.

- **Interfaccia:** React 18 + TypeScript, NextUI, Tailwind
- **Contenitore:** Electron (Windows via Microsoft Store, macOS, Linux)
- **Archivio:** SQLite locale (`sql.js`) usato come store chiave-valore
- **Referti:** PDF generati con jsPDF (referto di visita, ricetta, certificato,
  richiesta di esame)

## La visita cardiologica

Un solo tipo di visita, come in ambulatorio: il referto è diviso in otto sezioni.

1. Descrizione problema / dati clinici
2. Anamnesi — campo unico oppure sezioni multiple configurabili
   (familiare, fisiologica, patologica, chirurgica, farmacologica, allergica,
   abitudini di vita + sezioni personalizzate)
3. Esame obiettivo
4. **Elettrocardiogramma** — ritmo, PR, QRS, QT, asse, QTc calcolato, referto
5. **Ecocardiogramma** — DTD/DTS, SIV, PP, FE, atrio sinistro, radice aortica,
   aorta ascendente, TAPSE, PAPs, E/A, E/e', referto
6. **TC coronarica** — data, struttura, calcium score con fascia Agatston,
   CAD-RADS, sintesi del referto radiologico
7. Accertamenti
8. Conclusioni e terapia

Colonna di sinistra: parametri vitali (P.A., F.C., fumo), peso con BMI,
esami di laboratorio e indici calcolati, immagini allegabili al PDF.

Nel PDF ogni modulo strumentale è reso come tabella a griglia (etichetta sopra,
valore in grassetto sotto, righe a bande alterne) e le sezioni hanno
un'intestazione su barra grigia: con otto sezioni e una dozzina di misure per
modulo, la vecchia riga continua separata da punti era illeggibile. Nella
tabella degli esami ematochimici compaiono anche LDL secondo Friedewald (quando
manca il dosaggio diretto) ed eGFR, etichettati come calcolati e accompagnati
dalla nota che sono stime derivate, non risultati di laboratorio.

Ogni modulo ha i propri modelli di refertazione riutilizzabili, gestibili da
Impostazioni → Modelli.

## Gruppi di ricerca

Si attivano dalla card dedicata in Impostazioni. Servono a etichettare i
pazienti inclusi in un progetto e a ritrovarli tutti insieme.

- **Impostazioni:** crea, rinomina ed elimina i gruppi, con il numero di
  partecipanti. Rinominare aggiorna tutti i pazienti che usano il gruppo;
  eliminare lo toglie da tutti, previa conferma con il conteggio.
- **Scheda paziente:** chip compatti accanto ai dati anagrafici. Il `+` assegna
  un gruppo esistente o ne crea uno al volo; cliccando un chip si corregge la
  data di arruolamento.
- **Elenco pazienti:** mostra sempre **tutti** i pazienti, con un badge sulla
  card di chi fa parte di un progetto. Nessun filtro per gruppo qui: la vista
  per progetti sta nella pagina dedicata.
- **Dashboard:** terza colonna con i progetti attivi, partecipanti e da quanto
  tempo vanno avanti.
- **Pagina "Gruppi di ricerca"** (`/gruppi-ricerca`): contiene **solo** i
  pazienti arruolati, raggruppati per progetto, ciascuno con la data di
  arruolamento e da quanto tempo ne fa parte. Chi sta in due progetti compare
  sotto entrambi. Ha una ricerca interna fra gli arruolati e si apre sul singolo
  progetto con `?gruppo=Nome`. Ci si arriva dal pannello in dashboard: il
  pulsante apre tutti gli arruolati, il clic su un progetto apre quello.

L'appartenenza è salvata **sul paziente** (`Patient.gruppiRicerca`: nome del
gruppo più data di arruolamento), non in un archivio separato. I backup
contengono i pazienti ma non le preferenze, quindi dopo un ripristino
assegnazioni e date sopravvivono e i gruppi ricompaiono dai dati; l'elenco
mostrato è sempre l'unione fra il registro in Impostazioni e i gruppi già in
uso. La durata di un progetto è calcolata dalla data di arruolamento più
vecchia fra i suoi pazienti, così non serve una data di inizio a parte. Il
vecchio formato a sole stringhe viene ancora letto senza perdere i dati.

## Indici calcolati

Sono **suggerimenti**: compaiono in un riquadro a parte, riportano sempre la
formula di provenienza e non vengono mai scritti automaticamente nei campi del
referto. L'interpretazione resta del medico.

| Indice | Formula | Limiti applicati |
|---|---|---|
| LDL | Friedewald (tot − HDL − TG/5) | non calcolato con TG ≥ 400 mg/dL |
| Colesterolo non-HDL | totale − HDL | — |
| eGFR + stadio KDIGO | CKD-EPI 2021 senza coefficiente etnico | richiede età e sesso |
| HOMA-IR | (glicemia × insulinemia) / 405 | solo su prelievo a digiuno |
| QTc | Bazett (QT / √RR) | segnalato come inaffidabile fuori da 50-100 bpm |
| Fascia calcium score | fasce Agatston 0 / 1-99 / 100-399 / ≥ 400 | descrittiva, non diagnostica |
| SCORE2 | modello ESC 2021 per regione di rischio | **non attivo**, vedi sotto |

### SCORE2: perché è disattivato

I coefficienti pubblicati di SCORE2 stanno solo nel materiale supplementare di
*Eur Heart J 2021;42:2439-2454* (Supplementary Table S7), non nel testo
dell'articolo né nei manuali dei calcolatori online: non è stato possibile
verificarli sulla fonte primaria.

La pipeline è completa e coperta da test, ma
`SCORE2_COEFFICIENTS_VALIDATED` in
[`src/utils/score2Coefficients.ts`](src/utils/score2Coefficients.ts) è a
`false`, quindi l'app mostra il motivo invece di un numero di rischio
potenzialmente sbagliato. Per attivarlo: confrontare ogni valore della tabella
con la Supplementary S7, correggere quelli errati e mettere il flag a `true`.

## Requisiti

Node.js 18+ e npm.

## Comandi

```bash
npm install          # dipendenze
npm run electron:dev # app in sviluppo (Vite + Electron)
npm run dev          # solo interfaccia nel browser, su http://localhost:5173
npm test             # test (vitest)
npm run typecheck    # controllo dei tipi
npm run lint         # eslint
npm run build        # typecheck + build dell'interfaccia
npm run dist         # pacchetto desktop (electron-builder)
```

`npm run build` esegue `tsc --noEmit` prima di Vite: un errore di tipi ferma la build.

## Struttura

```
electron/          processo principale: finestra, archivio SQLite, backup, stampa
  backupFiles.js     scrittura atomica del DB, copie di sicurezza, ripristino
  printFiles.js      PDF di stampa in %TEMP%/CorioliCardiologia/stampe
  appLock.js         PIN, codice di recupero, Windows Hello / Touch ID
src/
  Pages/Dashboard/   home, pazienti, visite, documenti, impostazioni
  components/cardio/ campi misura e riquadri degli indici calcolati
  services/          accesso ai dati, PDF, import CSV, backup, chat assistenza
  utils/cardioCalcs  calcolatori cardiologici
  utils/score2Coefficients  tabella dei coefficienti SCORE2 (da validare)
```

## Dati e backup

Tutto sta in `%APPDATA%/CorioliCardiologia` (Windows) o
`~/Library/Application Support/CorioliCardiologia` (macOS):

| Percorso | Contenuto |
|----------|-----------|
| `corioli-cardiologia.db` | archivio pazienti, visite, documenti, modelli |
| `corioli-cardiologia.db.bak` | copia dello stato con cui si è aperta la sessione |
| `backups/` | copie automatiche (giornaliera, pre-import, pre-ripristino, manuale) |

L'archivio è **separato da quello di Corioli**: le due applicazioni possono
convivere sullo stesso computer senza interferire.

> **Nota sulla migrazione.** La cartella dati è cambiata rispetto alle build
> precedenti (`CorioliGenerale` → `CorioliCardiologia`): i dati inseriti in una
> build di prova non vengono letti automaticamente. Per portarli avanti:
> esportare il backup JSON dalle impostazioni della vecchia build e importarlo
> nella nuova.

Il database viene scritto in modo atomico (file temporaneo + `rename`): una
scrittura interrotta non può corromperlo. All'avvio, se il file principale è
illeggibile, viene messo da parte e si riparte dalla copia `.bak`.

L'export JSON dalle impostazioni resta il backup da **conservare altrove**: le
copie automatiche stanno sullo stesso disco dell'app.

## Test

I test coprono i calcolatori cardiologici, le date locali, la validazione e
l'import dei backup, la migrazione dei dati demo e i moduli Electron di backup
e stampa.

```bash
npm test
```

## Da completare prima della distribuzione

- **SCORE2:** validare i coefficienti come descritto sopra.
- **Microsoft Store:** `identityName` (`CorioliCardiologia.CorioliCardiologia`)
  va riservato in Partner Center e l'ID della scheda in
  `src/Pages/Dashboard/Settings.tsx` (`CORIOLI_MS_STORE_ID`) va sostituito con
  quello della nuova app.
- **Backend licenze:** l'heartbeat invia `app: "corioli-cardiologia"`. Il
  backend (`Corioli-Dashboard-BE/utils/apps.js`) accetta oggi solo `corioli` e
  `corioli-pediatria` e normalizza qualsiasi altro valore a `corioli`: la
  chiamata risponde 200 e blocco/licenza funzionano, ma questa edizione risulta
  indistinguibile da Corioli in dashboard. Per separarla basta aggiungere
  `"corioli-cardiologia"` a `VALID_APPS` e il relativo caso in `mapAppToTipo`
  (`tipo` e `app` sono colonne `String`, nessuna migrazione DB necessaria).
- **Layout del referto:** in attesa dei referti reali del cardiologo per
  allineare tipografia e occupazione della pagina.

## Avvertenza

Corioli Cardiologia non è un dispositivo medico certificato. Gli indici
calcolati sono strumenti di supporto: non pongono diagnosi, non propongono
soglie terapeutiche e vanno letti nel contesto clinico complessivo.

## Privacy

I dati sanitari non lasciano il computer. Verso il server vanno solo la
telemetria di licenza (dati del medico e conteggi aggregati) e la chat di
assistenza. Stato di conformità e attività aperte: [Corioli-GDPR-backlog.md](Corioli-GDPR-backlog.md).
