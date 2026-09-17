import { listRates } from "@/server/rates";
import RatesManager from "@/components/RatesManager";
import { toPlain } from "@/lib/safe";

export default async function RatesSettingsPage() {
  const rates = await listRates();
  return <RatesManager rates={toPlain(rates)} />;
}
