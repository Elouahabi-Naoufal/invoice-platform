import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { calcInvoice, formatMoney } from "@/domain/invoice";

/**
 * Full-page A4 invoice stationery — PRESENTATION ONLY.
 * All money comes from calcInvoice() (same engine as web preview + server).
 */

export interface PdfLine {
  description: string;
  quantityMilli: number;
  unit: string;
  unitPriceMinor: number;
  discountBps: number;
  taxRateBps: number;
  taxExempt: boolean;
}

export interface PdfInvoice {
  invoiceNumber: string | null;
  docType?: string; // FACTURE | AVOIR | RECTIFICATIVE
  linkedNumber?: string | null;
  correctionReason?: string | null;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  locale: string;
  seller: Record<string, string | number | null | undefined>;
  buyer: Record<string, string | null | undefined>;
  lines: PdfLine[];
  invDiscountBps: number;
  invDiscountFixedMinor: number;
  poNumber?: string | null;
  clientRef?: string | null;
  paymentMode?: string | null;
  paymentTerms?: string | null;
  taxMention?: string | null;
  amountInWords?: string | null;
  notes?: string | null;
  footerText?: string | null;
}

const INK = "#1A1A1A";
const MUTED = "#6B7280";
const HAIR = "#E5E7EB";
const FAINT = "#F7F7F5";

function accentOf(seller: PdfInvoice["seller"]): string {
  const a = String(seller.accentColor ?? "#1D4ED8");
  return /^#[0-9A-Fa-f]{6}$/.test(a) ? a : "#1D4ED8";
}

const s = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 64, // room for fixed footer
    paddingHorizontal: 0,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: INK,
    lineHeight: 1.45,
  },
  topBar: { height: 5 },
  body: { paddingHorizontal: 36, paddingTop: 26, flex: 1, flexDirection: "column" },
  header: { flexDirection: "row", alignItems: "center", gap: 14 },
  logo: { width: 110, height: 52, objectFit: "contain" },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: "bold" },
  headerSub: { color: MUTED, marginTop: 2, fontSize: 9 },
  companyName: { fontSize: 13, fontWeight: "bold" },
  companyLine: { color: MUTED, marginTop: 1 },
  identity: { marginTop: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  docTitle: { fontSize: 30, fontWeight: "bold", letterSpacing: 0.5, textAlign: "left" },
  docNumber: { fontSize: 12.5, fontWeight: "bold", marginTop: 3, textAlign: "right" },
  metaCol: { marginTop: 2, textAlign: "right" },
  metaRight: { color: MUTED, marginTop: 1, textAlign: "right" },
  metaCenter: { color: MUTED, marginTop: 1, textAlign: "left" },
  metaRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 1 },
  metaLabel: { color: MUTED, width: 62, textAlign: "right", marginRight: 6 },
  metaValue: { fontWeight: "bold", minWidth: 80, textAlign: "right" },
  parties: { flexDirection: "row", gap: 12, marginTop: 16 },
  partyBox: { flex: 1, borderWidth: 1, borderColor: HAIR, borderRadius: 5, padding: 10 },
  partyLabel: { fontSize: 7, color: MUTED, letterSpacing: 1, marginBottom: 4 },
  partyName: { fontSize: 10, fontWeight: "bold" },
  partyLine: { color: MUTED, marginTop: 1 },
  clientLine: { marginTop: 12, backgroundColor: FAINT, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10, fontSize: 9.5 },
  tableHead: { flexDirection: "row", paddingVertical: 13, marginTop: 16, marginHorizontal: -36, paddingHorizontal: 46 },
  th: { color: "#FFFFFF", fontWeight: "bold", fontSize: 8.5 },
  row: { flexDirection: "row", paddingVertical: 8.5, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: HAIR },
  cDesc: { flex: 1, paddingRight: 10 },
  cQty: { width: 48, textAlign: "right" },
  cPU: { width: 84, textAlign: "right" },
  cDisc: { width: 56, textAlign: "right" },
  cTVA: { width: 56, textAlign: "right" },
  cTotal: { width: 88, textAlign: "right", fontWeight: "bold" },
  descSub: { color: MUTED, fontSize: 8, marginTop: 1.5 },
  totalsWrap: { alignItems: "flex-end", marginTop: 14 },
  totalsBox: { width: 285 },
  tRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  tLabel: { color: MUTED },
  tValue: { fontWeight: "bold" },
  tGrand: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 8, borderTopWidth: 2, alignItems: "center" },
  tGrandLabel: { fontSize: 11, fontWeight: "bold" },
  tGrandValue: { fontSize: 15.5, fontWeight: "bold" },
  wordsBox: { marginTop: 14, backgroundColor: FAINT, borderRadius: 4, padding: 9 },
  wordsLabel: { fontSize: 7.5, color: MUTED, letterSpacing: 0.6, marginBottom: 3 },
  wordsText: { fontStyle: "italic" },
  taxMention: { marginTop: 8, fontWeight: "bold" },
  bottomGrid: { flexDirection: "row", gap: 12, marginTop: 10 },
  push: { flex: 1, minHeight: 12 },
  bottomBox: { flex: 1, backgroundColor: FAINT, borderRadius: 4, padding: 10 },
  bottomTitle: { fontSize: 8, letterSpacing: 1, marginBottom: 5, fontWeight: "bold" },
  bottomLine: { marginTop: 2 },
  sigImage: { width: 200, height: 64, objectFit: "contain", marginTop: 2 },
  sigEmpty: { width: 200, height: 64 },
  sigRule: { width: 200, height: 1, backgroundColor: MUTED, marginTop: 6 },
  notesBox: { marginTop: 10 },
  footerFixed: { position: "absolute", bottom: 0, left: 0, right: 0 },
  footerBar: { height: 3 },
  footerInner: { paddingHorizontal: 36, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerText: { fontSize: 8, color: MUTED, maxWidth: 440 },
  pageNo: { fontSize: 8, color: MUTED },
});

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

