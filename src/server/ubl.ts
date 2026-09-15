import { prisma } from "@/lib/prisma";

function xmlEsc(s: string): string { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

/** Minimal UBL 2.1 Invoice (EN 16931 subset) — no hard-coded business values; all from DB + user input. */
export async function buildUblForInvoice(ownerId: string, invoiceId: string): Promise<string> {
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, ownerId }, include: { lines: true } });
  if (!inv) throw new Error("Invoice not found");
  const seller = inv.sellerSnapshot ? JSON.parse(inv.sellerSnapshot as string) : {};
  const buyer = inv.buyerSnapshot ? JSON.parse(inv.buyerSnapshot as string) : {};
  const linesXml = inv.lines.map((l, i) => `
  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${xmlEsc(l.unit)}">${(l.quantityMilli / 1000).toFixed(3)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${inv.currency}">${(l.unitPriceMinor / 100).toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Description>${xmlEsc(l.description)}</cbc:Description></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="${inv.currency}">${(l.unitPriceMinor / 100).toFixed(2)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>${xmlEsc(inv.invoiceNumber ?? inv.id)}</cbc:ID>
  <cbc:IssueDate>${new Date(inv.issueDate).toISOString().slice(0, 10)}</cbc:IssueDate>
  <cbc:DueDate>${inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : ""}</cbc:DueDate>
  <cbc:InvoiceTypeCode>${xmlEsc(inv.docType)}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${inv.currency}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty><cac:Party><cbc:EndpointID schemeID="0088">${xmlEsc(seller.ice ?? "")}</cbc:EndpointID><cac:PartyName><cbc:Name>${xmlEsc(seller.legalName ?? seller.tradeName ?? "")}</cbc:Name></cac:PartyName></cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party><cbc:EndpointID schemeID="0088">${xmlEsc(buyer.ice ?? "")}</cbc:EndpointID><cac:PartyName><cbc:Name>${xmlEsc(buyer.companyName ?? buyer.name ?? "")}</cbc:Name></cac:PartyName></cac:Party></cac:AccountingCustomerParty>
  <cac:LegalMonetaryTotal><cbc:PayableAmount currencyID="${inv.currency}">${(inv.totalTTC / 100).toFixed(2)}</cbc:PayableAmount></cac:LegalMonetaryTotal>
  ${linesXml}
</Invoice>`;
}
