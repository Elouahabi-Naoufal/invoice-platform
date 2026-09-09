# Domain rules — single source of truth

## Calculation order (deterministic, integer minor units)
```
for each line:
  gross        = round(qty * unitPriceMinor / 1000)   # qty stored milli-units
  lineDiscount = round(gross * discountBps / 10000)
  netHT        = gross - lineDiscount
  # netHT aggregated per tax bucket AFTER invoice discount allocation
subtotalHT     = Σ netHT
invDiscPct     = round(subtotalHT * invDiscountBps / 10000)
afterPct       = subtotalHT - invDiscPct
invDiscFixed   = min(invDiscountFixedMinor, afterPct)
taxableTotal   = afterPct - invDiscFixed
# allocate invoice discount proportionally per line for tax buckets:
per-line taxable_i = netHT_i - share(invDiscPct+invDiscFixed)
per bucket rate r: taxable_r = Σ taxable_i where rate==r and !exempt
tax_r          = round(taxable_r * rateBps / 10000)   # half-up, per bucket
totalTVA       = Σ tax_r
totalTTC       = taxableTotal + totalTVA
```
- All `round()` = half-up on integers: `(n + d/2) // d`.
- Prices entered **HT** (explicit). TTC-inclusive entry is V2.
- PDF totals MUST come from this function. No second implementation.

## Lifecycle
- Persisted `status`: DRAFT → ISSUED → CANCELLED (terminal). VOID = CANCELLED with reason=void.
- Derived `displayStatus`:
  - CANCELLED → cancelled
  - remaining==0 && total>0 → PAID
  - paid>0 → PARTIALLY_PAID
  - dueDate<today && remaining>0 → OVERDUE (label, not persisted)
  - sentAt!=null → SENT, viewedAt!=null → VIEWED (labels)
- Guards: edit lines/amounts/parties/number only in DRAFT. ISSUED actions: send, view, pay, cancel, duplicate, download.

## Numbering
- `NumberingSeries(companyId, prefix, year)` with `lastNo`. Finalize in transaction: increment → `PREFIX-YEAR-0001`.
- Cancelled numbers never reused. Drafts have null number.

## Snapshots
- At finalize: freeze `sellerSnapshot {legalName, tradeName, address, city, phone, email, ice, if, rc, patente, bank...}` and
  `buyerSnapshot {type, name, companyName, email, phone, address, ice}` into Invoice JSON columns.
- Render ALWAYS from snapshots if present (drafts may render live + snapshot preview).

## Payments
- `Payment` rows sum → paidAmount (same currency enforced). remaining = TTC - paid. Overpay blocked in v1 (reject amount > remaining).

## Money
- `amountMinor: int`, `currency: ISO4217`. Format only at presentation via Intl.NumberFormat + invoiceLocale.
- Precision map: MAD/EUR/USD/GBP → 2 decimals. (Future: JPY 0, BHD 3.)
