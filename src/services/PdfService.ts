import jsPDF from "jspdf";
import {
  Patient, Visit, Doctor,
  RichiestaEsameComplementare,
  CertificatoPaziente,
  RicettaPaziente,
} from "../types/Storage";
import { DoctorService, PreferenceService } from "./OfflineServices";
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
function san(t: string): string {
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

    let y = this.drawHeader(doc, "VISITA SPECIALISTICA", "Referto Specialistico", doctor);

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

    y = this.drawTextSection(doc, y, "Descrizione Problema / Dati Clinici", vis.problemaClinico);

    if (hasAnamnesiStrutturataContent(nv.anamnesiStrutturata)) {
      const anamnesiCfg = parseAnamnesiConfig(prefs).generale;
      y = this.drawStructuredAnamnesi(
        doc, y, nv.anamnesiStrutturata!, anamnesiCfg.campi, anamnesiCfg.etichette,
      );
    } else {
      y = this.drawTextSection(doc, y, "Anamnesi", vis.prestazione);
    }

    y = this.drawTextSection(doc, y, "Esame Obiettivo", vis.esameObiettivo);
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
        assenza_lavoro: "Assenza da lavoro", idoneita: "Idoneita'", malattia: "Malattia", altro: "Altro",
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