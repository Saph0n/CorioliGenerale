import jsPDF from "jspdf";
import {
  Patient, Visit, Doctor,
  RichiestaEsameComplementare,
  CertificatoPaziente,
  RicettaPaziente,
} from "../types/Storage";
import { DoctorService, PreferenceService, VisitService } from "./OfflineServices";
import {
  normalizeSignatureStampImage,
  signatureStampPdfFormat,
  SIGNATURE_STAMP_PDF_LAYOUT_W,
  SIGNATURE_STAMP_PDF_LAYOUT_H,
} from "../utils/signatureStamp";
import {
  ALL_ANAMNESI_CAMPO_KEYS,
  hasAnamnesiStrutturataContent,
  resolveAnamnesiLabel,
  parseAnamnesiConfig,
} from "../utils/anamnesiStrutturata";
import { getRicettaTesto } from "../utils/ricettaTemplate";
import {
  calcolaCaloNotturno,
  calcolaEgfrCkdEpi,
  calcolaPercentualeFcMax,
  calcolaLdlFriedewald,
  calcolaQtcBazett,
  calcolaRapportoCtHdl,
  calcolaRapportoTgHdl,
  stadioKdigo,
} from "../utils/cardioCalcs";
import {
  CONTESTO_BNP_LABELS,
  FENOTIPO_DA_DEFINIRE,
  fenotipoConStorico,
  valutaNtProBnp,
  type FePrecedente,
} from "../utils/scompenso";
import {
  calcolaChadsVasc,
  calcolaHasBled,
} from "../utils/fibrillazioneAtriale";
import {
  CAD_RADS_CATEGORIE,
  SOGLIA_CAC_PREDEFINITA,
  categoriaCac,
  segmentoScct,
  type SogliaCacSevera,
} from "../utils/tcCoronarica";

// ─── Layout ──────────────────────────────────────────────────────────────────
const ML = 15;
const MR = 195;
const PW = MR - ML;   // 180 mm
const PAGE_H = 297;
const FOOT_Y = PAGE_H - 14;
const LH = 4.8;

// ─── B&W palette ─────────────────────────────────────────────────────────────
const K0 = [0, 0, 0] as const;
const K30: [number, number, number] = [30, 30, 30];
const K80: [number, number, number] = [80, 80, 80];
const K140: [number, number, number] = [140, 140, 140];
const K200: [number, number, number] = [200, 200, 200];
const K235: [number, number, number] = [235, 235, 235];
const K240: [number, number, number] = [240, 240, 240];


interface VisitPdfOptions {
  /** Allega al referto le immagini caricate nella visita. */
  includeImages?: boolean;
}
interface FooterVisibilityOptions {
  showDoctorPhoneInPdf?: boolean;
  showDoctorEmailInPdf?: boolean;
}

// ─── Sanitizer + utils ────────────────────────────────────────────────────────

/**
 * Accenti -> apostrofo ASCII per la stampa.
 *
 * Il font standard di jsPDF (WinAnsi) non disegna le vocali accentate: senza
 * questa conversione il referto uscirebbe con caratteri sbagliati. E' il motivo
 * per cui nell'applicazione i testi si possono scrivere accentati.
 *
 * Esportata per essere coperta dai test: la mappa e' due righe di coppie
 * numero-stringa, si e' gia' rotta una volta durante una correzione
 * tipografica automatica, e un errore qui non si vede finche' qualcuno non
 * stampa un referto.
 */
export function san(t: string): string {
  if (!t) return "";
  const M: Record<number, string> = {
    224: "a'", 232: "e'", 233: "e'", 236: "i'", 242: "o'", 249: "u'",
    192: "A'", 200: "E'", 201: "E'", 204: "I'", 210: "O'", 217: "U'",
  };
  let r = "";
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    if (M[c]) { r += M[c]; continue; }
    if (c === 195 && i + 1 < t.length) {
      const n = t.charCodeAt(i + 1);
      const U: Record<number, string> = { 160: "a'", 168: "e'", 169: "e'", 172: "i'", 178: "o'", 185: "u'" };
      if (U[n]) { r += U[n]; i++; continue; }
    }
    r += t[i];
  }
  return r;
}

function fd(d: string): string {
  if (!d) return "-";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "-" : dt.toLocaleDateString("it-IT");
}
function calcAge(dob: string): string {
  if (!dob) return "";
  const b = new Date(dob); if (isNaN(b.getTime())) return "";
  const t = new Date(); let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return String(a);
}
function v(x: string | number | undefined | null, fb = "-"): string {
  return (x === undefined || x === null || String(x).trim() === "") ? fb : String(x);
}

