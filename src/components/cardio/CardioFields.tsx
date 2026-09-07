import { useState, type ReactNode } from "react";
import {
  Button,
  Chip,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
} from "@nextui-org/react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import type { CalcOutcome } from "../../utils/cardioCalcs";
import type { LivelloSegnale, Segnale } from "../../utils/rangeClinici";
import type { EsitoTarget } from "../../utils/rischioCv";
import {
  dataBreve,
  descriviPrecedente,
  variazione,
  type PuntoStorico,
  type ValorePrecedente,
} from "../../utils/confrontoMisure";
import { PannelloAndamento, Sparkline } from "./GraficoAndamento";

/** Data di oggi in `aaaa-mm-gg`, ripiego quando la visita non passa la sua. */
function oggiIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const g = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${g}`;
}

/** Classi del bordo per livello di segnalazione. */
const BORDO_SEGNALE: Record<LivelloSegnale, string> = {
  "nella-norma": "",
  attenzione: "border-warning-400 data-[hover=true]:border-warning-500",
  alterato: "border-danger-400 data-[hover=true]:border-danger-500",
};

/**
 * Classi del testo per livello di segnalazione.
 *
 * L'ambra e' al passo 700 e non al 600: su fondo bianco il 600 sta a 3,15 di
 * contrasto, sotto il minimo leggibile, e queste note sono scritte piccole.
 * Il 700 sale a 5,2 restando riconoscibile come giallo di avviso.
 */
const TESTO_SEGNALE: Record<LivelloSegnale, string> = {
  "nella-norma": "text-default-400",
  attenzione: "text-warning-700",
  alterato: "text-danger-600",
};

const PALLINO_SEGNALE: Record<LivelloSegnale, string> = {
  "nella-norma": "bg-default-300",
  attenzione: "bg-warning-500",
  alterato: "bg-danger-500",
};

/**
 * Riga sotto il campo con il valore della volta scorsa e di quanto e' cambiato.
 *
 * Il delta e' scritto in grigio come il resto: la direzione di una misura non
 * e' buona o cattiva di per se' (un calo della frazione di eiezione peggiora,
 * un calo dell'LDL migliora), quindi colorarlo darebbe un giudizio che il dato
 * da solo non porta. A dare il colore e' semmai il semaforo delle soglie.
 */
function RigaPrecedente({
  precedente,
  corrente,
}: {
  precedente: ValorePrecedente;
  corrente: number | string | undefined;
}) {
  const delta = variazione(corrente, precedente.valore);
  const freccia =
    delta == null || delta.verso === "stabile" ? "" : delta.verso === "su" ? "▲" : "▼";

  return (
    <Tooltip content={descriviPrecedente(precedente)} placement="bottom" delay={300}>
      <span className="inline-flex min-w-0 items-center gap-1 text-[10px] leading-tight text-default-400 cursor-help">
        <span className="font-medium text-default-500">
          prec. {String(precedente.valore).replace(".", ",")}
        </span>
        <span className="text-default-300">·</span>
        <span>{dataBreve(precedente.data)}</span>
        {delta && delta.verso !== "stabile" && (
          <>
            <span className="text-default-300">·</span>
            <span className="whitespace-nowrap">
              {freccia} {delta.display}
            </span>
          </>
        )}
      </span>
    </Tooltip>
  );
}

/** Riga sotto il campo con il motivo della segnalazione. */
function RigaSegnale({ segnale }: { segnale: Segnale }) {
  if (segnale.livello === "nella-norma") return null;
  return (
    <span
      className={`inline-flex items-start gap-1 text-[10px] leading-tight ${
        TESTO_SEGNALE[segnale.livello]
      }`}
    >
      <span
        className={`mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full ${
          PALLINO_SEGNALE[segnale.livello]
        }`}
        aria-hidden
      />
      <span>{segnale.nota}</span>
    </span>
  );
}

/**
 * Miniatura dell'andamento accanto al valore precedente, che apre il grafico
 * esteso. Compare solo da due rilevazioni in su: con un punto solo non c'e'
 * nessuna traiettoria da mostrare e il campo resta pulito.
 */
function BottoneAndamento({
  titolo,
  unita,
  serie,
  corrente,
  dataCorrente,
  riferimento,
}: {
  titolo: string;
  unita?: string;
  serie: PuntoStorico[];
  corrente?: number;
  dataCorrente: string;
  riferimento?: { min?: number; max?: number };
}) {
  const conCorrente = corrente != null && Number.isFinite(corrente);
  if (serie.length + (conCorrente ? 1 : 0) < 2) return null;

  return (
    <Popover placement="right" showArrow>
      <PopoverTrigger>
        <button
          type="button"
          className="block w-full max-w-full rounded opacity-80 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          aria-label={`Andamento di ${titolo} nel tempo`}
        >
          <Sparkline
            serie={serie}
            corrente={corrente}
            dataCorrente={dataCorrente}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <PannelloAndamento
          titolo={titolo}
          unita={unita}
          serie={serie}
          corrente={corrente}
          dataCorrente={dataCorrente}
          riferimento={riferimento}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Campo numerico per una misura strumentale o di laboratorio.
 *
 * Tiene una bozza testuale mentre il campo ha il focus, così si può digitare
 * "1," senza che il valore venga interpretato e riscritto a metà digitazione.
 * Il valore salvato è `undefined` quando il campo è vuoto: uno zero avrebbe il
 * significato clinico di "misurato e pari a zero", che non è la stessa cosa.
 *
 * Sotto al campo compaiono, quando ci sono, il valore della visita precedente
 * con la sua variazione e il motivo per cui il valore è fuori range.
 */
export function MisuraInput({
  label,
  value,
  onValueChange,
  unit,
  placeholder,
  decimals = true,
  draft,
  onDraftChange,
  precedente,
  segnale,
  serie,
  dataCorrente,
  riferimento,
}: {
  label: string;
  value: number | undefined;
  onValueChange: (value: number | undefined) => void;
  unit?: string;
  placeholder?: string;
  decimals?: boolean;
  draft: string | null;
  onDraftChange: (draft: string | null) => void;
  precedente?: ValorePrecedente;
  segnale?: Segnale;
  /** Rilevazioni precedenti della stessa misura, per l'andamento nel tempo. */
  serie?: PuntoStorico[];
  /** Data della visita aperta: colloca nel tempo il valore in digitazione. */
  dataCorrente?: string;
  /** Intervallo di riferimento da ombreggiare nel grafico esteso. */
  riferimento?: { min?: number; max?: number };
}) {
  const pattern = decimals ? /^\d*[.,]?\d*$/ : /^\d*$/;
  const shown = draft ?? (value == null ? "" : String(value).replace(".", ","));
  const livello = segnale?.livello ?? "nella-norma";

  const commit = (raw: string) => {
    const t = raw.trim().replace(",", ".");
    if (t === "" || t === ".") {
      onValueChange(undefined);
      return;
    }
    const n = Number(t);
    onValueChange(Number.isFinite(n) ? n : undefined);
  };

  const storico = serie ?? [];
  const mostraAndamento =
    storico.length + (value != null && Number.isFinite(value) ? 1 : 0) >= 2;

  const note =
    precedente || livello !== "nella-norma" || mostraAndamento ? (
      <span className="flex min-w-0 flex-col gap-0.5 pt-0.5">
        {segnale && <RigaSegnale segnale={segnale} />}
        {precedente && <RigaPrecedente precedente={precedente} corrente={value} />}
        {/* Il grafico sta su una riga sua: accanto al valore precedente non
            entrerebbe nella colonna stretta del laboratorio. */}
        <BottoneAndamento
          titolo={label}
          unita={unit}
          serie={storico}
          corrente={value}
          dataCorrente={dataCorrente ?? oggiIso()}
          riferimento={riferimento}
        />
      </span>
    ) : undefined;

  return (
    <Input
      label={label}
      type="text"
      inputMode={decimals ? "decimal" : "numeric"}
      size="sm"
      variant="bordered"
      labelPlacement="outside"
      placeholder={placeholder}
      value={shown}
      description={note}
      classNames={{
        inputWrapper: BORDO_SEGNALE[livello],
        description: "m-0",
      }}
      endContent={
        unit ? (
          <span className="text-[11px] text-default-400 whitespace-nowrap">{unit}</span>
        ) : undefined
      }
      onFocus={() => onDraftChange(shown)}
      onBlur={() => {
        if (draft !== null) commit(draft);
        onDraftChange(null);
      }}
      onValueChange={(v) => {
        if (v !== "" && !pattern.test(v)) return;
        onDraftChange(v);
      }}
    />
  );
}

/**
 * Note da mettere sotto un campo che non e' un `MisuraInput` — pressione,
 * frequenza, peso. Restituisce `undefined` quando non c'e' niente da dire, così
 * il campo resta pulito invece di riservare spazio a una riga vuota.
 */
export function NoteCampo({
  precedente,
  corrente,
  segnale,
}: {
  precedente?: ValorePrecedente;
  corrente?: number | string;
  segnale?: Segnale;
}): ReactNode {
  const haSegnale = segnale && segnale.livello !== "nella-norma";
  if (!precedente && !haSegnale) return undefined;
  return (
    <span className="flex flex-col gap-0.5 pt-0.5">
      {segnale && <RigaSegnale segnale={segnale} />}
      {precedente && <RigaPrecedente precedente={precedente} corrente={corrente} />}
    </span>
  );
}

/**
 * Valore precedente per i campi che non sono numerici (ritmo, CAD-RADS): niente
 * delta, solo cos'era e quando. Va messo sotto al `Select` corrispondente.
 */
export function PrecedenteTesto({
  precedente,
  descrivi,
}: {
  precedente: ValorePrecedente | undefined;
  /** Trasforma il valore salvato nell'etichetta mostrata (es. chiave CAD-RADS). */
  descrivi?: (valore: string) => string;
}) {
  if (!precedente) return null;
  const grezzo = String(precedente.valore);
  const testo = descrivi ? descrivi(grezzo) : grezzo;
  return (
    <Tooltip content={descriviPrecedente(precedente)} placement="bottom" delay={300}>
      <p className="text-[10px] leading-tight text-default-400 cursor-help pt-0.5">
        <span className="font-medium text-default-500">prec. {testo}</span>
        <span className="text-default-300"> · </span>
        {dataBreve(precedente.data)}
      </p>
    </Tooltip>
  );
}

/**
 * Risultato di un calcolatore, mostrato come **suggerimento**: non viene mai
 * scritto in automatico nei campi del referto e riporta sempre la formula di
 * provenienza. Se il calcolo non è possibile mostra il motivo, così è chiaro
 * cosa manca invece di lasciare il riquadro vuoto.
 */
export function CalcSuggestion({
  label,
  outcome,
  emphasis = false,
  segnale,
  banda,
  precedente,
}: {
  label: string;
  outcome: CalcOutcome;
  emphasis?: boolean;
  segnale?: Segnale;
  /** Testo della fascia di appartenenza (es. categoria di rischio). */
  banda?: ReactNode;
  precedente?: ValorePrecedente;
}) {
  if (!outcome.ok) {
    return (
      <div className="rounded-lg border border-dashed border-default-200 bg-default-50/60 px-2.5 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-default-400">
          {label}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-default-400">
          {outcome.reason}
        </p>
      </div>
    );
  }

  const { display, unit, source, value } = outcome.result;
  const livello = segnale?.livello ?? "nella-norma";
  const cornice =
    livello === "alterato"
      ? "border-danger-300 bg-danger-50/60"
      : livello === "attenzione"
        ? "border-warning-300 bg-warning-50/60"
        : emphasis
          ? "border-primary-200 bg-primary-50/70"
          : "border-default-200 bg-white";

  return (
    <div className={`rounded-lg border px-2.5 py-2 ${cornice}`}>
      <div className="flex items-center justify-between gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-default-500">
          {label}
        </p>
        <Tooltip content={source} placement="top" delay={200}>
          <span className="text-default-300 cursor-help">
            <Info size={12} />
          </span>
        </Tooltip>
      </div>
      <p
        className={`mt-0.5 font-semibold leading-tight ${
          emphasis ? "text-primary-700 text-base" : "text-gray-800 text-sm"
        }`}
      >
        {display}
        {unit ? <span className="ml-1 text-[11px] font-normal">{unit}</span> : null}
      </p>
      {banda && <div className="mt-1">{banda}</div>}
      {segnale && <RigaSegnale segnale={segnale} />}
      {precedente && (
        <div className="mt-0.5">
          <RigaPrecedente precedente={precedente} corrente={value} />
        </div>
      )}
    </div>
  );
}

/**
 * Confronto fra un valore lipidico e l'obiettivo della classe di rischio che il
 * medico ha dichiarato.
 *
 * Il riquadro dice due cose e si ferma lì: qual è l'obiettivo di quella classe
 * secondo le linee guida, e quanto dista il valore misurato. Non suggerisce
 * come colmare la distanza, perché la scelta terapeutica dipende dal quadro
 * complessivo e da cose che il gestionale non vede.
 *
 * Quando la classe non è stata indicata il riquadro non compare affatto:
 * mostrare un obiettivo scelto da noi sarebbe peggio che non mostrarne nessuno.
 */
export function RiquadroTarget({
  label,
  esito,
  valore,
  unita = "mg/dL",
  categoria,
  nota,
}: {
  label: string;
  esito: EsitoTarget | null;
  /** Valore misurato, già formattato. */
  valore?: string;
  unita?: string;
  /** Etichetta della classe di rischio dichiarata. */
  categoria?: string;
  /** Riga aggiuntiva, es. la provenienza del valore di LDL. */
  nota?: string;
}) {
  if (!esito) return null;

  return (
    <div
      className={`rounded-lg border px-2.5 py-2 ${
        esito.aTarget
          ? "border-success-300 bg-success-50/70"
          : "border-warning-300 bg-warning-50/70"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-default-600">
          {label}
        </p>
        <p className="text-[11px] font-semibold text-default-600 whitespace-nowrap">
          &lt; {esito.target} {unita}
        </p>
      </div>
      <p
        className={`mt-0.5 text-xs font-semibold leading-snug ${
          esito.aTarget ? "text-success-700" : "text-warning-700"
        }`}
      >
        {valore ? `${valore} ${unita} · ` : ""}
        {esito.testo}
      </p>
      <p className="mt-0.5 text-[10px] leading-tight text-default-500">
        {categoria ? `${categoria} · ` : ""}ESC/EAS 2019, agg. 2025
        {esito.opzionale ? " · obiettivo dato come opzione considerabile" : ""}
      </p>
      {nota && (
        <p className="text-[10px] leading-tight text-default-500">{nota}</p>
      )}
    </div>
  );
}