export function InvoiceDoc({ inv }: { inv: PdfInvoice }) {
  const calc = calcInvoice({
    lines: inv.lines,
    invDiscountBps: inv.invDiscountBps,
    invDiscountFixedMinor: inv.invDiscountFixedMinor,
  });
  const accent = accentOf(inv.seller);
  const locale = inv.locale.startsWith("en") ? "en-GB" : "fr-MA";
  const fmt = (m: number) => formatMoney(m, inv.currency, locale);
  const title = inv.docType === "AVOIR" ? "AVOIR" : inv.docType === "RECTIFICATIVE" ? "FACTURE RECTIFICATIVE" : "FACTURE";
  const dateFmt = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return y && m && d ? `${d}/${m}/${y}` : iso;
  };
  const sellerIds = [
    inv.seller.ice && `ICE : ${inv.seller.ice}`,
    inv.seller.identifiantFiscal && `IF : ${inv.seller.identifiantFiscal}`,
    inv.seller.rc && `RC : ${inv.seller.rc}${inv.seller.rcCity ? ` ${inv.seller.rcCity}` : ""}`,
    inv.seller.patente && `TP : ${inv.seller.patente}`,
  ].filter(Boolean);

  const logoSrc = str(inv.seller.logoPath);
  const showLogo = logoSrc.startsWith("http") || logoSrc.startsWith("data:");

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={[s.topBar, { backgroundColor: accent }]} fixed />

        <View style={s.body}>
          {/* ── Header: logo + company block ── */}
          <View style={s.header}>
            {showLogo ? <Image src={logoSrc} style={s.logo} /> : null}
            <View style={s.headerInfo}>
              <Text style={s.headerName}>{str(inv.seller.legalName) || "Vendeur"}</Text>
              {[inv.seller.legalForm, [inv.seller.address, inv.seller.city].filter(Boolean).map(str).join(", ")]
                .filter((t) => t && String(t).trim()).map((t, i) => (
                  <Text key={i} style={s.headerSub}>{str(t)}</Text>
                ))}
              {sellerIds.length > 0 ? <Text style={s.headerSub}>{sellerIds.join("  ·  ")}</Text> : null}
            </View>
          </View>

          {/* ── Invoice identity: title left, number + dates right ── */}
          <View style={s.identity}>
            <View>
              <Text style={s.docTitle}>{title}</Text>
              {inv.linkedNumber ? (
                <Text style={s.metaCenter}>
                  {inv.docType === "AVOIR" ? `Avoir sur ${inv.linkedNumber}` : `Annule et remplace ${inv.linkedNumber}`}
                  {inv.correctionReason ? ` — Motif : ${inv.correctionReason}` : ""}
                </Text>
              ) : inv.correctionReason ? (
                <Text style={s.metaCenter}>Motif : {inv.correctionReason}</Text>
              ) : null}
            </View>
            <View style={s.metaCol}>
              <Text style={s.docNumber}>N° {inv.invoiceNumber ?? "BROUILLON — sans numéro"}</Text>
              <Text style={s.metaRight}>Date : {dateFmt(inv.issueDate)}</Text>
              {inv.dueDate ? <Text style={s.metaRight}>Échéance : {dateFmt(inv.dueDate)}</Text> : null}
              <Text style={s.metaRight}>Devise : {inv.currency}</Text>
              {inv.poNumber ? <Text style={s.metaRight}>Cde client : {inv.poNumber}</Text> : null}
            </View>
          </View>

          {/* ── Buyer: single compact line (art.145 requires client identification) ── */}
          <Text style={s.clientLine}>
            <Text>Client :  </Text>
            <Text style={{ fontWeight: "bold" }}>{str(inv.buyer.companyName) || str(inv.buyer.name) || "—"}</Text>
            {inv.buyer.address ? <Text>{`  ·  ${str(inv.buyer.address)}${inv.buyer.city ? `, ${inv.buyer.city}` : ""}`}</Text> : null}
            {inv.buyer.ice ? <Text>{`  ·  ICE : ${str(inv.buyer.ice)}`}</Text> : null}
            {inv.buyer.clientIF ? <Text>{`  ·  IF : ${str(inv.buyer.clientIF)}`}</Text> : null}
            {inv.buyer.clientRC ? <Text>{`  ·  RC : ${str(inv.buyer.clientRC)}`}</Text> : null}
          </Text>

          {/* ── Lines table ── */}
          <View style={[s.tableHead, { backgroundColor: accent }]}>
            <Text style={[s.th, s.cDesc]}>Désignation</Text>
            <Text style={[s.th, s.cQty]}>Qté</Text>
            <Text style={[s.th, s.cPU]}>P.U. HT</Text>
            <Text style={[s.th, s.cDisc]}>Remise</Text>
            <Text style={[s.th, s.cTVA]}>TVA</Text>
            <Text style={[s.th, s.cTotal]}>Total HT</Text>
          </View>
          {inv.lines.map((l, i) => {
            const gross = Math.floor((l.quantityMilli * l.unitPriceMinor + 500) / 1000);
            const net = gross - Math.floor((gross * l.discountBps + 5000) / 10000);
            return (
              <View key={i} style={s.row} wrap={false}>
                <View style={s.cDesc}>
                  <Text>{l.description || "—"}</Text>
                  <Text style={s.descSub}>{`${l.quantityMilli / 1000} ${l.unit}`}{l.discountBps > 0 ? `  ·  remise ${l.discountBps / 100} %` : ""}</Text>
                </View>
                <Text style={s.cQty}>{l.quantityMilli / 1000}</Text>
                <Text style={s.cPU}>{fmt(l.unitPriceMinor)}</Text>
                <Text style={s.cDisc}>{l.discountBps > 0 ? `${l.discountBps / 100} %` : "—"}</Text>
                <Text style={s.cTVA}>{l.taxExempt ? "Exo." : `${l.taxRateBps / 100} %`}</Text>
                <Text style={s.cTotal}>{fmt(net)}</Text>
              </View>
            );
          })}

          {/* ── Totals (kept together) ── */}
          <View style={s.totalsWrap} wrap={false}>
            <View style={s.totalsBox}>
              <View style={s.tRow}><Text style={s.tLabel}>Total HT</Text><Text style={s.tValue}>{fmt(calc.subtotalHT)}</Text></View>
              {calc.invDiscountTotal > 0 ? (
                <View style={s.tRow}><Text style={s.tLabel}>Remise globale</Text><Text style={s.tValue}>−{fmt(calc.invDiscountTotal)}</Text></View>
              ) : null}
              {calc.buckets.map((b, i) => (
                <View key={i} style={s.tRow}>
                  <Text style={s.tLabel}>TVA {b.rateBps / 100} % <Text style={{ color: MUTED }}>(base {fmt(b.taxable)})</Text></Text>
                  <Text style={s.tValue}>{fmt(b.tax)}</Text>
                </View>
              ))}
              <View style={[s.tGrand, { borderTopColor: accent }]}>
                <Text style={s.tGrandLabel}>{inv.docType === "AVOIR" ? "NET À DÉDUIRE" : "TOTAL TTC"}</Text>
                <Text style={[s.tGrandValue, { color: accent }]}>{fmt(calc.totalTTC)}</Text>
              </View>
            </View>
          </View>

          {inv.taxMention ? <Text style={s.taxMention}>{inv.taxMention}</Text> : null}

          {inv.notes ? (
            <View style={s.notesBox}>
              <Text style={[s.bottomTitle, { color: accent }]}>NOTES</Text>
              <Text>{inv.notes}</Text>
            </View>
          ) : null}

          {/* Spacer: pushes payment/legal to just above the footer when the page has room */}
          <View style={s.push} />

          {/* ── Payment + legal (legal left, payment right) ── */}
          <View style={s.bottomGrid}>
            <View style={s.bottomBox}>
              <Text style={[s.bottomTitle, { color: accent }]}>MENTIONS LÉGALES</Text>
              {sellerIds.map((t, i) => (
                <Text key={i} style={s.bottomLine}>{t}</Text>
              ))}
              {inv.seller.cnss ? <Text style={s.bottomLine}>CNSS : {str(inv.seller.cnss)}</Text> : null}
              {typeof inv.seller.capitalSocial === "number" ? (
                <Text style={s.bottomLine}>Capital : {fmt(inv.seller.capitalSocial as number)}</Text>
              ) : null}
            </View>
            <View style={s.bottomBox}>
              <Text style={[s.bottomTitle, { color: accent }]}>SIGNATURE</Text>
              {str(inv.seller.signatureData).startsWith("data:") || str(inv.seller.signatureData).startsWith("http") ? (
                <Image src={str(inv.seller.signatureData)} style={s.sigImage} />
              ) : (
                <View style={s.sigEmpty} />
              )}
              <View style={s.sigRule} />
            </View>
          </View>
        </View>

        {/* ── Anchored footer (every page) ── */}
        <View style={s.footerFixed} fixed>
          <View style={[s.footerBar, { backgroundColor: accent }]} />
          <View style={s.footerInner}>
            <Text style={s.footerText}>
              {inv.footerText || `${str(inv.seller.legalName)}  ·  ${str(inv.seller.city)}  ·  ${[inv.seller.phone, inv.seller.email].filter(Boolean).map(str).join("  ·  ")}  ·  ICE ${str(inv.seller.ice)}`}
              {"  ·  Conservation 10 ans (art. 211 CGI)"}
            </Text>
            <Text style={s.pageNo} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} / ${totalPages}`} />
          </View>
        </View>
      </Page>
    </Document>
  );
}