/** True se il valore mostrato indica "campo non inserito": la riga non va stampata nel PDF. */
function isInquadramentoValueEmpty(val: string): boolean {
  if (!val || String(val).trim() === "") return true;
  const s = String(val).trim();
  if (s === "-") return true;
  if (s === "0") return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
export class PdfService {

  private static fCtx: { doctor: Doctor | null; opts: FooterVisibilityOptions } | null = null;

  private static fc(d: jsPDF, c: readonly number[]) { d.setFillColor(c[0], c[1], c[2]); }
  private static dc(d: jsPDF, c: readonly number[]) { d.setDrawColor(c[0], c[1], c[2]); }
  private static tc(d: jsPDF, c: readonly number[]) { d.setTextColor(c[0], c[1], c[2]); }

  // ── page break ───────────────────────────────────────────────────────────────
  private static pb(doc: jsPDF, y: number, need = 30): number {
    if (y + need > FOOT_Y - 8) {
      if (this.fCtx) this.drawFooter(doc, this.fCtx.doctor, this.fCtx.opts);
      doc.addPage(); return 18;
    }
    return y;
  }

  // ── multiline text block ─────────────────────────────────────────────────────
  /** textStyle: ripristina font/size/colore prima di ogni riga (necessario dopo salto pagina, perché drawFooter cambia lo stile). */
  private static block(
    doc: jsPDF,
    text: string,
    x: number,
    y: number,
    maxW: number,
    lh = LH,
    textStyle?: { font?: "helvetica" | "times"; style?: "normal" | "bold" | "italic"; fontSize?: number; color?: readonly number[] },
  ): number {
    if (!text?.trim()) return y;
    const lines: string[] = doc.splitTextToSize(san(text), maxW);
    for (const line of lines) {
      y = this.pb(doc, y, lh + 1);
      if (textStyle) {
        doc.setFont(textStyle.font ?? "helvetica", textStyle.style ?? "normal");
        if (textStyle.fontSize != null) doc.setFontSize(textStyle.fontSize);
        if (textStyle.color) this.tc(doc, textStyle.color);
      }
      doc.text(line, x, y);
      y += lh;
    }
    return y;
  }

  // ── horizontal rule ──────────────────────────────────────────────────────────
  private static rule(doc: jsPDF, y: number, x1 = ML, x2 = MR, lw = 0.2) {
    this.dc(doc, K200); doc.setLineWidth(lw); doc.line(x1, y, x2, y);
  }

  /**
   * Griglia "Inquadramento" in stile referto: titolo di sezione + N colonne,
   * ciascuna con sotto-intestazione su barra grigia e righe "Etichetta: valore".
   * Le righe con valore vuoto/zero ("-", "0", ...) vengono nascoste; se non resta
   * alcun dato la sezione non viene disegnata.
   */
  private static drawInquadramentoGrid(
    doc: jsPDF, y: number, title: string,
    columns: { header: string; items: { label: string; value: string }[] }[],
  ): number {
    const cols = columns.map((c) => ({
      header: c.header,
      items: c.items.filter((it) => !isInquadramentoValueEmpty(it.value)),
    }));
    if (!cols.some((c) => c.items.length > 0)) return y;

    y = this.heading(doc, y, title);
    y = this.pb(doc, y, 40);

    const colW = PW / cols.length;
    let maxY = y;

    for (let c = 0; c < cols.length; c++) {
      const cx = ML + c * colW;

      this.fc(doc, K240);
      doc.rect(cx, y, colW - 2, 6, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); this.tc(doc, K30);
      doc.text(san(cols[c].header), cx + 2, y + 4);

      let cy = y + 11;
      doc.setFontSize(8);

      for (const item of cols[c].items) {
        doc.setFont("helvetica", "bold"); this.tc(doc, K80);
        const lbl = san(item.label) + ": ";
        doc.text(lbl, cx, cy);

        doc.setFont("helvetica", "normal"); this.tc(doc, K0);
        const lblWidth = doc.getTextWidth(lbl);
        const valueX = cx + lblWidth + 1; // piccolo margine tra titolo e valore
        const vlines = doc.splitTextToSize(san(item.value), colW - lblWidth - 4);
        for (const line of vlines) {
          doc.text(line, valueX, cy);
          cy += LH;
        }
      }
      maxY = Math.max(maxY, cy);
    }

    return maxY + 2;
  }

  private static heading(doc: jsPDF, y: number, text: string): number {
    y = this.pb(doc, y, 12);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); this.tc(doc, K0);
    doc.text(san(text), ML, y);
    this.rule(doc, y + 1.2, ML, ML + doc.getTextWidth(san(text)), 0.4);
    return y + 5.5;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DOCUMENT HEADER
  // ─────────────────────────────────────────────────────────────────────────────
  private static drawHeader(
    doc: jsPDF, title: string, subtitle: string,
    doctor: Doctor | null, showDoctor = true
  ): number {
    let y = 16;
    if (showDoctor && doctor) {
      doc.setFont("times", "bold"); doc.setFontSize(14); this.tc(doc, K0);
      doc.text(san(`Dott. ${doctor.nome} ${doctor.cognome}`.toUpperCase()), 105, y, { align: "center" });
      y += 5.5;
      if (doctor.specializzazione) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); this.tc(doc, K80);
        doc.text(san(doctor.specializzazione), 105, y, { align: "center" });
        y += 4.5;
      }
    } else if (showDoctor) {
      doc.setFont("times", "bold"); doc.setFontSize(14); this.tc(doc, K0);
      doc.text("STUDIO MEDICO", 105, y, { align: "center" }); y += 9;
    }
    this.rule(doc, y, ML, MR, 0.5); y += 5;
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); this.tc(doc, K0);
    doc.text(san(title), 105, y, { align: "center" }); y += 5;
    if (subtitle) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); this.tc(doc, K80);
      doc.text(san(subtitle), 105, y, { align: "center" }); y += 4;
    }
    this.rule(doc, y, ML, MR, 0.3);
    return y + 4;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PATIENT BLOCK
  // ─────────────────────────────────────────────────────────────────────────────
  private static drawPatientBlock(
    doc: jsPDF, patient: Patient, visitDate: string,
    y: number, dateLabel = "Data visita", opts?: { showDate?: boolean; showSesso?: boolean; showBirthDate?: boolean; extraRight?: { label: string; value: string }[] }
  ): number {
    const a = calcAge(patient.dataNascita);
    const dob = patient.dataNascita
      ? `${fd(patient.dataNascita)}${a ? `  (${a} anni)` : ""}` : "-";

    const left: { label: string; value: string }[] = [
      { label: "Paziente", value: `${patient.nome} ${patient.cognome}` },
      ...(opts?.showBirthDate === false ? [] : [{ label: "Data di nascita", value: dob }]),
      ...(patient.codiceFiscale?.trim() ? [{ label: "Cod. Fiscale", value: patient.codiceFiscale }] : []),
    ];
    const right: { label: string; value: string }[] = [
      ...(opts?.showDate === false ? [] : [{ label: dateLabel, value: fd(visitDate) }]),
      ...(opts?.showSesso !== false && patient.sesso ? [{ label: "Sesso", value: patient.sesso }] : []),
      ...(opts?.extraRight ?? []),
    ];

    const halfW = PW / 2 - 4;
    let ly = y, ry = y;

    for (const item of left) {
      if (!item.value || item.value === "-") continue;
      ly = this.pb(doc, ly, LH + 1);
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); this.tc(doc, K80);
      const lbl = san(item.label) + ": ";
      doc.text(lbl, ML, ly);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); this.tc(doc, K0);
      const lblWidth = doc.getTextWidth(lbl);
      const valueX = ML + lblWidth + 1; // piccolo margine tra titolo e valore
      const vlines = doc.splitTextToSize(san(item.value), halfW - lblWidth - 3);
      doc.text(vlines[0] ?? "", valueX, ly); ly += LH;
      for (let i = 1; i < vlines.length; i++) {
        doc.text(vlines[i], valueX, ly);
        ly += LH;
      }
    }
    for (const item of right) {
      if (!item.value || item.value === "-") continue;
      ry = this.pb(doc, ry, LH + 1);
      const rx = ML + PW / 2 + 4;
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); this.tc(doc, K80);
      const lbl = san(item.label) + ": ";
      doc.text(lbl, rx, ry);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); this.tc(doc, K0);
      const lblWidth = doc.getTextWidth(lbl);
      const valueX = rx + lblWidth + 1; // piccolo margine tra titolo e valore
      doc.text(san(item.value), valueX, ry);
      ry += LH;
    }

    y = Math.max(ly, ry) + 2;
    this.rule(doc, y, ML, MR, 0.3);
    return y + 4;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEXT SECTION
  // ─────────────────────────────────────────────────────────────────────────────
  private static drawTextSection(
    doc: jsPDF, y: number, title: string,
    content: string | undefined | null, note?: string
  ): number {
    if (!content?.trim()) return y;
    y = this.pb(doc, y, 14);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); this.tc(doc, K0);
    doc.text(san(title), ML, y);
    this.rule(doc, y + 1.5, ML, MR, 0.25); y += 5.5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); this.tc(doc, K30);
    y = this.block(doc, content, ML + 1, y, PW - 2, LH, {
      font: "helvetica", style: "normal", fontSize: 9.5, color: K30,
    });
    if (note) {
      y += 1.5;
      doc.setFont("helvetica", "italic"); doc.setFontSize(7); this.tc(doc, K140);
      y = this.block(doc, note, ML + 1, y, PW - 2, 3.8, {
        font: "helvetica", style: "italic", fontSize: 7, color: K140,
      });
    }
    return y + 4;
  }

  /**
   * Anamnesi strutturata: titolo "Anamnesi" + una riga per ciascuna categoria
   * valorizzata ("Familiare: ...", "Patologica: ..."), con etichetta in grassetto
   * e valore a capo con rientro. Salta le categorie vuote.
   */
  private static drawStructuredAnamnesi(
    doc: jsPDF, y: number, as: NonNullable<Visit["anamnesiStrutturata"]>,
    order?: string[],
    etichette?: Record<string, string>
  ): number {
    // Ordine configurato per il tipo di visita; le sezioni con dato ma non
    // incluse nell'ordine (predefinite o personalizzate) vengono comunque
    // stampate in coda (no perdita dati).
    const seen = new Set<string>();
    const keys: string[] = [];
    for (const k of order ?? []) if (!seen.has(k)) { keys.push(k); seen.add(k); }
    for (const k of ALL_ANAMNESI_CAMPO_KEYS) if (!seen.has(k)) { keys.push(k); seen.add(k); }
    for (const k of Object.keys(as)) if (!seen.has(k)) { keys.push(k); seen.add(k); }

    const rows = keys
      .map((key) => ({
        label: resolveAnamnesiLabel(key, etichette),
        value: (as[key] ?? "").trim(),
      }))
      .filter((r) => r.value !== "");
    if (rows.length === 0) return y;

    y = this.pb(doc, y, 14);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); this.tc(doc, K0);
    doc.text("Anamnesi", ML, y);
    this.rule(doc, y + 1.5, ML, MR, 0.25); y += 5.5;

    for (const r of rows) {
      const lbl = san(r.label) + ": ";
      doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
      const lblW = doc.getTextWidth(lbl);
      const valLines: string[] = doc.splitTextToSize(san(r.value), PW - 2 - lblW);

      valLines.forEach((line, i) => {
        y = this.pb(doc, y, LH + 1);
        if (i === 0) {
          doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); this.tc(doc, K30);
          doc.text(lbl, ML + 1, y);
        }
        doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); this.tc(doc, K30);
        doc.text(line, ML + 1 + lblW, y);
        y += LH;
      });
      y += 1.2; // gap tra categorie
    }
    return y + 2;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // IMAGE GALLERY
  // ─────────────────────────────────────────────────────────────────────────────
  private static toJpeg(url: string): Promise<string> {
    return new Promise((res, rej) => {
      const img = new Image(); img.crossOrigin = "anonymous";
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0);
        res(c.toDataURL("image/jpeg", 0.88));
      };
      img.onerror = () => rej(new Error("fail")); img.src = url;
    });
  }

  private static async drawImages(doc: jsPDF, imgs: string[] | undefined, y: number): Promise<number> {
    if (!imgs?.length) return y;
    y = this.heading(doc, y, "Immagini allegate");
    const COLS = 2, GAP = 4, tW = (PW - GAP) / COLS, tH = 55;
    for (let i = 0; i < imgs.length; i += COLS) {
      y = this.pb(doc, y, tH + 6);
      const row = imgs.slice(i, i + COLS);
      const conv = await Promise.all(row.map(im => this.toJpeg(im).catch(() => null)));
      conv.forEach((img, col) => {
        const x = ML + col * (tW + GAP);
        this.dc(doc, K200); doc.setLineWidth(0.2); doc.rect(x, y, tW, tH, "S");
        if (img) {
          try {
            const p = (doc as any).getImageProperties(img);
            const r = p.width / p.height;
            let w = tW - 3, h = w / r;
            if (h > tH - 3) { h = tH - 3; w = h * r; }
            doc.addImage(img, "JPEG", x + (tW - w) / 2, y + (tH - h) / 2, w, h);
          } catch {
            doc.setFont("helvetica", "italic"); doc.setFontSize(7); this.tc(doc, K140);
            doc.text("Immagine non disponibile", x + tW / 2, y + tH / 2, { align: "center" });
          }
        }
      });
      y += tH + 4;
    }
    return y + 4;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FOOTER
  // ─────────────────────────────────────────────────────────────────────────────
  private static drawFooter(doc: jsPDF, doctor: Doctor | null, vis?: FooterVisibilityOptions) {
    this.rule(doc, FOOT_Y, ML + 10, MR - 10, 0.2);
    const parts: string[] = [];
    if (doctor?.ambulatori?.length) {
      const a = doctor.ambulatori.find(x => x.isPrimario) || doctor.ambulatori[0];
      parts.push(san(`${a.nome} - ${a.indirizzo}, ${a.citta}`));
    }
    if (vis?.showDoctorPhoneInPdf !== false && doctor?.telefono) parts.push(`Tel: ${doctor.telefono}`);
    if (vis?.showDoctorEmailInPdf !== false && doctor?.email) parts.push(san(doctor.email));
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); this.tc(doc, K140);
    doc.text(parts.join("   |   "), 105, FOOT_Y + 5, { align: "center" });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SIGNATURE BLOCK — luogo + data (sinistra) e firma del medico (destra)
  // Stesso carattere del referto (helvetica); usato da ricetta, esame, certificato.
  // ─────────────────────────────────────────────────────────────────────────────
  private static async drawSignatureBlock(
    doc: jsPDF, doctor: Doctor | null, y: number,
  ): Promise<number> {
    const sigW = 48; // mm
    const sigH = sigW * (SIGNATURE_STAMP_PDF_LAYOUT_H / SIGNATURE_STAMP_PDF_LAYOUT_W);
    const hasImg = Boolean(doctor?.signatureStampImage);

    y = this.pb(doc, y, sigH + 34);
    y += 12;
    const baseY = y;

    // Firma del medico (destra)
    const lineLeft = MR - 62;
    let cy = baseY;

    if (hasImg) {
      try {
        const img = await normalizeSignatureStampImage(doctor!.signatureStampImage!);
        const fmt = signatureStampPdfFormat(img);
        doc.addImage(img, fmt, MR - sigW, cy, sigW, sigH);
        cy += sigH + 2;
      } catch {
        cy += 12;
      }
    } else {
      cy += 12;
    }

    this.dc(doc, K30); doc.setLineWidth(0.4); doc.line(lineLeft, cy, MR, cy);
    cy += 4.5;

    const rawName = san(`${doctor?.nome || ""} ${doctor?.cognome || ""}`.trim());
    const name = rawName ? `Dott. ${rawName}` : "_______________________";
    doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); this.tc(doc, K0);
    doc.text(name, MR, cy, { align: "right" });
    cy += 4;

    if (doctor?.specializzazione) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); this.tc(doc, K80);
      doc.text(san(doctor.specializzazione), MR, cy, { align: "right" });
      cy += 4;
    }

    return cy + 4;
  }
  // ─────────────────────────────────────────────────────────────────────────────
  // FLAT NORMALISER
  // ─────────────────────────────────────────────────────────────────────────────
  /**
   * Visite salvate prima dell'introduzione del blocco `visita` (o importate da
   * CSV) hanno solo i campi piatti: qui vengono ricondotte alla stessa forma,
   * così il referto stampa lo stesso contenuto in entrambi i casi.
   */
  private static mkVisita(vv: Visit): NonNullable<Visit["visita"]> {
    const conclusioni = [vv.conclusioniDiagnostiche, vv.terapie]
      .filter(Boolean)
      .join("\n");
    return {
      problemaClinico: vv.descrizioneClinica ?? "",
      prestazione: vv.anamnesi ?? "",
      esameObiettivo: vv.esamiObiettivo ?? "",
      accertamenti: "",
      terapiaSpecifica: conclusioni,
      immagini: [],
    };
  }

  private static norm(visit: Visit): Visit {
    return visit.visita ? visit : { ...visit, visita: this.mkVisita(visit) };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MODULI STRUMENTALI CARDIOLOGICI
  //
  // Ogni modulo stampa prima la riga di misure (solo quelle valorizzate) e poi
  // il referto testuale. Se non c'e' nessuna misura ne' referto la sezione
  // viene saltata del tutto, così un referto senza ECG non lascia intestazioni
  // vuote nel foglio.
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Tabella di misure a griglia: ogni cella ha l'etichetta piccola in alto e il
   * valore in grassetto sotto. Sostituisce la vecchia riga continua separata da
   * punti, che con dieci o piu' valori diventava una massa di testo illeggibile.
   *
   * Disegna solo le misure valorizzate e sceglie da sola quante righe servono;
   * le celle vuote dell'ultima riga restano bianche senza bordo.
   */
  private static drawMisureTable(
    doc: jsPDF, y: number,
    items: { label: string; value: string }[],
    colonne = 3,
  ): number {
    const presenti = items.filter((i) => i.value && i.value !== "-");
    if (presenti.length === 0) return y;

    const righe = Math.ceil(presenti.length / colonne);
    const colW = PW / colonne;
    const rowH = 9;

    y = this.pb(doc, y, righe * rowH + 4);

    for (let r = 0; r < righe; r++) {
      const top = y + r * rowH;

      // Fondo alternato: aiuta a seguire la riga con l'occhio su tabelle lunghe.
      if (r % 2 === 0) {
        this.fc(doc, K240);
        doc.rect(ML, top, PW, rowH, "F");
      }

      for (let c = 0; c < colonne; c++) {
        const item = presenti[r * colonne + c];
        if (!item) continue;
        const cx = ML + c * colW + 2;
        const maxW = colW - 4;

        doc.setFont("helvetica", "normal"); doc.setFontSize(6.8); this.tc(doc, K80);
        doc.text(san(item.label).toUpperCase(), cx, top + 3.4, { maxWidth: maxW });

        doc.setFont("helvetica", "bold"); doc.setFontSize(9); this.tc(doc, K0);
        const linee: string[] = doc.splitTextToSize(san(item.value), maxW);
        doc.text(linee[0] ?? "", cx, top + 7.6);
      }

      this.dc(doc, K200); doc.setLineWidth(0.1);
      doc.line(ML, top + rowH, MR, top + rowH);
    }

    return y + righe * rowH + 3;
  }

  /**
   * Tabella a due colonne "etichetta | valore" per i dati che hanno testi
   * lunghi (struttura, categoria CAD-RADS): qui il valore va mandato a capo,
   * non troncato.
   */
  private static drawDettagliTable(
    doc: jsPDF, y: number, items: { label: string; value: string }[],
  ): number {
    const presenti = items.filter((i) => i.value && i.value !== "-");
    if (presenti.length === 0) return y;

    const labelW = 34;
    for (const item of presenti) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      const linee: string[] = doc.splitTextToSize(
        san(item.value), PW - labelW - 4,
      );
      const h = Math.max(LH, linee.length * LH);
      y = this.pb(doc, y, h + 2);

      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); this.tc(doc, K80);
      doc.text(san(item.label).toUpperCase(), ML + 1, y + 3.2);

      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); this.tc(doc, K0);
      linee.forEach((linea, i) => {
        doc.text(linea, ML + labelW, y + 3.2 + i * LH);
      });

      y += h + 1.4;
      this.dc(doc, K200); doc.setLineWidth(0.1);
      doc.line(ML, y - 0.6, MR, y - 0.6);
    }
    return y + 2;
  }

  /**
   * Intestazione di sezione su barra grigia: con otto sezioni per referto,
   * il titolo in grassetto su fondo bianco non bastava a far trovare i blocchi.
   */
  private static sezione(doc: jsPDF, y: number, titolo: string): number {
    y = this.pb(doc, y, 16);
    this.fc(doc, K235);
    doc.rect(ML, y - 3.6, PW, 6, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); this.tc(doc, K0);
    doc.text(san(titolo).toUpperCase(), ML + 2, y + 0.6);
    return y + 6.5;
  }

  /** Referto testuale di un modulo strumentale. */
  private static drawRefertoModulo(
    doc: jsPDF, y: number, testo: string | undefined,
  ): number {
    if (!testo?.trim()) return y;
    return this.block(doc, testo, ML + 1, y, PW - 2, LH, {
      font: "helvetica", style: "normal", fontSize: 9.5, color: K30,
    });
  }

  private static drawEcg(
    doc: jsPDF, y: number,
    ecg: NonNullable<Visit["visita"]>["ecg"],
    frequenzaCardiaca: string | undefined,
  ): number {
    if (!ecg) return y;
    const qtc = calcolaQtcBazett(
      ecg.qt,
      frequenzaCardiaca ? Number(frequenzaCardiaca) : undefined,
    );
    const misure = [
      { label: "Ritmo", value: v(ecg.ritmo, "") },
      { label: "PR", value: ecg.pr ? `${ecg.pr} ms` : "" },
      { label: "QRS", value: ecg.qrs ? `${ecg.qrs} ms` : "" },
      { label: "QT", value: ecg.qt ? `${ecg.qt} ms` : "" },
      { label: "QTc", value: qtc.ok ? `${qtc.result.display} ms` : "" },
      { label: "Asse", value: ecg.asse != null ? `${ecg.asse}°` : "" },
    ];
    const haMisure = misure.some((m) => m.value);
    if (!haMisure && !ecg.referto?.trim()) return y;

    y = this.sezione(doc, y, "Elettrocardiogramma");
    y = this.drawMisureTable(doc, y, misure, 3);
    y = this.drawRefertoModulo(doc, y, ecg.referto);
    return y + 4;
  }

  private static drawEcocardiogramma(
    doc: jsPDF, y: number,
    eco: NonNullable<Visit["visita"]>["ecocardiogramma"],
  ): number {
    if (!eco) return y;
    const mm = (n: number | undefined) => (n != null ? `${n} mm` : "");
    const misure = [
      { label: "DTD VS", value: mm(eco.ddvs) },
      { label: "DTS VS", value: mm(eco.dsvs) },
      { label: "SIV", value: mm(eco.siv) },
      { label: "PP", value: mm(eco.pp) },
      { label: "FE", value: eco.fe != null ? `${eco.fe}%` : "" },
      { label: "Atrio sx", value: mm(eco.atrioSinistro) },
      { label: "Radice ao.", value: mm(eco.radiceAortica) },
      { label: "Ao. asc.", value: mm(eco.aortaAscendente) },
      { label: "TAPSE", value: mm(eco.tapse) },
      { label: "PAPs", value: eco.paps != null ? `${eco.paps} mmHg` : "" },
      { label: "E/A", value: eco.rapportoEA != null ? String(eco.rapportoEA) : "" },
      { label: "E/e'", value: eco.rapportoEe != null ? String(eco.rapportoEe) : "" },
    ];
    if (!misure.some((m) => m.value) && !eco.referto?.trim()) return y;

    y = this.sezione(doc, y, "Ecocardiogramma color-Doppler transtoracico");
    y = this.drawMisureTable(doc, y, misure, 4);
    y = this.drawRefertoModulo(doc, y, eco.referto);
    return y + 4;
  }

  private static drawTcCoronarica(
    doc: jsPDF, y: number,
    tc: NonNullable<Visit["visita"]>["tcCoronarica"],
    sogliaCac: SogliaCacSevera = SOGLIA_CAC_PREDEFINITA,
  ): number {
    if (!tc) return y;
    const esitoCac = categoriaCac(tc.cacScore, sogliaCac);
    const cadRads = tc.cadRads
      ? (CAD_RADS_CATEGORIE.find((o) => o.key === tc.cadRads)?.label ?? tc.cadRads)
      : "";

    // I modificatori si scrivono attaccati alla categoria, come si refertano:
    // "CAD-RADS 3 / HRP, S".
    const modificatori = (tc.cadRadsModificatori ?? []).join(", ");

    const segmenti = (tc.segmenti ?? [])
      .map((n) => {
        const sg = segmentoScct(n);
        return sg ? `${sg.numero}. ${sg.nome}` : String(n);
      })
      .join("; ");

    const stenosi = (() => {
      if (tc.stenosiMassima == null) return "";
      const sg = tc.stenosiMassimaSegmento != null
        ? segmentoScct(tc.stenosiMassimaSegmento)
        : null;
      return `${tc.stenosiMassima}%${sg ? ` (segmento ${sg.numero}, ${sg.nome})` : ""}`;
    })();

    // Le due componenti restano distinte anche in stampa: aggregarle qui
    // vanificherebbe la ragione per cui sono due campi.
    const componenti = [
      tc.componenteCalcifica != null ? `calcifica ${tc.componenteCalcifica}%` : "",
      tc.componenteNonCalcifica != null
        ? `non calcifica o mista ${tc.componenteNonCalcifica}%`
        : "",
    ].filter(Boolean).join(", ");

    const ffr = (() => {
      if (tc.ffrCt == null && !tc.ffrCtEsito) return "";
      const valore = tc.ffrCt != null ? String(tc.ffrCt) : "";
      const esito = tc.ffrCtEsito ?? "";
      return [valore, esito].filter(Boolean).join(" ");
    })();

    const misure = [
      { label: "Data esame", value: tc.dataEsame ? fd(tc.dataEsame) : "" },
      { label: "Struttura", value: v(tc.struttura, "") },
      { label: "Metodica", value: v(tc.metodica, "") },
      {
        label: "Calcium score",
        value: tc.cacScore != null
          ? `${tc.cacScore} Agatston${esitoCac ? ` - ${esitoCac.label} (${esitoCac.intervallo})` : ""}`
          : "",
      },
      {
        label: "CAD-RADS",
        value: cadRads ? `${cadRads}${modificatori ? ` / ${modificatori}` : ""}` : "",
      },
      { label: "Burden di placca", value: v(tc.burdenPlacca, "") },
      { label: "Componente placca", value: componenti },
      { label: "Stenosi massima", value: stenosi },
      { label: "Segmenti con placca", value: segmenti },
      { label: "FFR-TC", value: ffr },
    ];
    if (!misure.some((m) => m.value) && !tc.referto?.trim()) return y;

    y = this.sezione(doc, y, "TC coronarica");
    y = this.drawDettagliTable(doc, y, misure);
    // L'avvertenza sul CAC accompagna il punteggio anche fuori dall'app: e' il
    // referto che qualcun altro leggera' senza avere davanti la maschera.
    if (esitoCac) y = this.drawRefertoModulo(doc, y, esitoCac.flag);
    y = this.drawRefertoModulo(doc, y, tc.referto);
    return y + 4;
  }

  /**
   * Frazioni di eiezione delle visite precedenti dello stesso paziente.
   *
   * Serve al fenotipo HFimpEF, che nasce dal confronto fra due misure e quindi
   * non e' ricavabile dalla sola visita in stampa. Le si rilegge qui invece di
   * farsele passare da chi chiama: il referto si genera da sei punti diversi
   * dell'applicazione, e in due di quelli la cronologia del paziente non e'
   * caricata. Se la lettura fallisce il fenotipo ripiega sulla sola FE
   * corrente: un referto senza la sigla HFimpEF e' un peggioramento
   * accettabile, un referto che non si genera no.
   */
  private static async fePrecedenti(
    patientId: string,
    visitaCorrenteId: string,
  ): Promise<FePrecedente[]> {
    try {
      const visite = await VisitService.getVisitsByPatientId(patientId);
      return visite
        .filter((v) => v.id !== visitaCorrenteId)
        .map((v) => ({
          valore: Number(v.visita?.ecocardiogramma?.fe),
          // L'ecocardiogramma non ha una data propria: la FE si riferisce alla
          // visita in cui e' stata registrata.
          data: v.dataVisita,
        }))
        .filter((p) => Number.isFinite(p.valore) && p.valore > 0);
    } catch {
      return [];
    }
  }

  /**
   * Scompenso cardiaco.
   *
   * Il fenotipo e l'esito del peptide vengono **ricalcolati qui** dalla FE e
   * dal valore salvati, non ripresi da un campo: e' la stessa ragione per cui
   * il test ergometrico ricalcola la percentuale di FC massima, cioe' evitare
   * che il referto porti un giudizio rimasto indietro rispetto ai numeri che
   * lo hanno prodotto.
   */
  private static drawScompenso(
    doc: jsPDF, y: number,
    sc: NonNullable<Visit["visita"]>["scompenso"],
    fe: number | undefined,
    patient: Patient,
    fePrecedenti: FePrecedente[] = [],
  ): number {
    if (!sc) return y;
    const eta = Number(calcAge(patient.dataNascita));
    const fenotipo = fenotipoConStorico(fe, fePrecedenti);
    const esito = valutaNtProBnp(
      sc.ntProBnp,
      sc.contestoBnp,
      Number.isFinite(eta) ? eta : undefined,
    );
    const misure = [
      // Senza FE la riga resta, con il motivo: chi legge deve sapere che il
      // fenotipo manca, non che e' stato valutato e trovato normale.
      {
        label: "Fenotipo (da FE)",
        value: fenotipo ? fenotipo.label : FENOTIPO_DA_DEFINIRE.label,
      },
      { label: "Classe NYHA", value: sc.nyha ? `NYHA ${sc.nyha}` : "" },
      { label: "Data dosaggio", value: sc.dataBnp ? fd(sc.dataBnp) : "" },
      {
        label: "NT-proBNP",
        value:
          sc.ntProBnp != null
            ? `${sc.ntProBnp} pg/mL${esito ? ` (${esito.titolo})` : ""}`
            : "",
      },
      {
        label: "Contesto",
        value: sc.contestoBnp ? CONTESTO_BNP_LABELS[sc.contestoBnp] : "",
      },
    ];
    if (!misure.some((m) => m.value) && !sc.referto?.trim()) return y;

    y = this.sezione(doc, y, "Scompenso cardiaco");
    y = this.drawDettagliTable(doc, y, misure);
    // Per l'HFimpEF il confronto che lo ha prodotto vale piu' della sigla: il
    // referto porta le due FE e la nota di non alleggerire la terapia, che e'
    // il rischio del momento in cui la frazione risale.
    if (!fenotipo) y = this.drawRefertoModulo(doc, y, FENOTIPO_DA_DEFINIRE.motivo);
    if (fenotipo?.riferimento) y = this.drawRefertoModulo(doc, y, fenotipo.riferimento);
    if (fenotipo?.avvertenza) y = this.drawRefertoModulo(doc, y, fenotipo.avvertenza);
    if (esito) y = this.drawRefertoModulo(doc, y, esito.nota);
    y = this.drawRefertoModulo(doc, y, sc.referto);
    return y + 4;
  }

  /**
   * Fibrillazione atriale: CHA₂DS₂-VASc e HAS-BLED.
   *
   * I punteggi si ricalcolano qui dai fattori salvati, come il fenotipo dello
   * scompenso. Vengono stampati **separati**, con le voci che li compongono:
   * sono due domande diverse e affiancarli come un bilancio unico
   * suggerirebbe una sottrazione che le linee guida non fanno.
   */
  private static drawFibrillazioneAtriale(
    doc: jsPDF, y: number,
    fa: NonNullable<Visit["visita"]>["fibrillazioneAtriale"],
    patient: Patient,
    fattoriRischio: NonNullable<Visit["visita"]>["fattoriRischio"],
  ): number {
    if (!fa) return y;
    const etaNum = Number(calcAge(patient.dataNascita));
    const eta = Number.isFinite(etaNum) ? etaNum : undefined;
    const sesso =
      patient.sesso === "M" || patient.sesso === "F" ? patient.sesso : undefined;

    const chads = calcolaChadsVasc({
      eta,
      sesso,
      fattori: {
        scompenso: fa.cvScompenso,
        // Dichiarati fra i fattori di rischio della visita, non nel modulo FA.
        ipertensione: fattoriRischio?.ipertensione,
        diabete: fattoriRischio?.diabete,
        ictus: fa.cvIctus,
        vascolare: fa.cvVascolare,
      },
    });
    const hasBled = calcolaHasBled({
      eta,
      inTao: fa.anticoagulante === "warfarin",
      fattori: {
        ipertensioneNonControllata: fa.hbIpertensioneNonControllata,
        funzioneRenale: fa.hbFunzioneRenale,
        funzioneEpatica: fa.hbFunzioneEpatica,
        ictus: fa.hbIctus,
        sanguinamento: fa.hbSanguinamento,
        inrLabile: fa.hbInrLabile,
        farmaci: fa.hbFarmaci,
        alcol: fa.hbAlcol,
      },
    });

    const TIPO_LABEL: Record<string, string> = {
      parossistica: "Parossistica",
      persistente: "Persistente",
      "persistente-lunga": "Persistente di lunga durata",
      permanente: "Permanente",
    };
    const TAO_LABEL: Record<string, string> = {
      nessuno: "Nessuna",
      warfarin: "Warfarin (TAO)",
      doac: "Anticoagulante orale diretto (DOAC)",
    };

    const misure = [
      { label: "Forma clinica", value: fa.tipo ? TIPO_LABEL[fa.tipo] ?? fa.tipo : "" },
      {
        label: "Anticoagulazione",
        value: fa.anticoagulante ? TAO_LABEL[fa.anticoagulante] ?? fa.anticoagulante : "",
      },
      {
        label: "CHA2DS2-VASc",
        value: chads.ok ? `${chads.esito.punteggio} / ${chads.esito.massimo}` : "",
      },
      {
        label: "HAS-BLED",
        value: hasBled.ok ? `${hasBled.esito.punteggio} / ${hasBled.esito.massimo}` : "",
      },
    ];
    if (!misure.some((m) => m.value) && !fa.referto?.trim()) return y;

    y = this.sezione(doc, y, "Fibrillazione atriale");
    y = this.drawDettagliTable(doc, y, misure);

    // Le voci che compongono il punteggio: un totale da solo non e'
    // verificabile da chi legge il referto senza riaprire la scheda.
    if (chads.ok && chads.esito.voci.length > 0) {
      y = this.drawRefertoModulo(
        doc, y,
        `CHA2DS2-VASc: ${chads.esito.voci
          .map((v) => `${v.label} (+${v.punti})`)
          .join("; ")}.`,
      );
    }
    if (chads.ok) y = this.drawRefertoModulo(doc, y, chads.esito.nota);
    if (hasBled.ok && hasBled.esito.voci.length > 0) {
      y = this.drawRefertoModulo(
        doc, y,
        `HAS-BLED: ${hasBled.esito.voci
          .map((v) => `${v.label} (+${v.punti})`)
          .join("; ")}.`,
      );
    }
    if (hasBled.ok) y = this.drawRefertoModulo(doc, y, hasBled.esito.nota);
    if (hasBled.ok && hasBled.esito.modificabili.length > 0) {
      y = this.drawRefertoModulo(
        doc, y,
        `Fattori emorragici modificabili: ${hasBled.esito.modificabili.join("; ")}.`,
      );
    }
    y = this.drawRefertoModulo(doc, y, fa.referto);
    return y + 4;
  }

  /**
   * Test ergometrico. La percentuale della frequenza massima teorica viene
   * ricalcolata qui invece di essere ripresa dal campo: se il medico corregge
   * la FC raggiunta senza ritoccare la percentuale, il referto resterebbe
   * altrimenti con due numeri che non si parlano.
   */
  private static drawTestErgometrico(
    doc: jsPDF, y: number,
    erg: NonNullable<Visit["visita"]>["testErgometrico"],
    patient: Patient,
  ): number {
    if (!erg) return y;
    const eta = Number(calcAge(patient.dataNascita));
    const pct = calcolaPercentualeFcMax(
      erg.fcMax,
      Number.isFinite(eta) && eta > 0 ? eta : undefined,
    );
    const misure = [
      { label: "Data esame", value: erg.dataEsame ? fd(erg.dataEsame) : "" },
      { label: "Protocollo", value: v(erg.protocollo, "") },
      { label: "Durata", value: erg.durataMin != null ? `${erg.durataMin} min` : "" },
      { label: "Carico max", value: erg.caricoWatt != null ? `${erg.caricoWatt} W` : "" },
      { label: "METs", value: erg.mets != null ? String(erg.mets) : "" },
      { label: "FC max", value: erg.fcMax != null ? `${erg.fcMax} bpm` : "" },
      {
        label: "% FC teorica",
        value: pct.ok ? `${pct.result.display}%` : "",
      },
      { label: "P.A. al picco", value: v(erg.paMax, "") },
      { label: "Interruzione", value: v(erg.motivoInterruzione, "") },
      { label: "Esito", value: v(erg.esito, "") },
    ];
    if (!misure.some((m) => m.value) && !erg.referto?.trim()) return y;

    y = this.sezione(doc, y, "Test ergometrico");
    y = this.drawMisureTable(doc, y, misure, 3);
    y = this.drawRefertoModulo(doc, y, erg.referto);
    return y + 4;
  }

  private static drawHolterEcg(
    doc: jsPDF, y: number,
    h: NonNullable<Visit["visita"]>["holterEcg"],
  ): number {
    if (!h) return y;
    const bpm = (n: number | undefined) => (n != null ? `${n} bpm` : "");
    const misure = [
      { label: "Data inizio", value: h.dataEsame ? fd(h.dataEsame) : "" },
      { label: "Durata", value: h.durataOre != null ? `${h.durataOre} ore` : "" },
      { label: "Ritmo prevalente", value: v(h.ritmoPrevalente, "") },
      { label: "FC media", value: bpm(h.fcMedia) },
      { label: "FC minima", value: bpm(h.fcMin) },
      { label: "FC massima", value: bpm(h.fcMax) },
      { label: "BESV / 24h", value: h.besv != null ? String(h.besv) : "" },
      { label: "BEV / 24h", value: h.bev != null ? String(h.bev) : "" },
      {
        label: "Pausa max",
        value: h.pausaMaxSec != null ? `${h.pausaMaxSec} s` : "",
      },
    ];
    if (!misure.some((m) => m.value) && !h.referto?.trim()) return y;

    y = this.sezione(doc, y, "ECG dinamico secondo Holter");
    y = this.drawMisureTable(doc, y, misure, 3);
    y = this.drawRefertoModulo(doc, y, h.referto);
    return y + 4;
  }

  /**
   * Monitoraggio pressorio delle 24 ore. Le medie sono stampate accoppiate
   * ("128/78") invece che in due caselle: una pressione si legge come coppia, e
   * separarla raddoppierebbe le celle senza aggiungere informazione.
   */
  private static drawHolterPressorio(
    doc: jsPDF, y: number,
    h: NonNullable<Visit["visita"]>["holterPressorio"],
  ): number {
    if (!h) return y;
    const coppia = (s?: number, d?: number) =>
      s != null || d != null ? `${s ?? "-"}/${d ?? "-"} mmHg` : "";
    // Se il referto riporta gia' il calo notturno vince quello; altrimenti si
    // ricava dalle medie diurna e notturna.
    const caloRicavato = calcolaCaloNotturno(h.mediaDiurnaSist, h.mediaNotturnaSist);
    const calo =
      h.caloNotturnoPct != null
        ? `${h.caloNotturnoPct}%`
        : caloRicavato.ok
          ? `${caloRicavato.result.display}%`
          : "";

    const misure = [
      { label: "Data inizio", value: h.dataEsame ? fd(h.dataEsame) : "" },
      { label: "Media 24 ore", value: coppia(h.media24Sist, h.media24Diast) },
      {
        label: "Media diurna",
        value: coppia(h.mediaDiurnaSist, h.mediaDiurnaDiast),
      },
      {
        label: "Media notturna",
        value: coppia(h.mediaNotturnaSist, h.mediaNotturnaDiast),
      },
      { label: "Calo notturno", value: calo },
      {
        label: "Carico pressorio",
        value: h.caricoPressorioPct != null ? `${h.caricoPressorioPct}%` : "",
      },
    ];
    if (!misure.some((m) => m.value) && !h.referto?.trim()) return y;

    y = this.sezione(doc, y, "Monitoraggio pressorio delle 24 ore");
    y = this.drawMisureTable(doc, y, misure, 3);
    y = this.drawRefertoModulo(doc, y, h.referto);
    return y + 4;
  }

  /**
   * Esami ematochimici. Oltre ai valori dosati stampa i due indici derivati che
   * il medico userebbe altrimenti a mano — LDL secondo Friedewald quando manca
   * il dosaggio diretto, ed eGFR — etichettati come calcolati per non
   * confonderli mai con un valore di laboratorio.
   */
  private static drawLaboratorio(
    doc: jsPDF, y: number,
    lab: NonNullable<Visit["visita"]>["laboratorio"],
    patient: Patient,
  ): number {
    if (!lab) return y;
    const mg = (n: number | undefined) => (n != null ? `${n} mg/dL` : "");

    const ldlCalc = lab.ldlMisurato == null
      ? calcolaLdlFriedewald(lab.colesteroloTotale, lab.hdl, lab.trigliceridi)
      : null;
    const ctHdl = calcolaRapportoCtHdl(lab.colesteroloTotale, lab.hdl);
    const tgHdl = calcolaRapportoTgHdl(lab.trigliceridi, lab.hdl);
    const eta = Number(calcAge(patient.dataNascita));
    const egfr = calcolaEgfrCkdEpi(
      lab.creatinina,
      Number.isFinite(eta) && eta > 0 ? eta : undefined,
      patient.sesso === "M" || patient.sesso === "F" ? patient.sesso : undefined,
    );

    const misure = [
      { label: "Col. totale", value: mg(lab.colesteroloTotale) },
      { label: "HDL", value: mg(lab.hdl) },
      {
        label: lab.ldlMisurato != null ? "LDL (dosato)" : "LDL (Friedewald)",
        value: lab.ldlMisurato != null
          ? mg(lab.ldlMisurato)
          : ldlCalc?.ok ? `${ldlCalc.result.display} mg/dL` : "",
      },
      { label: "Trigliceridi", value: mg(lab.trigliceridi) },
      { label: "ApoB", value: mg(lab.apoB) },
      { label: "Lp(a)", value: mg(lab.lpa) },
      {
        label: "CT / HDL (calc.)",
        value: ctHdl.ok ? ctHdl.result.display : "",
      },
      {
        label: "TG / HDL (calc.)",
        value: tgHdl.ok ? tgHdl.result.display : "",
      },
      { label: "Glicemia", value: mg(lab.glicemia) },
      { label: "Insulinemia", value: lab.insulina != null ? `${lab.insulina} uU/mL` : "" },
      { label: "HbA1c", value: lab.hba1c != null ? `${lab.hba1c}%` : "" },
      { label: "Creatinina", value: mg(lab.creatinina) },
      {
        label: "eGFR (CKD-EPI)",
        value: egfr.ok
          ? `${egfr.result.display} (${stadioKdigo(egfr.result.value)})`
          : "",
      },
      { label: "Albuminuria", value: lab.albuminuria != null ? `${lab.albuminuria} mg/g` : "" },
      { label: "Emoglobina", value: lab.emoglobina != null ? `${lab.emoglobina} g/dL` : "" },
      { label: "AST", value: lab.ast != null ? `${lab.ast} U/L` : "" },
      { label: "ALT", value: lab.alt != null ? `${lab.alt} U/L` : "" },
      { label: "Uricemia", value: mg(lab.uricemia) },
      { label: "TSH", value: lab.tsh != null ? `${lab.tsh} mU/L` : "" },
    ];
    if (!misure.some((m) => m.value)) return y;

    const titolo = lab.dataPrelievo
      ? `Esami ematochimici (prelievo del ${fd(lab.dataPrelievo)})`
      : "Esami ematochimici";
    y = this.sezione(doc, y, titolo);
    y = this.drawMisureTable(doc, y, misure, 3);

    if (ldlCalc?.ok || egfr.ok || ctHdl.ok || tgHdl.ok) {
      doc.setFont("helvetica", "italic"); doc.setFontSize(7); this.tc(doc, K140);
      y = this.block(
        doc,
        "I valori indicati come calcolati sono stime derivate dai dosaggi riportati, non risultati di laboratorio.",
        ML + 1, y, PW - 2, 3.8,
        { font: "helvetica", style: "italic", fontSize: 7, color: K140 },
      );
    }
    return y + 4;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── REFERTO DI VISITA ─────────────────────────────────────────────────────
  static async generateVisitPDF(
    patient: Patient,
    visit: Visit,
    options?: VisitPdfOptions,
  ): Promise<Blob | undefined> {
    const nv = this.norm(visit);
    if (!nv.visita) return;
    const vis = nv.visita;

    const [doctor, prefs] = await Promise.all([
      DoctorService.getDoctor(),
      PreferenceService.getPreferences(),
    ]);
    const fo: FooterVisibilityOptions = {
      showDoctorPhoneInPdf: prefs?.showDoctorPhoneInPdf as boolean | undefined,
      showDoctorEmailInPdf: prefs?.showDoctorEmailInPdf as boolean | undefined,
    };
    this.fCtx = { doctor, opts: fo };
    const doc = new jsPDF();

    let y = this.drawHeader(doc, "VISITA CARDIOLOGICA", "Referto Specialistico", doctor);

    // Peso e BMI accanto ai dati del paziente (come nel referto specialistico).
    const altezzaCm = patient?.altezza ?? 0;
    const peso = Number(vis.pesoCorporeo) || 0;
    const bmi = altezzaCm > 0 && peso > 0
      ? (peso / Math.pow(altezzaCm / 100, 2)).toFixed(1)
      : "-";
    const extraRight = peso > 0
      ? [
          { label: "Peso", value: `${peso} kg` },
          ...(bmi !== "-" ? [{ label: "BMI", value: bmi }] : []),
        ]
      : [];
    y = this.drawPatientBlock(doc, patient, visit.dataVisita, y, "Data visita", { extraRight });

    y = this.drawInquadramentoGrid(doc, y, "Parametri", [
      {
        header: "Parametri vitali",
        items: [
          { label: "P.A.", value: v(vis.pressioneArteriosa ? `${vis.pressioneArteriosa} mmHg` : "") },
          { label: "F.C.", value: v(vis.frequenzaCardiaca ? `${vis.frequenzaCardiaca} bpm` : "") },
          { label: "Fumo", value: vis.fumatore === "si" ? "Si'" : vis.fumatore === "no" ? "No" : "-" },
        ],
      },
      {
        header: "Antropometria",
        items: [
          { label: "Peso", value: peso > 0 ? `${peso} kg` : "-" },
          { label: "Altezza", value: altezzaCm > 0 ? `${altezzaCm} cm` : "-" },
          { label: "BMI", value: bmi },
        ],
      },
    ]);

    // L'anamnesi precede il motivo della visita, come nel referto cardiologico
    // standard: chi legge deve avere la storia del paziente prima della
    // domanda che lo ha portato qui. Stesso ordine della maschera di inserimento.
    if (hasAnamnesiStrutturataContent(nv.anamnesiStrutturata)) {
      const anamnesiCfg = parseAnamnesiConfig(prefs).generale;
      y = this.drawStructuredAnamnesi(
        doc, y, nv.anamnesiStrutturata!, anamnesiCfg.campi, anamnesiCfg.etichette,
      );
    } else {
      y = this.drawTextSection(doc, y, "Anamnesi", vis.prestazione);
    }

    y = this.drawTextSection(doc, y, "Descrizione Problema / Dati Clinici", vis.problemaClinico);

    y = this.drawTextSection(doc, y, "Esame Obiettivo", vis.esameObiettivo);
    y = this.drawEcg(doc, y, vis.ecg, vis.frequenzaCardiaca);
    y = this.drawEcocardiogramma(doc, y, vis.ecocardiogramma);
    y = this.drawTcCoronarica(
      doc, y, vis.tcCoronarica,
      Number(prefs?.sogliaCacSevera) === 400 ? 400 : SOGLIA_CAC_PREDEFINITA,
    );
    y = this.drawTestErgometrico(doc, y, vis.testErgometrico, patient);
    y = this.drawHolterEcg(doc, y, vis.holterEcg);
    y = this.drawHolterPressorio(doc, y, vis.holterPressorio);
    y = this.drawLaboratorio(doc, y, vis.laboratorio, patient);
    y = this.drawScompenso(
      doc, y, vis.scompenso, vis.ecocardiogramma?.fe, patient,
      await this.fePrecedenti(patient.id, visit.id),
    );
    y = this.drawFibrillazioneAtriale(
      doc, y, vis.fibrillazioneAtriale, patient, vis.fattoriRischio,
    );
    // La sintesi del rischio si stampa: e' il punto in cui il medico mette
    // insieme rischio calcolato e reperti di imaging, e le linee guida chiedono
    // che quell'integrazione resti documentata. Il punteggio SCORE2 e gli
    // obiettivi lipidici restano invece di supporto e non entrano nel referto.
    y = this.drawTextSection(doc, y, "Sintesi del rischio cardiovascolare", vis.sintesiRischio);
    y = this.drawTextSection(doc, y, "Accertamenti", vis.accertamenti);
    if (options?.includeImages) y = await this.drawImages(doc, vis.immagini, y);
    this.drawTextSection(doc, y, "Conclusioni e Terapia", vis.terapiaSpecifica);

    try { this.drawFooter(doc, doctor, fo); return doc.output("blob") as Blob; }
    finally { this.fCtx = null; }
  }

  // ─── RICHIESTA ESAME ──────────────────────────────────────────────────────
  static async generateRichiestaEsamePDF(
    patient: Patient, richiesta: RichiestaEsameComplementare, doctor: Doctor | null
  ): Promise<Blob> {
    const prefs = await PreferenceService.getPreferences();
    const fo: FooterVisibilityOptions = {
      showDoctorPhoneInPdf: prefs?.showDoctorPhoneInPdf as boolean | undefined,
      showDoctorEmailInPdf: prefs?.showDoctorEmailInPdf as boolean | undefined,
    };
    this.fCtx = { doctor, opts: fo };
    const doc = new jsPDF();
    try {
      let y = this.drawHeader(doc, "RICHIESTA DI ESAME", "Prescrizione di esame complementare", doctor);
      y = this.drawPatientBlock(doc, patient, richiesta.dataRichiesta, y, "Data richiesta", { showDate: false, showSesso: false, showBirthDate: false });
      y += 2;
      y = this.heading(doc, y, "Si richiede");
      y = this.block(doc, richiesta.nome, ML + 1, y, PW - 2, undefined, {
        font: "helvetica", style: "bold", fontSize: 10.5, color: K0,
      });
      if (richiesta.note?.trim()) {
        y += 3;
        y = this.heading(doc, y, "Quesito diagnostico");
        y = this.block(doc, richiesta.note, ML + 1, y, PW - 2, undefined, {
          font: "helvetica", style: "normal", fontSize: 9.5, color: K30,
        });
      }
      await this.drawSignatureBlock(doc, doctor, y);
      this.drawFooter(doc, doctor, fo);
      return doc.output("blob") as Blob;
    } finally {
      this.fCtx = null;
    }
  }

  // ─── CERTIFICATO ──────────────────────────────────────────────────────────
  static async generateCertificatoPDF(
    patient: Patient, certificato: CertificatoPaziente, doctor: Doctor | null
  ): Promise<Blob> {
    const prefs = await PreferenceService.getPreferences();
    const fo: FooterVisibilityOptions = {
      showDoctorPhoneInPdf: prefs?.showDoctorPhoneInPdf as boolean | undefined,
      showDoctorEmailInPdf: prefs?.showDoctorEmailInPdf as boolean | undefined,
    };
    this.fCtx = { doctor, opts: fo };
    const doc = new jsPDF();
    try {
      const tipoL: Record<CertificatoPaziente["tipo"], string> = {
        assenza_lavoro: "Assenza da lavoro", idoneita: "Idoneità", malattia: "Malattia", altro: "Altro",
      };
      let y = this.drawHeader(doc, "CERTIFICATO MEDICO", tipoL[certificato.tipo] || certificato.tipo, doctor);
      y = this.drawPatientBlock(doc, patient, certificato.dataCertificato, y, "Data certificato", { showDate: false, showSesso: false, showBirthDate: false });
      y += 2;
      y = this.heading(doc, y, "Si certifica che");
      y = this.block(doc, certificato.descrizione || "", ML + 1, y, PW - 2, LH + 0.6, {
        font: "helvetica", style: "normal", fontSize: 10, color: K30,
      });
      await this.drawSignatureBlock(doc, doctor, y);
      this.drawFooter(doc, doctor, fo);
      return doc.output("blob") as Blob;
    } finally {
      this.fCtx = null;
    }
  }

  // ─── RICETTA ──────────────────────────────────────────────────────────────
  static async generateRicettaPDF(
    patient: Patient, ricetta: RicettaPaziente, doctor: Doctor | null
  ): Promise<Blob> {
    const prefs = await PreferenceService.getPreferences();
    const fo: FooterVisibilityOptions = {
      showDoctorPhoneInPdf: prefs?.showDoctorPhoneInPdf as boolean | undefined,
      showDoctorEmailInPdf: prefs?.showDoctorEmailInPdf as boolean | undefined,
    };
    this.fCtx = { doctor, opts: fo };
    const doc = new jsPDF();
    try {
      let y = this.drawHeader(doc, "RICETTA MEDICA", "Ricetta bianca", doctor);
      y = this.drawPatientBlock(doc, patient, ricetta.dataRicetta, y, "Data ricetta", { showDate: false, showSesso: false, showBirthDate: false });
      y += 2;
      y = this.heading(doc, y, "Prescrizione");

      const testoRicetta = getRicettaTesto(ricetta);
      if (testoRicetta.trim()) {
        y = this.block(doc, testoRicetta, ML + 1, y, PW - 2, LH + 0.6, {
          font: "helvetica", style: "normal", fontSize: 10.5, color: K30,
        });
      } else {
        doc.setFont("helvetica", "italic"); doc.setFontSize(9); this.tc(doc, K140);
        doc.text("Nessuna prescrizione indicata.", ML + 1, y + 4);
        y += 10;
      }

      await this.drawSignatureBlock(doc, doctor, y);
      this.drawFooter(doc, doctor, fo);
      return doc.output("blob") as Blob;
    } finally {
      this.fCtx = null;
    }
  }
}