/** Intestazione compatta per i blocchi di misure dentro il referto. */
/**
 * Riga di un valore derivato: nome a sinistra, numero a destra.
 *
 * I riquadri di `CalcSuggestion` vanno bene per i due o tre indici che il
 * medico guarda per primi, ma impilati costano una settantina di pixel l'uno
 * per una coppia nome-numero. In fondo a un pannello di laboratorio servono
 * righe: si leggono in colonna come un referto e costano un terzo dello spazio.
 *
 * Quando il calcolo non e' possibile la riga resta con un trattino e il motivo
 * in chiaro: sapere che manca l'insulinemia e' piu' utile che non vedere
 * comparire l'HOMA e non capire perche'.
 */
export function RigaCalcolata({
  label,
  outcome,
  segnale,
}: {
  label: string;
  outcome: CalcOutcome;
  segnale?: Segnale;
}) {
  const livello = segnale?.livello ?? "nella-norma";

  if (!outcome.ok) {
    return (
      <Tooltip content={outcome.reason} placement="left" delay={200}>
        <div className="flex cursor-help items-baseline justify-between gap-2 py-1">
          <span className="text-xs text-default-500">{label}</span>
          <span className="text-sm text-default-300">—</span>
        </div>
      </Tooltip>
    );
  }

  const { display, unit, source } = outcome.result;
  // Nel tooltip la formula e, quando c'e', la soglia per esteso: nella riga
  // resta la parola della fascia, che e' quello che si legge di sfuggita.
  const spiegazione = segnale?.nota ? `${source} · ${segnale.nota}` : source;

  return (
    <Tooltip content={spiegazione} placement="left" delay={200}>
      <div className="flex cursor-help items-baseline justify-between gap-2 py-1">
        <span className="text-xs text-default-600">{label}</span>
        <span className="flex items-baseline gap-1.5 whitespace-nowrap">
          {segnale?.etichetta && (
            <span
              className={`text-[10px] font-medium ${TESTO_SEGNALE[livello]}`}
            >
              {segnale.etichetta}
            </span>
          )}
          <span
            className={`text-[15px] font-semibold tabular-nums leading-none ${
              livello === "nella-norma" ? "text-gray-900" : TESTO_SEGNALE[livello]
            }`}
          >
            {display}
          </span>
          {unit ? (
            <span className="text-[10px] font-normal text-default-500">
              {unit}
            </span>
          ) : null}
        </span>
      </div>
    </Tooltip>
  );
}

