import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { calcInvoice, formatMoney } from "@/domain/invoice";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica", color: "#111" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  sellerName: { fontSize: 14, fontWeight: "bold" },
  muted: { color: "#555" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 2 },
  meta: { marginBottom: 12 },
  twoCol: { flexDirection: "row", gap: 16, marginBottom: 12 },
  box: { flex: 1, border: "1px solid #ddd", padding: 8, borderRadius: 4 },
  boxTitle: { fontWeight: "bold", marginBottom: 4, fontSize: 10 },
  tableHead: { flexDirection: "row", backgroundColor: "#111", color: "#fff", padding: 6, fontWeight: "bold" },
  tableRow: { flexDirection: "row", padding: 6, borderBottom: "1px solid #eee" },
  cDesc: { flex: 4 },
  cQty: { flex: 1, textAlign: "right" },
  cPrice: { flex: 1.4, textAlign: "right" },
  cTotal: { flex: 1.4, textAlign: "right" },
  totals: { marginTop: 10, alignSelf: "flex-end", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, fontWeight: "bold", fontSize: 11, borderTop: "2px solid #111", marginTop: 4 },
  footer: { marginTop: 16, borderTop: "1px solid #ddd", paddingTop: 8, color: "#555", fontSize: 8 },
  pageNo: { position: "absolute", bottom: 20, right: 40, fontSize: 8, color: "#888" },
});

export interface PdfInvoice {
  invoiceNumber: string | null;
  docType?: string; // FACTURE | AVOIR | RECTIFICATIVE
  linkedNumber?: string | null;
  correctionReason?: string | null;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  locale: string;
  seller: Record<string, string | null | undefined>;
  buyer: Record<string, string | null | undefined>;
  lines: { description: string; quantityMilli: number; unit: string; unitPriceMinor: number; discountBps: number; taxRateBps: number; taxExempt: boolean }[];
  invDiscountBps: number;
  invDiscountFixedMinor: number;
  poNumber?: string | null;
  paymentMode?: string | null;
  taxMention?: string | null;
  amountInWords?: string | null;
  notes?: string | null;
  footerText?: string | null;
}

