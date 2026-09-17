import { listRates } from "@/server/rates";
import RatesManager from "@/components/RatesManager";

export default async function RatesSettingsPage() {
  const rates = await listRates();
  return <RatesManager rates={JSON.parse(JSON.stringify(rates))} />;
}