/**
 * Striscia dei valori derivati in coda a un pannello di misure.
 *
 * Non compare finche' non c'e' almeno un valore calcolabile: su un pannello
 * ancora vuoto sarebbe una colonna di trattini che occupa spazio senza dire
 * niente.
 */
export function StrisciaCalcolati({ children }: { children: ReactNode }) {
  return (
    <div className="mt-1 rounded-md bg-default-50/70 px-2.5 py-2">
      {/* `default-500` e non `400`: a 9px il grigio più chiaro scende sotto il
          contrasto minimo leggibile, e questa didascalia dice una cosa che deve
          restare leggibile, cioè che i valori sotto non sono dosati. */}
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-default-500">
        Calcolati · non entrano nel referto
      </p>
      <div className="divide-y divide-default-200/70">{children}</div>
    </div>
  );
}

/**
 * Intestazione di un gruppo di misure dentro una scheda.
 *
 * Il laboratorio di una visita cardiologica arriva a una quindicina di campi
 * numerici uguali fra loro: in fila diventano un muro in cui si cerca a occhio.
 * Divisi per pannello (lipidico, glucidico, renale) si trova il campo dove il
 * medico se lo aspetta, cioe' nell'ordine in cui e' scritto il referto del
 * laboratorio.
 *
 * Il conteggio a destra dice quanti campi del gruppo sono compilati, così a
 * colpo d'occhio si vede cosa manca senza rileggere ogni casella.
 */
