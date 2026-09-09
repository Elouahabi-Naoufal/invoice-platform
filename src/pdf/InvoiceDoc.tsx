import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { calcInvoice, formatMoney } from "@/domain/invoice";

/**
 * Light premium stationery — PRESENTATION ONLY.
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
const BODY = "#333333";
const LIGHT = "#71717A";
const BGLIGHT = "#F8FAFC";
const BORDER = "#E2E8F0";

function accentOf(seller: PdfInvoice["seller"]): string {
  const a = String(seller.accentColor ?? "#2563EB");
  return /^#[0-9A-Fa-f]{6}$/.test(a) ? a : "#2563EB";
}

const s = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 72, // room for fixed footer
    paddingHorizontal: 44,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: BODY,
    lineHeight: 1.5,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 26 },
  logo: { width: 120, height: 56, objectFit: "contain", marginBottom: 8 },
  brandName: { fontSize: 15, fontWeight: "bold", color: INK },
  brandSub: { color: LIGHT, marginTop: 8, fontSize: 9 },
  titleBlock: { textAlign: "right" },
  docTitle: { fontSize: 30, fontWeight: "light", textTransform: "uppercase", letterSpacing: 1, color: INK },
  metaLine: { color: LIGHT, marginTop: 2, fontSize: 9 },
  metaStrong: { color: BODY, fontWeight: "bold" },
  partySection: { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 18, marginBottom: 22 },
  partyLabel: { fontSize: 8, textTransform: "uppercase", color: LIGHT, letterSpacing: 0.5, marginBottom: 6 },
  partyName: { fontWeight: "bold", color: BODY, fontSize: 10.5 },
  partyLine: { color: LIGHT, marginTop: 1, fontSize: 9 },
  tableHead: { flexDirection: "row", backgroundColor: BGLIGHT, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 3 },
  th: { color: LIGHT, fontWeight: "bold", fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  row: { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  cDesc: { flex: 1, paddingRight: 10 },
  cQty: { width: 52, textAlign: "right" },
  cPU: { width: 82, textAlign: "right" },
  cDisc: { width: 56, textAlign: "right" },
  cTVA: { width: 56, textAlign: "right" },
  cTotal: { width: 88, textAlign: "right", fontWeight: "bold", color: INK },
  descMain: { fontWeight: "bold", color: BODY },
  descSub: { color: LIGHT, fontSize: 8, marginTop: 3 },
  totalsWrap: { alignItems: "flex-end", marginTop: 6, marginBottom: 20 },
  totalsBox: { width: 270 },
  tRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 12 },
  tLabel: { color: BODY },
  tValue: { fontWeight: "bold", color: INK },
  tGrand: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingTop: 9, paddingHorizontal: 12, borderTopWidth: 2, borderTopColor: INK, alignItems: "center" },
  tGrandLabel: { fontSize: 11, fontWeight: "bold", color: INK },
  tGrandValue: { fontSize: 16, fontWeight: "bold" },
  taxMention: { marginTop: 4, marginBottom: 12, fontWeight: "bold", textAlign: "right", fontSize: 9 },
  infoGrid: { flexDirection: "row", gap: 24, marginBottom: 8 },
  infoBox: { flex: 1 },
  infoTitle: { fontSize: 8, textTransform: "uppercase", color: LIGHT, letterSpacing: 0.5, marginBottom: 5 },
  infoLine: { marginTop: 1.5, fontSize: 9, color: BODY },
  notesBox: { marginTop: 14, marginBottom: 8 },
  footerFixed: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 44 },
  footerInner: { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10, paddingBottom: 14, textAlign: "center" },
  footerText: { fontSize: 8.5, color: LIGHT },
  footerSmall: { fontSize: 7.5, color: LIGHT, marginTop: 4 },
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
  const title = inv.docType === "AVOIR" ? "Avoir" : inv.docType === "RECTIFICATIVE" ? "Facture rectificative" : "Facture";
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
        <View>
          {/* ── Header ── */}
          <View style={s.header}>
            <View>
              {showLogo ? <Image src={logoSrc} style={s.logo} /> : null}
              <Text style={s.brandName}>{str(inv.seller.legalName) || "Vendeur"}</Text>
              <Text style={s.brandSub}>
                {str(inv.seller.address)}{inv.seller.city ? `, ${inv.seller.city}` : ""}
                {[inv.seller.phone, inv.seller.email].filter(Boolean).length > 0
                  ? `\n${[inv.seller.phone, inv.seller.email].filter(Boolean).map(str).join("\n")}`
                  : ""}
              </Text>
            </View>
            <View style={s.titleBlock}>
              <Text style={s.docTitle}>{title}</Text>
              <View style={{ marginTop: 8 }}>
                <Text style={s.metaLine}><Text style={s.metaStrong}>{inv.invoiceNumber ?? "Brouillon — sans numéro"}</Text></Text>
                {inv.linkedNumber ? (
                  <Text style={s.metaLine}>{inv.docType === "AVOIR" ? `Avoir sur ${inv.linkedNumber}` : `Annule et remplace ${inv.linkedNumber}`}{inv.correctionReason ? ` — ${inv.correctionReason}` : ""}</Text>
                ) : null}
                <Text style={s.metaLine}><Text style={s.metaStrong}>Date : </Text>{dateFmt(inv.issueDate)}</Text>
                {inv.dueDate ? <Text style={s.metaLine}><Text style={s.metaStrong}>Échéance : </Text>{dateFmt(inv.dueDate)}</Text> : null}
                <Text style={s.metaLine}><Text style={s.metaStrong}>Devise : </Text>{inv.currency}</Text>
                {inv.poNumber ? <Text style={s.metaLine}><Text style={s.metaStrong}>Cde client : </Text>{inv.poNumber}</Text> : null}
              </View>
            </View>
          </View>

          {/* ── Bill-to ── */}
          <View style={s.partySection}>
            <Text style={s.partyLabel}>Facturé à</Text>
            <Text style={s.partyName}>{str(inv.buyer.companyName) || str(inv.buyer.name) || "—"}</Text>
            {inv.buyer.address ? <Text style={s.partyLine}>{str(inv.buyer.address)}{inv.buyer.city ? `, ${inv.buyer.city}` : ""}</Text> : null}
            {[inv.buyer.ice && `ICE : ${inv.buyer.ice}`, inv.buyer.clientIF && `IF : ${inv.buyer.clientIF}`, inv.buyer.clientRC && `RC : ${inv.buyer.clientRC}`].filter(Boolean).map((t, i) => (
              <Text key={i} style={s.partyLine}>{t}</Text>
            ))}
          </View>

          {/* ── Lines ── */}
          <View style={s.tableHead}>
            <Text style={[s.th, s.cDesc]}>Désignation</Text>
            <Text style={[s.th, s.cQty]}>Qté</Text>
            <Text style={[s.th, s.cPU]}>P.U. HT</Text>
            <Text style={[s.th, s.cDisc]}>Remise</Text>
            <Text style={[s.th, s.cTVA]}>TVA</Text>
            <Text style={[s.th, s.cTotal]}>Montant</Text>
          </View>
          {inv.lines.map((l, i) => {
            const gross = Math.floor((l.quantityMilli * l.unitPriceMinor + 500) / 1000);
            const net = gross - Math.floor((gross * l.discountBps + 5000) / 10000);
            return (
              <View key={i} style={s.row} wrap={false}>
                <View style={s.cDesc}>
                  <Text style={s.descMain}>{l.description || "—"}</Text>
                </View>
                <Text style={s.cQty}>{l.quantityMilli / 1000}</Text>
                <Text style={s.cPU}>{fmt(l.unitPriceMinor)}</Text>
                <Text style={s.cDisc}>{l.discountBps > 0 ? `${l.discountBps / 100} %` : "—"}</Text>
                <Text style={s.cTVA}>{l.taxExempt ? "Exo." : `${l.taxRateBps / 100} %`}</Text>
                <Text style={s.cTotal}>{fmt(net)}</Text>
              </View>
            );
          })}

          {/* ── Totals ── */}
          <View style={s.totalsWrap} wrap={false}>
            <View style={s.totalsBox}>
              <View style={s.tRow}><Text style={s.tLabel}>Total HT</Text><Text style={s.tValue}>{fmt(calc.subtotalHT)}</Text></View>
              {calc.invDiscountTotal > 0 ? (
                <View style={s.tRow}><Text style={s.tLabel}>Remise globale</Text><Text style={s.tValue}>−{fmt(calc.invDiscountTotal)}</Text></View>
              ) : null}
              {calc.buckets.map((b, i) => (
                <View key={i} style={s.tRow}>
                  <Text style={s.tLabel}>TVA {b.rateBps / 100} % (base {fmt(b.taxable)})</Text>
                  <Text style={s.tValue}>{fmt(b.tax)}</Text>
                </View>
              ))}
              <View style={s.tGrand}>
                <Text style={s.tGrandLabel}>{inv.docType === "AVOIR" ? "NET À DÉDUIRE" : "TOTAL TTC"}</Text>
                <Text style={[s.tGrandValue, { color: accent }]}>{fmt(calc.totalTTC)}</Text>
              </View>
            </View>
          </View>
          {inv.taxMention ? <Text style={s.taxMention}>{inv.taxMention}</Text> : null}

          {/* ── Payment / legal ── */}
          <View style={s.infoGrid}>
            <View style={s.infoBox}>
              <Text style={s.infoTitle}>Paiement</Text>
              {inv.paymentMode ? <Text style={s.infoLine}>Mode : {inv.paymentMode}</Text> : null}
              {inv.dueDate ? <Text style={s.infoLine}>Échéance : {dateFmt(inv.dueDate)}</Text> : null}
              {inv.seller.bankName ? <Text style={s.infoLine}>{str(inv.seller.bankName)}</Text> : null}
              {inv.seller.rib ? <Text style={s.infoLine}>RIB : {str(inv.seller.rib)}</Text> : null}
              {inv.seller.iban ? <Text style={s.infoLine}>IBAN : {str(inv.seller.iban)}</Text> : null}
              {inv.seller.swift ? <Text style={s.infoLine}>SWIFT : {str(inv.seller.swift)}</Text> : null}
            </View>
            <View style={s.infoBox}>
              <Text style={s.infoTitle}>Mentions légales</Text>
              {sellerIds.map((t, i) => (
                <Text key={i} style={s.infoLine}>{t}</Text>
              ))}
              {inv.seller.cnss ? <Text style={s.infoLine}>CNSS : {str(inv.seller.cnss)}</Text> : null}
              {typeof inv.seller.capitalSocial === "number" ? (
                <Text style={s.infoLine}>Capital : {fmt(inv.seller.capitalSocial as number)}</Text>
              ) : null}
            </View>
          </View>

          {inv.notes ? (
            <View style={s.notesBox}>
              <Text style={s.infoTitle}>Notes</Text>
              <Text style={s.infoLine}>{inv.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Footer ── */}
        <View style={s.footerFixed} fixed>
          <View style={s.footerInner}>
            <Text style={s.footerText}>
              {inv.footerText || `Merci de votre confiance — paiement ${inv.paymentMode ? str(inv.paymentMode).toLowerCase() : "sous 30 jours"}`}
            </Text>
            <Text style={s.footerSmall}>
              {`${str(inv.seller.legalName)}${inv.seller.city ? `, ${inv.seller.city}` : ""}  ·  ${sellerIds.join("  ·  ")}`}
              {"  ·  Conservation 10 ans (art. 211 CGI)"}
            </Text>
            <Text style={s.footerSmall} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} / ${totalPages}`} />
          </View>
        </View>
      </Page>
    </Document>
  );
}
