"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Navbar from "@/app/components/navbar"
import Sidebar from "@/app/components/sidebar"
import { useToast } from "@/app/components/toast-provider"
import { apiUrl } from "@/lib/api"

type Site = { _id: string; siteName: string }
type InvoiceLine = { description: string; hsnSacCode: string; quantity: number; rate: number; amount: number }
type Invoice = {
  _id: string
  invoiceNumber: string
  siteId: Site | string
  siteName: string
  siteCode: string
  clientName: string
  billingFrom: string
  billingTo: string
  issueDate: string
  dueDate: string
  lines: InvoiceLine[]
  baseAmount: number
  serviceChargePercent: number
  serviceChargeAmount: number
  adjustmentAmount: number
  taxableAmount: number
  gstPercent: number
  gstAmount: number
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  status: string
  notes?: string
  supplierGstNumber?: string
  buyerGstNumber?: string
}
type Api<T> = { success: boolean; data?: T; message?: string }

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })
const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" })

export default function InvoiceManagementPage() {
  const { showToast } = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [siteId, setSiteId] = useState("")
  const [status, setStatus] = useState("")
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [paid, setPaid] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(
    async () => {
      setLoading(true)
      try {
        const [ir, sr] = await Promise.all([
          fetch(apiUrl("/site-invoices"), { credentials: "include" }),
          fetch(apiUrl("/sites/get-sites"), { credentials: "include" }),
        ])
        const [ix, sx] = (await Promise.all([ir.json(), sr.json()])) as [Api<Invoice[]>, Api<Site[]>]
        if (!ir.ok || !ix.success) throw new Error(ix.message || "Invoices could not be loaded.")
        setInvoices(ix.data || [])
        setSites(sx.data || [])
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Invoices could not be loaded.", "error")
      } finally {
        setLoading(false)
      }
    },
    [showToast]
  )

  useEffect(() => {
    load()
  }, [load])

  const rows = useMemo(
    () =>
      invoices.filter(
        (i) =>
          (!siteId || (typeof i.siteId === "string" ? i.siteId : i.siteId?._id) === siteId) &&
          (!status || i.status === status) &&
          (!query.trim() || [i.invoiceNumber, i.siteName, i.clientName].some((v) => v.toLowerCase().includes(query.toLowerCase())))
      ),
    [invoices, query, siteId, status]
  )

  const total = (key: "totalAmount" | "paidAmount" | "balanceAmount") =>
    rows.reduce((s, i) => s + Number(i[key] || 0), 0)

  const open = (i: Invoice) => {
    setSelected(i)
    setPaid(String(i.paidAmount || 0))
  }

  const updatePayment = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const r = await fetch(apiUrl(`/site-invoices/${selected._id}/payment`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidAmount: Number(paid) }),
      })
      const x = (await r.json()) as Api<Invoice>
      if (!r.ok || !x.success || !x.data) throw new Error(x.message || "Payment update failed.")
      setInvoices((c) => c.map((i) => (i._id === x.data!._id ? x.data! : i)))
      setSelected(x.data)
      showToast("Invoice payment updated.", "success")
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Payment update failed.", "error")
    } finally {
      setSaving(false)
    }
  }

  const badge = (s: string) =>
    s === "PAID"
      ? "bg-emerald-100 text-emerald-700"
      : s === "PARTIALLY_PAID"
        ? "bg-amber-100 text-amber-700"
        : s === "CANCELLED"
          ? "bg-slate-200 text-slate-600"
          : "bg-indigo-100 text-indigo-700"

  const downloadPDF = (invoice: Invoice) => {
    try {
      const element = document.getElementById(`invoice-${invoice._id}`)
      if (!element) {
        showToast("Invoice element not found", "error")
        return
      }

      const printWindow = window.open("", "", "height=800,width=900")
      if (!printWindow) {
        showToast("Failed to open print window", "error")
        return
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
            .invoice-container { padding: 20px; }
            table { border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="invoice-container">
            ${element.innerHTML}
          </div>
        </body>
        </html>
      `

      printWindow.document.write(htmlContent)
      printWindow.document.close()
      showToast("Invoice PDF ready to download", "success")
    } catch (e) {
      console.error("PDF Download Error:", e)
      showToast("Failed to download PDF", "error")
    }
  }

  const downloadExcel = async (invoice: Invoice) => {
    try {
      const XLSX = await import("xlsx")
      const ws_data = [
        ["INVOICE"],
        [],
        ["Bill Month:- May 2026", "", "Bill Period: " + date.format(new Date(invoice.billingFrom)) + " to " + date.format(new Date(invoice.billingTo))],
        ["AL Gosar Enterprises", "", "Invoice No. GST/" + invoice.invoiceNumber, "", "Date: " + date.format(new Date(invoice.issueDate))],
        ["Bairagi Colony , Ward No.10 , Pithampur", "", "", "", "Mode / Terms of Payment"],
        ["Dist: Dhar (M.P.) 454775", "", "Deliver Note", "", "Dated"],
        ["GST No. " + (invoice.supplierGstNumber || "23CFVPG6126B1ZN"), "", "Supplier's Ref.", "", "422045"],
        ["PAN No: CFVPG6126B", "", "Vender Code", "", "Buyer's order No."],
        ["State: Madhya Pradesh", "", "", "", "Destination: PITHAMPUR"],
        ["E- Mail: gosarenterprise8@gmail.com", "", "LUT No.", "", "AD23042501320 3T"],
        [],
        ["Buyers & Consignee", "", "Terms Of Delivery :- 10 days after invoice"],
        [invoice.clientName],
        [invoice.siteName],
        ["GST No. " + (invoice.buyerGstNumber || "N/A")],
        ["State Code: " + (invoice.buyerGstNumber ? invoice.buyerGstNumber.substring(0, 2) : "N/A")],
        [],
        ["S.No.", "Description of Goods", "HSN / SAC", "Quantity", "Rate", "Per", "Amount"],
        ...invoice.lines.map((l, idx) => [
          idx + 1,
          l.description,
          l.hsnSacCode || "-",
          l.quantity || "-",
          l.rate,
          "-",
          l.amount,
        ]),
        [],
        ["", "", "", "", "", "TOTAL AMOUNT", invoice.totalAmount],
        ["", "", "", "", "", "NET PAYBLE AMOUNT", invoice.totalAmount],
        [],
        ["Amount Chargeble in ( Words )", "Amount in words would be shown here"],
        [],
        ["Declaration"],
        ["Supply & service MEANT for Export/Supply to SEZ Developer for authorised operations under bond or letter undertaking without payment of IGST AD23042501320 3T Dated :-22/04/2025 Valid till :-31/03/2026"],
        [],
        ["Remarks", "", "For :- AL Gosar Enterprises"],
        ["AL Gosar Enterprises", "", ""],
        ["Bank Details :-"],
        ["Account Name : A.L Gosar Enterprises"],
        ["Account No : 5020004929512"],
        ["IFSC Code : HDFC0001291"],
        ["Branch : Pithampur"],
        [],
        ["", "", "Authorised Signatory"],
        [],
        ["Payment Information"],
        ["Paid Amount", invoice.paidAmount],
        ["Balance Amount", invoice.balanceAmount],
        ["Status", invoice.status],
      ]
      const ws = XLSX.utils.aoa_to_sheet(ws_data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Invoice")
      XLSX.writeFile(wb, `Invoice-${invoice.invoiceNumber}.xlsx`)
      showToast("Invoice downloaded as Excel", "success")
    } catch (e) {
      console.error("Excel Download Error:", e)
      showToast("Failed to download Excel", "error")
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fc]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="min-h-0 flex-1 overflow-y-auto p-5 lg:p-7">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs text-slate-500">
                Dashboard / <span className="font-semibold text-indigo-600">Invoices</span>
              </p>
              <h1 className="mt-2 text-2xl font-bold">Site Invoice Management</h1>
              <p className="mt-1 text-sm text-slate-500">Track site billing, GST, received payments and outstanding balance.</p>
            </div>
            <Link
              href="/pages/contractorpages/invoices/generate"
              className="rounded-md bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white"
            >
              + Generate Invoice
            </Link>
          </header>

          <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Invoices", String(rows.length), "text-indigo-700"],
              ["Total Billed", money.format(total("totalAmount")), "text-violet-700"],
              ["Received", money.format(total("paidAmount")), "text-emerald-700"],
              ["Outstanding", money.format(total("balanceAmount")), "text-red-600"],
            ].map(([l, v, c]) => (
              <div key={l} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase text-slate-400">{l}</p>
                <strong className={`mt-2 block text-xl ${c}`}>{v}</strong>
              </div>
            ))}
          </section>

          <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b p-4 lg:flex-row">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search invoice, site or client..."
                className="h-10 min-w-64 flex-1 rounded-md border border-slate-300 px-3 text-sm"
              />
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">All Sites</option>
                {sites.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.siteName}
                  </option>
                ))}
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">All Status</option>
                {["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "CANCELLED"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[9px] uppercase text-slate-500">
                  <tr>
                    {["Invoice", "Site / Client", "Billing Period", "Issue Date", "Due Date", "Total", "Paid", "Balance", "Status", "Action"].map(
                      (h) => (
                        <th key={h} className="border-b px-4 py-3">
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((i) => (
                    <tr key={i._id} className="text-xs hover:bg-slate-50">
                      <td className="border-b px-4 py-3 font-bold text-indigo-700">{i.invoiceNumber}</td>
                      <td className="border-b px-4">
                        <strong>{i.siteName}</strong>
                        <span className="block text-[9px] text-slate-400">{i.clientName}</span>
                      </td>
                      <td className="border-b px-4">
                        {date.format(new Date(i.billingFrom))} - {date.format(new Date(i.billingTo))}
                      </td>
                      <td className="border-b px-4">{date.format(new Date(i.issueDate))}</td>
                      <td className="border-b px-4">{date.format(new Date(i.dueDate))}</td>
                      <td className="border-b px-4 font-bold">{money.format(i.totalAmount)}</td>
                      <td className="border-b px-4 text-emerald-700">{money.format(i.paidAmount)}</td>
                      <td className="border-b px-4 font-bold text-red-600">{money.format(i.balanceAmount)}</td>
                      <td className="border-b px-4">
                        <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${badge(i.status)}`}>{i.status}</span>
                      </td>
                      <td className="border-b px-4">
                        <button
                          onClick={() => open(i)}
                          className="rounded bg-indigo-600 px-2.5 py-1 text-[9px] font-semibold text-white hover:bg-indigo-700"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {selected && (
            <div
              className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setSelected(null)
              }}
            >
              <div className="mx-auto max-w-5xl">
                <div className="mb-4 flex gap-2">
                  <button
                    onClick={() => downloadPDF(selected)}
                    className="flex-1 rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    📥 Download PDF
                  </button>
                  <button
                    onClick={() => downloadExcel(selected)}
                    className="flex-1 rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    📥 Download Excel
                  </button>
                  <button
                    onClick={() => setSelected(null)}
                    className="rounded bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    Close
                  </button>
                </div>

                <div
                  className="bg-white shadow-2xl overflow-hidden"
                  id={`invoice-${selected._id}`}
                  style={{
                    border: "1px solid #000",
                    padding: "20px",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "12px",
                    lineHeight: "1.4",
                    pageBreakAfter: "avoid",
                  }}
                >
                  {/* Header */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "15px", borderBottom: "1px solid #000", paddingBottom: "10px" }}>
                    <div style={{ fontSize: "11px" }}>
                      <div style={{ fontWeight: "bold", marginBottom: "5px" }}>Bill Month :- May 2026</div>
                      <div style={{ fontWeight: "bold" }}>AL Gosar Enterprises</div>
                      <div>Bairagi Colony , Ward No.10 , Pithampur</div>
                      <div>Dist : Dhar ( M.P.) 454775</div>
                      <div style={{ marginTop: "5px" }}>GST No. {selected.supplierGstNumber || "23CFVPG6126B1ZN"}</div>
                      <div>PAN No: CFVPG6126B</div>
                      <div>State : Madhya Pradesh</div>
                      <div>E- Mail : gosarenterprise8@gmail.com</div>
                    </div>
                    <div></div>
                    <div style={{ fontSize: "11px", textAlign: "right" }}>
                      <div style={{ marginBottom: "10px", fontWeight: "bold" }}>Bill Period : {date.format(new Date(selected.billingFrom))} to {date.format(new Date(selected.billingTo))}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: "bold" }}>Invoice No. GST/{selected.invoiceNumber}</div>
                          <div>Deliver Note</div>
                          <div style={{ marginTop: "5px" }}>Supplier's Ref.</div>
                          <div>Vender Code</div>
                          <div>Buyer's order No.</div>
                          <div style={{ marginTop: "5px" }}>LUT No.</div>
                        </div>
                        <div>
                          <div>Date : {date.format(new Date(selected.issueDate))}</div>
                          <div>Mode / Terms of Payment</div>
                          <div style={{ marginTop: "5px" }}>Dated</div>
                          <div>422045</div>
                          <div>Destination : PITHAMPUR</div>
                          <div style={{ marginTop: "5px" }}>AD23042501320 3T</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Buyers & Consignee */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "15px", borderBottom: "1px solid #000", paddingBottom: "10px", fontSize: "11px" }}>
                    <div>
                      <div style={{ fontWeight: "bold", marginBottom: "5px" }}>Buyers & Consignee</div>
                      <div style={{ fontWeight: "bold" }}>{selected.clientName}</div>
                      <div>{selected.siteName}</div>
                      <div style={{ marginTop: "5px" }}>GST No. {selected.buyerGstNumber || "N/A"}</div>
                      <div>State Code :{selected.buyerGstNumber ? selected.buyerGstNumber.substring(0, 2) : "N/A"}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: "bold", marginBottom: "5px" }}>Terms Of Delivery :- 10 days after invoice</div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px", fontSize: "11px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f0f0f0", borderTop: "1px solid #000", borderBottom: "1px solid #000" }}>
                        <th style={{ border: "1px solid #000", padding: "8px", textAlign: "left", fontWeight: "bold" }}>S.No.</th>
                        <th style={{ border: "1px solid #000", padding: "8px", textAlign: "left", fontWeight: "bold" }}>Description of Goods</th>
                        <th style={{ border: "1px solid #000", padding: "8px", textAlign: "center", fontWeight: "bold" }}>HSN / SAC</th>
                        <th style={{ border: "1px solid #000", padding: "8px", textAlign: "center", fontWeight: "bold" }}>Quantity</th>
                        <th style={{ border: "1px solid #000", padding: "8px", textAlign: "center", fontWeight: "bold" }}>Rate</th>
                        <th style={{ border: "1px solid #000", padding: "8px", textAlign: "center", fontWeight: "bold" }}>Per</th>
                        <th style={{ border: "1px solid #000", padding: "8px", textAlign: "right", fontWeight: "bold" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.lines.map((l, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #000" }}>
                          <td style={{ border: "1px solid #000", padding: "8px", textAlign: "center" }}>{idx + 1}</td>
                          <td style={{ border: "1px solid #000", padding: "8px" }}>{l.description}</td>
                          <td style={{ border: "1px solid #000", padding: "8px", textAlign: "center" }}>{l.hsnSacCode || "-"}</td>
                          <td style={{ border: "1px solid #000", padding: "8px", textAlign: "center" }}>{l.quantity || "-"}</td>
                          <td style={{ border: "1px solid #000", padding: "8px", textAlign: "right" }}>{l.rate}</td>
                          <td style={{ border: "1px solid #000", padding: "8px", textAlign: "center" }}>-</td>
                          <td style={{ border: "1px solid #000", padding: "8px", textAlign: "right", fontWeight: "bold" }}>{l.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "10px", marginBottom: "15px", fontSize: "12px", fontWeight: "bold" }}>
                    <div></div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", borderTop: "1px solid #000", paddingTop: "5px" }}>
                      <div style={{ textAlign: "right", paddingRight: "10px" }}>TOTAL AMOUNT</div>
                      <div style={{ textAlign: "right", paddingRight: "10px" }}>{selected.totalAmount}</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "10px", marginBottom: "15px", fontSize: "12px", fontWeight: "bold", borderTop: "1px solid #000", paddingTop: "5px" }}>
                    <div></div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div style={{ textAlign: "right", paddingRight: "10px" }}>NET PAYBLE AMOUNT</div>
                      <div style={{ textAlign: "right", paddingRight: "10px" }}>{selected.totalAmount}</div>
                    </div>
                  </div>

                  {/* Amount in Words */}
                  <div style={{ marginBottom: "15px", borderTop: "1px solid #000", paddingTop: "8px", fontSize: "11px" }}>
                    <div style={{ fontWeight: "bold", marginBottom: "3px" }}>Amount Chargeble in ( Words )</div>
                    <div style={{ fontStyle: "italic" }}>Amount in words would be shown here</div>
                  </div>

                  {/* Declaration */}
                  <div style={{ marginBottom: "15px", borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "8px", fontSize: "11px", backgroundColor: "#fafafa" }}>
                    <div style={{ textAlign: "center", fontWeight: "bold", marginBottom: "5px" }}>Declaration</div>
                    <div style={{ textAlign: "center", fontSize: "10px" }}>
                      Supply & service MEANT for Export/Supply to SEZ Developer for authorised operations under bond or letter undertaking without payment of IGST AD23042501320 3T Dated :-22/04/2025 Valid till :-31/03/2026
                    </div>
                  </div>

                  {/* Remarks & Bank Details */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px", fontSize: "11px" }}>
                    <div>
                      <div style={{ fontWeight: "bold", marginBottom: "5px" }}>Remarks</div>
                      <div>AL Gosar Enterprises</div>
                      <div style={{ marginTop: "8px", fontWeight: "bold" }}>Bank Details :-</div>
                      <div>Account Name : A.L Gosar Enterprises</div>
                      <div>Account No : 5020004929512</div>
                      <div>IFSC Code : HDFC0001291</div>
                      <div>Branch : Pithampur</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: "bold", marginBottom: "20px" }}>For :- AL Gosar Enterprises</div>
                      <div style={{ height: "40px" }}></div>
                      <div style={{ fontWeight: "bold" }}>Authorised Signatory</div>
                    </div>
                  </div>
                </div>

                {/* Payment Info Section Below */}
                <div style={{ padding: "20px", backgroundColor: "white", marginTop: "20px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                  <h3 style={{ fontWeight: "bold", marginBottom: "15px", fontSize: "14px" }}>Payment Information</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                    <div style={{ padding: "15px", backgroundColor: "#d1fae5", borderRadius: "8px", fontSize: "12px" }}>
                      <div style={{ color: "#047857", fontWeight: "bold", marginBottom: "5px" }}>Paid Amount</div>
                      <div style={{ fontSize: "18px", fontWeight: "bold", color: "#065f46" }}>{money.format(selected.paidAmount)}</div>
                    </div>
                    <div style={{ padding: "15px", backgroundColor: "#fee2e2", borderRadius: "8px", fontSize: "12px" }}>
                      <div style={{ color: "#991b1b", fontWeight: "bold", marginBottom: "5px" }}>Balance Amount</div>
                      <div style={{ fontSize: "18px", fontWeight: "bold", color: "#7f1d1d" }}>{money.format(selected.balanceAmount)}</div>
                    </div>
                    <div style={{ padding: "15px", backgroundColor: "#e0e7ff", borderRadius: "8px", fontSize: "12px" }}>
                      <div style={{ color: "#3730a3", fontWeight: "bold", marginBottom: "5px" }}>Status</div>
                      <div style={{ fontSize: "14px", fontWeight: "bold" }}>{selected.status}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: "15px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "8px" }}>Record Payment</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px" }}>
                      <input
                        type="number"
                        value={paid}
                        onChange={(e) => setPaid(e.target.value)}
                        style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "12px" }}
                        placeholder="Enter payment amount"
                      />
                      <button
                        onClick={updatePayment}
                        disabled={saving}
                        style={{ padding: "8px 20px", backgroundColor: "#4f46e5", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "12px", opacity: saving ? 0.5 : 1 }}
                      >
                        {saving ? "Updating..." : "Update"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
