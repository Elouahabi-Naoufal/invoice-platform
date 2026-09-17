import { redirect } from "next/navigation";
import { requireActor } from "@/server/auth";
import { accountBalances, listEntries } from "@/server/ledger";
import AccountsClient from "@/components/AccountsClient";
import { PageHeader, StatCard } from "@/components/ui";
import { formatMoney } from "@/domain/invoice";
import { Wallet } from "lucide-react";

export default async function AccountsPage() {
  try { await requireActor(); } catch { redirect("/login"); }
  const [balances, entries] = await Promise.all([accountBalances(), listEntries()]);
  const totalByCurrency = new Map<string, number>();
  for (const b of balances) totalByCurrency.set(b.currency, (totalByCurrency.get(b.currency) ?? 0) + b.balanceMinor);

  return (
    <div>
      <PageHeader title="Accounts" description="Your bank and cash accounts, money in and out, and live balances." />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {balances.length === 0 ? (
          <StatCard tone="neutral" icon={<Wallet size={20} />} label="No accounts yet" value="—" sub="Add your bank or cash account below" />
        ) : (
          balances.map((b) => (
            <StatCard key={b.id} tone={b.balanceMinor < 0 ? "error" : "success"} icon={<Wallet size={20} />} label={b.name} value={formatMoney(b.balanceMinor, b.currency)} sub={b.kind === "BANK" ? "Bank account" : "Cash"} />
          ))
        )}
      </div>

      <AccountsClient
        accounts={JSON.parse(JSON.stringify(balances))}
        entries={JSON.parse(JSON.stringify(entries))}
      />
    </div>
  );
}
