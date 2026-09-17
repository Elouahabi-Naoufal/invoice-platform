"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEmployee, deleteEmployee, generatePayslip, deletePayslip } from "@/server/payroll";
import { useToast } from "@/components/ui";

interface Rate { id: string; name: string; appliesTo: string; kind: string; percentBps: number }
interface Employee { id: string; fullName: string; grossSalaryMinor: number; currency: string }

export function EmployeeForm() {
  const r = useRouter();
  const toast = useToast();
  const [err, setErr] = useState("");
  async function submit(fd: FormData) {
    setErr("");
    const obj = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
    try {
      await createEmployee({ fullName: obj.fullName.trim(), position: obj.position || null, grossSalaryMinor: Math.round(Number(obj.gross || 0) * 100), currency: obj.currency || "MAD", notes: obj.notes || null });
      toast({ kind: "ok", title: "Employee added" });
      r.refresh();
    } catch (e) { const m = e instanceof Error ? e.message : "Failed"; setErr(m); toast({ kind: "err", title: m }); }
  }
  return (
    <form action={submit} className="grid gap-3 md:grid-cols-4">
      <div><label className="label">Full name *</label><input name="fullName" required className="input" /></div>
      <div><label className="label">Position</label><input name="position" className="input" /></div>
      <div><label className="label">Gross salary *</label><input name="gross" type="number" step="0.01" min={0} required className="input" /></div>
      <div><label className="label">Currency</label><input name="currency" defaultValue="MAD" className="input" /></div>
      {err && <p className="field-err md:col-span-4">{err}</p>}
      <div className="md:col-span-4"><button className="btn-primary btn-sm">Add employee</button></div>
    </form>
  );
}

export function PayslipForm({ employees, rates }: { employees: Employee[]; rates: Rate[] }) {
  const r = useRouter();
  const toast = useToast();
  const [err, setErr] = useState("");
  const [empId, setEmpId] = useState(employees[0]?.id ?? "");
  const emp = employees.find((e) => e.id === empId);
  const [gross, setGross] = useState((emp?.grossSalaryMinor ?? 0) / 100);
  const employerRates = rates.filter((x) => x.appliesTo === "EMPLOYER" || x.appliesTo === "ANY");
  const employeeRates = rates.filter((x) => x.appliesTo === "EMPLOYEE" || x.appliesTo === "ANY");

  async function submit(fd: FormData) {
    setErr("");
    try {
      await generatePayslip({
        employeeId: empId,
        period: String(fd.get("period")),
        grossMinor: Math.round(gross * 100),
        employerRateIds: fd.getAll("employerRateIds").map(String),
        employeeRateIds: fd.getAll("employeeRateIds").map(String),
        notes: String(fd.get("notes") || "") || null,
      });
      toast({ kind: "ok", title: "Payslip generated" });
      r.refresh();
    } catch (e) { const m = e instanceof Error ? e.message : "Failed"; setErr(m); toast({ kind: "err", title: m }); }
  }

  if (employees.length === 0) return <p className="meta">Add an employee first.</p>;

  return (
    <form action={submit} className="grid gap-3 md:grid-cols-3">
      <div>
        <label className="label">Employee</label>
        <select value={empId} onChange={(e) => { const id = e.target.value; setEmpId(id); const em = employees.find((x) => x.id === id); setGross((em?.grossSalaryMinor ?? 0) / 100); }} className="input">
          {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
        </select>
      </div>
      <div><label className="label">Period</label><input name="period" type="month" defaultValue={new Date().toISOString().slice(0, 7)} className="input" /></div>
      <div><label className="label">Gross</label><input type="number" step="0.01" min={0} value={gross} onChange={(e) => setGross(Number(e.target.value))} className="input" /></div>
      <div>
        <label className="label">Employer charges</label>
        <div className="flex flex-col gap-1">
          {employerRates.length === 0 ? <span className="meta">No employer rates defined.</span> : employerRates.map((x) => (
            <label key={x.id} className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="employerRateIds" value={x.id} /> {x.name} {x.kind === "PERCENT" ? <span className="meta">{x.percentBps / 100}%</span> : null}</label>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Employee deductions</label>
        <div className="flex flex-col gap-1">
          {employeeRates.length === 0 ? <span className="meta">No employee rates defined.</span> : employeeRates.map((x) => (
            <label key={x.id} className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="employeeRateIds" value={x.id} /> {x.name} {x.kind === "PERCENT" ? <span className="meta">{x.percentBps / 100}%</span> : null}</label>
          ))}
        </div>
      </div>
      <div><label className="label">Notes</label><input name="notes" className="input" /></div>
      {err && <p className="field-err md:col-span-3">{err}</p>}
      <div className="md:col-span-3"><button className="btn-primary btn-sm">Generate payslip</button></div>
    </form>
  );
}

export function EmployeeDelete({ id }: { id: string }) {
  const r = useRouter(); const toast = useToast();
  return <button onClick={async () => { try { await deleteEmployee(id); toast({ kind: "ok", title: "Employee removed" }); r.refresh(); } catch { toast({ kind: "err", title: "Failed" }); } }} className="btn-ghost btn-sm hover:text-red-700">Remove</button>;
}

export function PayslipDelete({ id }: { id: string }) {
  const r = useRouter(); const toast = useToast();
  return <button onClick={async () => { try { await deletePayslip(id); toast({ kind: "ok", title: "Payslip deleted" }); r.refresh(); } catch { toast({ kind: "err", title: "Failed" }); } }} className="btn-ghost btn-sm hover:text-red-700">Delete</button>;
}