export function GruppoCampi({
  titolo,
  compilati,
  totale,
  children,
}: {
  titolo: string;
  compilati: number;
  totale: number;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 border-b border-default-200 pb-1">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-default-600">
          {titolo}
        </h4>
        {compilati > 0 && (
          <span className="text-[10px] tabular-nums text-default-500">
            {compilati}/{totale}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

export function ModuloHeader({
  numero,
  titolo,
  azione,
}: {
  numero: string;
  titolo: string;
  azione?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-end mb-1">
      <label className="text-sm font-bold text-gray-700">
        {numero}. {titolo}
      </label>
      {azione}
    </div>
  );
}

/**
 * Modulo che si apre solo quando serve.
 *
 * Holter e test da sforzo non fanno parte di ogni visita: tenerli sempre aperti
 * allungherebbe la pagina di tre blocchi che nella maggior parte dei referti
 * restano vuoti. Parte aperto se contiene già dei dati, così una visita
 * riaperta in modifica mostra subito quello che c'è dentro.
 */
export function ModuloCollassabile({
  numero,
  titolo,
  sottotitolo,
  compilato,
  azione,
  children,
}: {
  numero: string;
  titolo: string;
  sottotitolo?: string;
  /** Il modulo contiene dati: parte aperto e lo segnala nell'intestazione. */
  compilato: boolean;
  azione?: ReactNode;
  children: ReactNode;
}) {
  const [apertoManualmente, setApertoManualmente] = useState<boolean | null>(null);
  const aperto = apertoManualmente ?? compilato;

  return (
    <div className="space-y-2 relative group">
      <div className="flex justify-between items-center gap-2">
        <Button
          type="button"
          variant="light"
          size="sm"
          disableRipple
          className="h-auto min-w-0 justify-start gap-1.5 px-0 py-0.5 data-[hover=true]:bg-transparent"
          onPress={() => setApertoManualmente(!aperto)}
          aria-expanded={aperto}
        >
          {aperto ? (
            <ChevronDown size={15} className="text-default-400" />
          ) : (
            <ChevronRight size={15} className="text-default-400" />
          )}
          <span className="text-sm font-bold text-gray-700">
            {numero}. {titolo}
          </span>
          {!aperto && sottotitolo && (
            <span className="text-xs font-normal text-default-400">
              — {sottotitolo}
            </span>
          )}
          {compilato && (
            <Chip
              size="sm"
              variant="flat"
              classNames={{
                base: "h-4 bg-primary-50 border border-primary-200",
                content: "px-1.5 text-[10px] font-medium text-primary-600",
              }}
            >
              compilato
            </Chip>
          )}
        </Button>
        {aperto && azione}
      </div>
      {/* `flex flex-col gap-2` e non `space-y-2`: le etichette
          `labelPlacement="outside"` sono posizionate in modo assoluto e NextUI
          riserva loro spazio con un margine sul campo, che `space-y-*`
          sovrascrive facendole finire sopra alla riga precedente. Vale la
          stessa ragione già annotata sulla card del rischio; `gap` non tocca i
          margini dei figli e lascia il ritmo verticale invariato. */}
      {aperto && <div className="flex flex-col gap-2">{children}</div>}
    </div>
  );
}
