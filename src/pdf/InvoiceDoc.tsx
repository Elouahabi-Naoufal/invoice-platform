import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { calcInvoice, formatMoney, amountInWords, paymentTermsLabel } from "@/domain/invoice";

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
    fontSize: 8.5,
    fontFamily: "Helvetica",
    color: INK,
  },
  topBar: { height: 5 },
  body: { paddingHorizontal: 40, paddingTop: 22 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 120, height: 56, objectFit: "contain" },
  companyBlock: { textAlign: "right", maxWidth: 250 },
  companyName: { fontSize: 12, fontWeight: "bold" },
  companyLine: { color: MUTED, marginTop: 1 },
  identity: { marginTop: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  docTitle: { fontSize: 27, fontWeight: "bold", letterSpacing: 0.5 },
  docNumber: { fontSize: 11, fontWeight: "bold", marginTop: 2 },
  metaCol: { textAlign: "right" },
  metaRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 1 },
  metaLabel: { color: MUTED, width: 62, textAlign: "right", marginRight: 6 },
  metaValue: { fontWeight: "bold", minWidth: 80, textAlign: "right" },
  parties: { flexDirection: "row", gap: 12, marginTop: 16 },
  partyBox: { flex: 1, borderWidth: 1, borderColor: HAIR, borderRadius: 5, padding: 10 },
  partyLabel: { fontSize: 7, color: MUTED, letterSpacing: 1, marginBottom: 4 },
  partyName: { fontSize: 10, fontWeight: "bold" },
  partyLine: { color: MUTED, marginTop: 1 },
  tableHead: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, marginTop: 16, borderRadius: 4 },
  th: { color: "#FFFFFF", fontWeight: "bold", fontSize: 8 },
  row: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: HAIR },
  cDesc: { flex: 1, paddingRight: 8 },
  cQty: { width: 44, textAlign: "right" },
  cPU: { width: 72, textAlign: "right" },
  cDisc: { width: 52, textAlign: "right" },
  cTVA: { width: 52, textAlign: "right" },
  cTotal: { width: 76, textAlign: "right", fontWeight: "bold" },
  descSub: { color: MUTED, fontSize: 7.5, marginTop: 1 },
  totalsWrap: { alignItems: "flex-end", marginTop: 12 },
  totalsBox: { width: 250 },
  tRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  tLabel: { color: MUTED },
  tValue: { fontWeight: "bold" },
  tGrand: { flexDirection: "row", justifyContent: "space-between", marginTop: 5, paddingTop: 7, borderTopWidth: 2, alignItems: "center" },
  tGrandLabel: { fontSize: 10, fontWeight: "bold" },
  tGrandValue: { fontSize: 13.5, fontWeight: "bold" },
  wordsBox: { marginTop: 14, backgroundColor: FAINT, borderRadius: 4, padding: 9 },
  wordsLabel: { fontSize: 7.5, color: MUTED, letterSpacing: 0.6, marginBottom: 3 },
  wordsText: { fontStyle: "italic" },
  taxMention: { marginTop: 8, fontWeight: "bold" },
  bottomGrid: { flexDirection: "row", gap: 12, marginTop: 14 },
  bottomBox: { flex: 1 },
  bottomTitle: { fontSize: 7.5, letterSpacing: 1, marginBottom: 4, fontWeight: "bold" },
  bottomLine: { marginTop: 1.5 },
  notesBox: { marginTop: 10 },
  footerFixed: { position: "absolute", bottom: 0, left: 0, right: 0 },
  footerBar: { height: 3 },
  footerInner: { paddingHorizontal: 40, paddingVertical: 9, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerText: { fontSize: 7.5, color: MUTED, maxWidth: 430 },
  pageNo: { fontSize: 7.5, color: MUTED },
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
          {/* ── Header: logo + company identity ── */}
          <View style={s.header}>
            <View>
              {showLogo ? <Image src={logoSrc} style={s.logo} /> : null}
              <Text style={s.companyName}>{str(inv.seller.legalName) || "Vendeur"}</Text>
              {inv.seller.tradeName ? <Text style={s.companyLine}>{str(inv.seller.tradeName)}</Text> : null}
              {inv.seller.legalForm ? <Text style={s.companyLine}>{str(inv.seller.legalForm)}</Text> : null}
            </View>
            <View style={s.companyBlock}>
              <Text style={s.companyLine}>{str(inv.seller.address)}{inv.seller.city ? `, ${inv.seller.city}` : ""}</Text>
              {[inv.seller.phone, inv.seller.email].filter(Boolean).length > 0 ? (
                <Text style={s.companyLine}>{[inv.seller.phone, inv.seller.email].filter(Boolean).map(str).join("  ·  ")}</Text>
              ) : null}
              {sellerIds.map((t, i) => (
                <Text key={i} style={s.companyLine}>{t}</Text>
              ))}
            </View>
          </View>

          {/* ── Invoice identity ── */}
          <View style={s.identity}>
            <View>
              <Text style={s.docTitle}>{title}</Text>
              <Text style={s.docNumber}>{inv.invoiceNumber ?? "BROUILLON — sans numéro"}</Text>
              {inv.linkedNumber ? (
                <Text style={s.companyLine}>
                  {inv.docType === "AVOIR" ? `Avoir sur ${inv.linkedNumber}` : `Annule et remplace ${inv.linkedNumber}`}
                  {inv.correctionReason ? ` — Motif : ${inv.correctionReason}` : ""}
                </Text>
              ) : inv.correctionReason ? (
                <Text style={s.companyLine}>Motif : {inv.correctionReason}</Text>
              ) : null}
            </View>
            <View style={s.metaCol}>
              <View style={s.metaRow}><Text style={s.metaLabel}>Date</Text><Text style={s.metaValue}>{dateFmt(inv.issueDate)}</Text></View>
              {inv.dueDate ? <View style={s.metaRow}><Text style={s.metaLabel}>Échéance</Text><Text style={s.metaValue}>{dateFmt(inv.dueDate)}</Text></View> : null}
              <View style={s.metaRow}><Text style={s.metaLabel}>Devise</Text><Text style={s.metaValue}>{inv.currency}</Text></View>
              {inv.poNumber ? <View style={s.metaRow}><Text style={s.metaLabel}>Cde client</Text><Text style={s.metaValue}>{inv.poNumber}</Text></View> : null}
            </View>
          </View>

          {/* ── Seller / Buyer ── */}
          <View style={s.parties}>
            <View style={s.partyBox}>
              <Text style={s.partyLabel}>ÉMETTEUR</Text>
              <Text style={s.partyName}>{str(inv.seller.legalName)}</Text>
              <Text style={s.partyLine}>{str(inv.seller.address)}{inv.seller.city ? `, ${inv.seller.city}` : ""}</Text>
              {sellerIds.slice(0, 3).map((t, i) => (
                <Text key={i} style={s.partyLine}>{t}</Text>
              ))}
            </View>
            <View style={s.partyBox}>
              <Text style={s.partyLabel}>FACTURÉ À</Text>
              <Text style={s.partyName}>{str(inv.buyer.companyName) || str(inv.buyer.name) || "—"}</Text>
              {inv.buyer.address ? <Text style={s.partyLine}>{str(inv.buyer.address)}{inv.buyer.city ? `, ${inv.buyer.city}` : ""}</Text> : null}
              {inv.buyer.ice ? <Text style={s.partyLine}>ICE : {str(inv.buyer.ice)}</Text> : null}
              {inv.buyer.clientIF ? <Text style={s.partyLine}>IF : {str(inv.buyer.clientIF)}</Text> : null}
              {inv.buyer.clientRC ? <Text style={s.partyLine}>RC : {str(inv.buyer.clientRC)}</Text> : null}
            </View>
          </View>

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

          {/* ── Amount in words ── */}
          <View style={s.wordsBox} wrap={false}>
            <Text style={s.wordsLabel}>ARRÊTÉE LA PRÉSENTE FACTURE À LA SOMME DE</Text>
            <Text style={s.wordsText}>{inv.amountInWords || amountInWords(calc.totalTTC, inv.currency)}</Text>
          </View>
          {inv.taxMention ? <Text style={s.taxMention}>{inv.taxMention}</Text> : null}

          {/* ── Payment + legal ── */}
          <View style={s.bottomGrid}>
            <View style={s.bottomBox}>
              <Text style={[s.bottomTitle, { color: accent }]}>PAIEMENT</Text>
              {inv.paymentMode ? <Text style={s.bottomLine}>Mode : {inv.paymentMode}</Text> : null}
              {paymentTermsLabel(inv.paymentTerms, inv.locale) ? <Text style={s.bottomLine}>Conditions : {paymentTermsLabel(inv.paymentTerms, inv.locale)}</Text> : null}
              {inv.dueDate ? <Text style={s.bottomLine}>Échéance : {dateFmt(inv.dueDate)}</Text> : null}
              {inv.seller.bankName ? <Text style={s.bottomLine}>{str(inv.seller.bankName)}</Text> : null}
              {inv.seller.rib ? <Text style={s.bottomLine}>RIB : {str(inv.seller.rib)}</Text> : null}
              {inv.seller.iban ? <Text style={s.bottomLine}>IBAN : {str(inv.seller.iban)}</Text> : null}
              {inv.seller.swift ? <Text style={s.bottomLine}>SWIFT : {str(inv.seller.swift)}</Text> : null}
              {!inv.paymentMode && !inv.seller.rib && !inv.seller.iban ? <Text style={[s.bottomLine, { color: MUTED }]}>—</Text> : null}
            </View>
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
          </View>

          {inv.notes ? (
            <View style={s.notesBox}>
              <Text style={[s.bottomTitle, { color: accent }]}>NOTES</Text>
              <Text>{inv.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Anchored footer (every page) ── */}
        <View style={s.footerFixed} fixed>
          <View style={[s.footerBar, { backgroundColor: accent }]} />
          <View style={s.footerInner}>
            <Text style={s.footerText}>
              {inv.footerText || `${str(inv.seller.legalName)}  ·  ${str(inv.seller.address)}${inv.seller.city ? `, ${inv.seller.city}` : ""}  ·  ${[inv.seller.phone, inv.seller.email].filter(Boolean).map(str).join("  ·  ")}  ·  ICE ${str(inv.seller.ice)}`}
              {"  ·  Conservation 10 ans (art. 211 CGI)"}
            </Text>
            <Text style={s.pageNo} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} / ${totalPages}`} />
          </View>
        </View>
      </Page>
    </Document>
  );
}
