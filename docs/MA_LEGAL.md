# Moroccan legal audit — CGI art. 145 / 146 / 198ter / 211 (sources: DGI, CGI 2026, einvoice.ma, FatouraPlus, ClicPaie)

## Mandatory mentions (art. 145-III)
Seller: raison sociale, adresse siège, IF, TP (patente, même en exonération 5 ans), RC (+ville) si société,
ICE 15 chiffres (décret 2-14-271, Mod97), forme juridique + capital (usage/control-safe).
Buyer: nom/raison sociale, adresse, ICE si B2B assujetti (sans ICE → facture non déductible pour le client).
Document: mot « FACTURE », numéro séquentiel continu chronologique sans trou ni réutilisation,
date d'émission (cohérente avec l'ordre des numéros), désignation précise, quantité + PU HT,
HT, TVA ventilée par taux (20/14/10/7/0 — jamais globalisée si multi-taux), TTC,
mode/conditions de paiement + délais (loi 49-15), arrêté en lettres (usage fort),
mention d'exonération avec article (ex. « Exonéré — art. 92 », AE: « TVA non applicable — art. 91-II-3° »).

## Numbering / chronology
Suite continue par exercice (ou globale), préfixe OK (FAC-2026-0001). Annulée → numéro conservé, jamais réutilisé.
Avoirs → série distincte (AV-2026-0001) avec référence facture d'origine + motif.
Chronologie: N°100 daté avant N°101 = anomalie. Trou = soupçon de fraude / rejet de comptabilité.

## Corrections (no silent edits)
Facture émise = inaltérable. Erreur → avoir (déduction partielle/totale, « Net à déduire »)
ou rectificative (« annule et remplace FAC-… ») avec nouveau numéro. Suppression invisible interdite.

## TVA Morocco: 20% général, 14% transport/énergie, 10% restauration/hôtellerie/banque,
7% eau/pharmacie/scolaire, 0% export/exonéré. AE loi 114-13: hors champ, pas de TVA,
mention obligatoire, RC dispensé, TP requis.

## Archiving: 10 ans (art. 211), lisible + intègre + accessible, support inaltérable (PDF figé, pas Excel).
Sanctions: ICE omis/erroné 100 DH/omission plafond 5000/exercice (198ter);
mentions manquantes → perte déductibilité TVA/IS/IR client; non-conservation 50 000 DH/exercice.

## E-invoicing (art. 145-IX, LF 2018)
« Système informatique de facturation » requis pour IS / IR RNR-RNS / assujettis TVA.
Décret d'application NON publié (mai-juin 2026): pas de calendrier/seuil/format/sanction opposable.
Plateforme DGI en construction (AO 5/2024/DGI, modèle clearance évoqué, UBL/CII pressentis mais non officiels).
Position v1: PDF ≠ e-facture fiscale. Ne pas promettre de « conformité DGI e-facture ».
Préparer: données propres (ICE/IF/TVA), séries continues, avoirs liés, exports, archive 10 ans.

## Blocker found during E2E (fixed, non-destructive)
Global `UNIQUE(invoiceNumber)` rejected two companies sharing `FAC-2026-0001` — yet art.145
requires continuity **per enterprise**, not globally. Fixed via migration
`scope_number_per_company`: `@@unique([companyId, invoiceNumber])`. Verified by
`numbering-iso.test.ts` (two companies, same prefix/year → independent `0001, 0001` + `0002`).
## Destructive risks found in pre-audit schema → fixed additively
1. No docType/link → avoirs would need new table or status hack. FIX: `docType FACTURE|AVOIR|RECTIFICATIVE`
   + `linkedInvoiceId` + `correctionReason`. AVOIR amounts stored positive (deduction), own AV-series.
2. Single prefix → AV/FAC collision. FIX: `Company.avoirPrefix` (series keyed by prefix already).
3. Snapshots missing legalForm/capital/cnss/rcCity/taxRegime → historic PDFs non-compliant. FIX: fields added + frozen.
4. Client missing IF/RC → B2B validation impossible. FIX: `clientIF/clientRC/isAssujetti` + finalize guard (COMPANY requires ICE).
5. Invoice missing taxMention/amountInWords/paymentMode → mentions can't render. FIX: nullable fields, computed at finalize.
6. No chronology guard → antidated numbers. FIX: finalize rejects issueDate < max finalized date in same series.
7. No ICE validation → dirty data rejected by future DGI. FIX: `isValidICE()` (15 digits + Mod97) enforced at finalize for seller + B2B buyer.
