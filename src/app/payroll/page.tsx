import { requireActor } from "@/server/auth";
import { redirect } from "next/navigation";
import { listEmployees, listPayslips } from "@/server/payroll";
import { listRates } from "@/server/rates";
import { EmployeeForm, PayslipForm, EmployeeDelete, PayslipDelete } from "@/components/PayrollForms";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatMoney } from "@/domain/invoice";
import { Users } from "lucide-react";

function parseLines(raw: string | null): { name: string; amountMinor: number }[] {
  if (!raw) return [];
  try { const v: unknown = JSON.parse(raw); return Array.isArray(v) ? (v as { name: string; amountMinor: number }[]) : []; } catch { return []; }
}

export default async function PayrollPage() {
  try { await requireActor(); } catch { redirect("/login"); }
  const [employees, payslips, rates] = await Promise.all([listEmployees(), listPayslips(), listRates()]);
  const emp = JSON.parse(JSON.stringify(employees));
  const rateList = JSON.parse(JSON.stringify(rates));
  const slips = JSON.parse(JSON.stringify(payslips)) as {
    id: string; period: string; grossMinor: number; currency: string; employerCostMinor: number; netMinor: number;
    employerCharges: string | null; employeeDeductions: string | null; employee: { fullName: string };
  }[];

  return (
    <div>
      <PageHeader title="Payroll" description="Employees and payslips. Contributions are whatever rates you defined — no country assumptions." />

      <div className="card mb-4 p-5">
        <h2 className="section-title mb-3">Employees</h2>
        <EmployeeForm />
      </div>

      {emp.length === 0 ? (
        <EmptyState title="No employees" body="Add an employee with a gross salary, then define employer/employee rates and generate a payslip." icon={<Users size={22} />} />
      ) : (
        <div className="card mb-4 overflow-hidden">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Position</th><th className="num">Gross</th><th></th></tr></thead>
            <tbody>
              {emp.map((e: { id: string; fullName: string; position: string | null; grossSalaryMinor: number; currency: string }) => (
                <tr key={e.id}>
                  <td className="font-medium">{e.fullName}</td>
                  <td className="text-ink-500">{e.position ?? "—"}</td>
                  <td className="num tabular-nums">{formatMoney(e.grossSalaryMinor, e.currency)}</td>
                  <td className="text-right"><EmployeeDelete id={e.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {emp.length > 0 && (
        <div className="card mb-4 p-5">
          <h2 className="section-title mb-3">Generate payslip</h2>
          <PayslipForm employees={emp} rates={rateList} />
        </div>
      )}

      {slips.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-ink-200 px-4 py-3 dark:border-white/10"><span className="section-title">Payslips</span></div>
          <table className="tbl">
            <thead><tr><th>Period</th><th>Employee</th><th className="num">Gross</th><th className="num">Net</th><th className="num">Employer cost</th><th></th></tr></thead>
            <tbody>
              {slips.map((s) => (
                <tr key={s.id}>
                  <td className="tabular-nums">{s.period}</td>
                  <td className="font-medium">{s.employee.fullName}
                    <span className="meta block">
                      {[...parseLines(s.employerCharges), ...parseLines(s.employeeDeductions)].map((l) => l.name).join(", ") || "no charges"}
                    </span>
                  </td>
                  <td className="num tabular-nums">{formatMoney(s.grossMinor, s.currency)}</td>
                  <td className="num tabular-nums">{formatMoney(s.netMinor, s.currency)}</td>
                  <td className="num tabular-nums font-medium">{formatMoney(s.employerCostMinor, s.currency)}</td>
                  <td className="text-right"><PayslipDelete id={s.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