export function InvoiceDoc({ inv }: { inv: PdfInvoice }) {
  const calc = calcInvoice({
    lines: inv.lines,
    invDiscountBps: inv.invDiscountBps,
    invDiscountFixedMinor: inv.invDiscountFixedMinor,
  });
  const fmt = (m: number) => formatMoney(m, inv.currency, inv.locale.startsWith("en") ? "en-GB" : "fr-MA");
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            {inv.seller.logoPath && (inv.seller.logoPath.startsWith("http") || inv.seller.logoPath.startsWith("data:"))
              ? <Image src={inv.seller.logoPath} style={{ width: 96, height: 48, objectFit: "contain", marginBottom: 6 }} />
              : null}
            <Text style={s.sellerName}>{inv.seller.legalName || "Seller"}</Text>
            {inv.seller.tradeName ? <Text style={s.muted}>{inv.seller.tradeName}</Text> : null}
            <Text style={s.muted}>{inv.seller.address || ""}{inv.seller.city ? `, ${inv.seller.city}` : ""}</Text>
            {[inv.seller.phone, inv.seller.email].filter(Boolean).join(" · ") ? (
              <Text style={s.muted}>{[inv.seller.phone, inv.seller.email].filter(Boolean).join(" · ")}</Text>
            ) : null}
            {[inv.seller.ice && `ICE ${inv.seller.ice}`, inv.seller.identifiantFiscal && `IF ${inv.seller.identifiantFiscal}`, inv.seller.patente && `TP ${inv.seller.patente}`, inv.seller.rc && `RC ${inv.seller.rc}${inv.seller.rcCity ? ` ${inv.seller.rcCity}` : ""}`, inv.seller.cnss && `CNSS ${inv.seller.cnss}`, inv.seller.legalForm && `${inv.seller.legalForm}`].filter(Boolean).join(" · ") ? (
              <Text style={s.muted}>{[inv.seller.ice && `ICE ${inv.seller.ice}`, inv.seller.identifiantFiscal && `IF ${inv.seller.identifiantFiscal}`, inv.seller.patente && `TP ${inv.seller.patente}`, inv.seller.rc && `RC ${inv.seller.rc}${inv.seller.rcCity ? ` ${inv.seller.rcCity}` : ""}`, inv.seller.cnss && `CNSS ${inv.seller.cnss}`, inv.seller.legalForm && `${inv.seller.legalForm}`].filter(Boolean).join(" · ")}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.title}>{inv.docType === "AVOIR" ? "AVOIR" : inv.docType === "RECTIFICATIVE" ? "FACTURE RECTIFICATIVE" : "FACTURE"}</Text>
            <Text>{inv.invoiceNumber ?? "BROUILLON — sans numéro"}</Text>
            {inv.linkedNumber ? <Text style={s.muted}>{inv.docType === "AVOIR" ? `Avoir sur ${inv.linkedNumber}` : `Annule et remplace ${inv.linkedNumber}`}</Text> : null}
            {inv.correctionReason ? <Text style={s.muted}>Motif : {inv.correctionReason}</Text> : null}
            <Text style={s.muted}>Émise le {inv.issueDate}{inv.dueDate ? ` · Échéance ${inv.dueDate}` : ""}</Text>
            {inv.paymentMode ? <Text style={s.muted}>Paiement : {inv.paymentMode}</Text> : null}
          </View>
        </View>

        <View style={s.twoCol}>
          <View style={s.box}>
            <Text style={s.boxTitle}>Vendeur</Text>
            <Text>{inv.seller.legalName}</Text>
            <Text style={s.muted}>{inv.seller.address}{inv.seller.city ? `, ${inv.seller.city}` : ""}</Text>
          </View>
          <View style={s.box}>
            <Text style={s.boxTitle}>Facturé à</Text>
            <Text>{inv.buyer.companyName || inv.buyer.name}</Text>
            {inv.buyer.address ? <Text style={s.muted}>{inv.buyer.address}{inv.buyer.city ? `, ${inv.buyer.city}` : ""}</Text> : null}
            {inv.buyer.ice ? <Text style={s.muted}>ICE {inv.buyer.ice}</Text> : null}
            {[inv.buyer.clientIF && `IF ${inv.buyer.clientIF}`, inv.buyer.clientRC && `RC ${inv.buyer.clientRC}`].filter(Boolean).join(" · ") ? (
              <Text style={s.muted}>{[inv.buyer.clientIF && `IF ${inv.buyer.clientIF}`, inv.buyer.clientRC && `RC ${inv.buyer.clientRC}`].filter(Boolean).join(" · ")}</Text>
            ) : null}
          </View>
        </View>

        {inv.poNumber ? <Text style={s.meta}>Bon de commande : {inv.poNumber}</Text> : null}

        <View style={s.tableHead}>
          <Text style={s.cDesc}>Description</Text>
          <Text style={s.cQty}>Qté</Text>
          <Text style={s.cPrice}>P.U. HT</Text>
          <Text style={s.cTotal}>Total HT</Text>
        </View>
        {inv.lines.map((l, i) => {
          const gross = Math.floor((l.quantityMilli * l.unitPriceMinor + 500) / 1000);
          const net = gross - Math.floor((gross * l.discountBps + 5000) / 10000);
          return (
            <View key={i} style={s.tableRow} wrap={false}>
              <Text style={s.cDesc}>{l.description}{l.taxExempt ? " (exonéré)" : l.taxRateBps ? `  [TVA ${(l.taxRateBps / 100).toFixed(l.taxRateBps % 100 ? 1 : 0)}%]` : ""}</Text>
              <Text style={s.cQty}>{(l.quantityMilli / 1000).toString()} {l.unit}</Text>
              <Text style={s.cPrice}>{fmt(l.unitPriceMinor)}</Text>
              <Text style={s.cTotal}>{fmt(net)}</Text>
            </View>
          );
        })}

        <View style={s.totals}>
          <View style={s.totalRow}><Text>Sous-total HT</Text><Text>{fmt(calc.subtotalHT)}</Text></View>
          {calc.invDiscountTotal > 0 ? <View style={s.totalRow}><Text>Remise</Text><Text>-{fmt(calc.invDiscountTotal)}</Text></View> : null}
          {calc.buckets.map((b, i) => (
            <View key={i} style={s.totalRow}><Text>TVA {(b.rateBps / 100).toFixed(0)}% (base {fmt(b.taxable)})</Text><Text>{fmt(b.tax)}</Text></View>
          ))}
          <View style={s.grand}><Text>{inv.docType === "AVOIR" ? "Net à déduire" : "Total TTC"} ({inv.currency})</Text><Text>{fmt(calc.totalTTC)}</Text></View>
        </View>

        {inv.taxMention ? <Text style={{ marginTop: 8, fontWeight: "bold" }}>{inv.taxMention}</Text> : null}
        {inv.amountInWords ? <Text style={{ marginTop: 4, fontStyle: "italic" }}>{inv.amountInWords}</Text> : null}

        {inv.seller.rib || inv.seller.iban ? (
          <View style={{ marginTop: 10 }}>
            <Text style={s.boxTitle}>Paiement</Text>
            {inv.seller.bankName ? <Text>{inv.seller.bankName}</Text> : null}
            {inv.seller.rib ? <Text>RIB : {inv.seller.rib}</Text> : null}
            {inv.seller.iban ? <Text>IBAN : {inv.seller.iban}</Text> : null}
            {inv.seller.swift ? <Text>SWIFT : {inv.seller.swift}</Text> : null}
          </View>
        ) : null}

        {inv.notes ? <Text style={{ marginTop: 8 }}>Notes : {inv.notes}</Text> : null}

        <View style={s.footer}>
          <Text>{inv.footerText || `${inv.seller.legalName || ""} — ${[inv.seller.ice && `ICE ${inv.seller.ice}`, inv.seller.identifiantFiscal && `IF ${inv.seller.identifiantFiscal}`, inv.seller.patente && `TP ${inv.seller.patente}`, inv.seller.rc && `RC ${inv.seller.rc}${inv.seller.rcCity ? ` ${inv.seller.rcCity}` : ""}`].filter(Boolean).join(" · ")}`}</Text>
          <Text>Document généré — montants en {inv.currency}. Prix saisis HT, TVA ventilée par taux (arrondi moitié au supérieur). Conservation 10 ans (art. 211 CGI). Document inaltérable après émission.</Text>
        </View>
        <Text style={s.pageNo} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}
