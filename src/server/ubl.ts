import { prisma } from "@/lib/prisma";
import { calcInvoice, type CalcLine } from "@/domain/invoice";

function xmlEsc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(minor: number): string {
  return (minor / 100).toFixed(2);
}

/** EN 16931 / UBL 2.1 document type codes. */
function typeCode(docType: string): string {
  if (docType === "AVOIR") return "381"; // credit note
  if (docType === "RECTIFICATIVE") return "384"; // corrected invoice
  return "380"; // commercial invoice (FACTURE, DEVIS)
}

/**
 * UBL 2.1 Invoice (EN 16931 subset). All amounts come from calcInvoice(), the
 * same engine as the preview/PDF, so the XML can never disagree with the PDF.
 * No hard-coded business values — everything is from the DB + user input.
 */
export async function buildUblForInvoice(ownerId: string, invoiceId: string): Promise<string> {
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, ownerId }, include: { lines: { orderBy: { position: "asc" } } } });
  if (!inv) throw new Error("not found");
  const seller = inv.sellerSnapshot ? JSON.parse(inv.sellerSnapshot) : {};
  const buyer = inv.buyerSnapshot ? JSON.parse(inv.buyerSnapshot) : {};
  const lines = (inv.linesSnapshot ? JSON.parse(inv.linesSnapshot) : inv.lines) as (CalcLine & { description: string; unit: string })[];
  const calc = calcInvoice({
    lines: lines.map((l) => ({ quantityMilli: l.quantityMilli, unitPriceMinor: l.unitPriceMinor, discountBps: l.discountBps, taxRateBps: l.taxRateBps, taxExempt: l.taxExempt })),
    invDiscountBps: inv.invDiscountBps,
    invDiscountFixedMinor: inv.invDiscountFixedMinor,
  });

  const cur = inv.currency;
  const linesXml = lines
    .map((l, i) => {
      const net = calc.perLineNetHT[i] ?? 0;
      const rate = l.taxExempt ? 0 : l.taxRateBps;
      const category = l.taxExempt ? "E" : rate === 0 ? "Z" : "S";
      const allowance =
        l.discountBps > 0
          ? `<cac:AllowanceCharge><cbc:ChargeIndicator>false</cbc:ChargeIndicator><cbc:AllowanceChargeReason>Remise ligne</cbc:AllowanceChargeReason><cbc:Amount currencyID="${cur}">${money(Math.floor((l.quantityMilli * l.unitPriceMinor + 500) / 1000) - net)}</cbc:Amount></cac:AllowanceCharge>`
          : "";
      return `
  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${(l.quantityMilli / 1000).toFixed(3)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${cur}">${money(net)}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Name>${xmlEsc(l.description)}</cbc:Name>${l.description ? `<cbc:Description>${xmlEsc(l.description)}</cbc:Description>` : ""}<cac:ClassifiedTaxCategory><cbc:ID>${category}</cbc:ID><cbc:Percent>${(rate / 100).toFixed(2)}</cbc:Percent><cac:TaxScheme><cbc:ID>TVA</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="${cur}">${money(l.unitPriceMinor)}</cbc:PriceAmount></cac:Price>${allowance}
  </cac:InvoiceLine>`;
    })
    .join("");

  const taxSubtotals = calc.buckets
    .map((b) => {
      const category = b.rateBps === 0 ? "Z" : "S";
      return `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${cur}">${money(b.taxable)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${cur}">${money(b.tax)}</cbc:TaxAmount>
      <cac:TaxCategory><cbc:ID>${category}</cbc:ID><cbc:Percent>${(b.rateBps / 100).toFixed(2)}</cbc:Percent><cac:TaxScheme><cbc:ID>TVA</cbc:ID></cac:TaxScheme></cac:TaxCategory>
    </cac:TaxSubtotal>`;
    })
    .join("");

  const type = typeCode(inv.docType);
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${xmlEsc(inv.invoiceNumber ?? inv.id)}</cbc:ID>
  <cbc:IssueDate>${new Date(inv.issueDate).toISOString().slice(0, 10)}</cbc:IssueDate>
  ${inv.dueDate ? `<cbc:DueDate>${new Date(inv.dueDate).toISOString().slice(0, 10)}</cbc:DueDate>` : ""}
  <cbc:InvoiceTypeCode>${type}</cbc:InvoiceTypeCode>
  ${inv.notes ? `<cbc:Note>${xmlEsc(inv.notes)}</cbc:Note>` : ""}
  <cbc:DocumentCurrencyCode>${cur}</cbc:DocumentCurrencyCode>
  ${inv.poNumber ? `<cbc:BuyerReference>${xmlEsc(inv.poNumber)}</cbc:BuyerReference>` : ""}
  <cac:AccountingSupplierParty><cac:Party>
    <cbc:EndpointID schemeID="0158">${xmlEsc(seller.ice ?? "")}</cbc:EndpointID>
    <cac:PartyName><cbc:Name>${xmlEsc(seller.tradeName || seller.legalName || "")}</cbc:Name></cac:PartyName>
    <cac:PostalAddress><cbc:StreetName>${xmlEsc(seller.address ?? "")}</cbc:StreetName><cbc:CityName>${xmlEsc(seller.city ?? "")}</cbc:CityName><cac:Country><cbc:IdentificationCode>MA</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
    <cac:PartyTaxScheme><cbc:CompanyID>${xmlEsc(seller.identifiantFiscal ?? "")}</cbc:CompanyID><cac:TaxScheme><cbc:ID>TVA</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>
    <cac:PartyLegalEntity><cbc:RegistrationName>${xmlEsc(seller.legalName ?? "")}</cbc:RegistrationName><cbc:CompanyID schemeID="0158">${xmlEsc(seller.ice ?? "")}</cbc:CompanyID></cac:PartyLegalEntity>
  </cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party>
    <cbc:EndpointID schemeID="0158">${xmlEsc(buyer.ice ?? "")}</cbc:EndpointID>
    <cac:PartyName><cbc:Name>${xmlEsc(buyer.companyName || buyer.name || "")}</cbc:Name></cac:PartyName>
    <cac:PostalAddress><cbc:StreetName>${xmlEsc(buyer.address ?? "")}</cbc:StreetName><cbc:CityName>${xmlEsc(buyer.city ?? "")}</cbc:CityName><cac:Country><cbc:IdentificationCode>MA</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
    <cac:PartyTaxScheme><cbc:CompanyID>${xmlEsc(buyer.clientIF ?? "")}</cbc:CompanyID><cac:TaxScheme><cbc:ID>TVA</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>
  </cac:Party></cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${cur}">${money(calc.totalTVA)}</cbc:TaxAmount>${taxSubtotals}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${cur}">${money(calc.subtotalHT)}</cbc:LineExtensionAmount>
    ${calc.invDiscountTotal > 0 ? `<cbc:AllowanceTotalAmount currencyID="${cur}">${money(calc.invDiscountTotal)}</cbc:AllowanceTotalAmount>` : ""}
    <cbc:TaxExclusiveAmount currencyID="${cur}">${money(calc.taxableTotal)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${cur}">${money(calc.totalTTC)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${cur}">${money(calc.totalTTC)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${linesXml}
</Invoice>`;
}
