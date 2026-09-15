import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { requireUser } from "@/server/auth";
import { listProducts } from "@/server/products";
import ProductForm from "@/components/ProductForm";
import { EmptyState } from "@/components/ui";
import { formatMoney } from "@/domain/invoice";

export default async function ProductsPage({ searchParams }: { searchParams: { new?: string; edit?: string } }) {
  try { await requireUser(); } catch { redirect("/login"); }
  let products: Awaited<ReturnType<typeof listProducts>> = [];
  try { products = await listProducts(); } catch (e) { console.error("[products]", e); }
  const editing = searchParams.edit ? products.find((p) => p.id === searchParams.edit) : null;
  const showForm = searchParams.new !== undefined || !!editing;
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="page-title">Products & services</h1>
          <p className="meta mt-1">Reusable lines with HT prices and TVA — pick them straight into invoices. Name, unit, price and tax are all yours.</p>
        </div>
        <Link href="/products?new=1" className="btn-accent"><Plus size={15} /> New item</Link>
      </div>
      {products.length === 0 && !showForm ? (
        <EmptyState title="No catalog yet" body="Save the services and products you sell once, reuse them on every invoice." action={<Link href="/products?new=1" className="btn-accent"><Plus size={15} /> Add item</Link>} />
      ) : (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Unit</th><th className="num">Price HT</th><th>TVA</th><th></th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}{p.description && <span className="meta block">{p.description}</span>}</td>
                  <td className="text-ink-500">{p.unit}</td>
                  <td className="num tabular-nums">{formatMoney(p.unitPriceMinor, "MAD")}</td>
                  <td className="text-ink-500">{p.taxExempt ? "Exo." : `${p.taxRateBps / 100}%`}</td>
                  <td className="text-right flex justify-end gap-2">
                    <Link href={`/products?edit=${p.id}`} className="text-brand-600 text-[13px] hover:underline">Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <div className="card mt-4 p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{editing ? "Edit product" : "New product"}</h2><Link href="/products" className="text-sm text-ink-500 hover:text-ink-900">Close</Link></div>
          <ProductForm initial={editing as never} />
        </div>
      )}
    </div>
  );
}
