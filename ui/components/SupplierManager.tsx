import SupplierImage from "./SupplierImage"
import { useState } from 'react'
import { categoryLabel, categories, deleteSupplier, getSupplier, saveSupplier, type Supplier, type SupplierInput } from '../api/suppliers'
import { useSuppliers } from '../hooks/useSuppliers'
const inputClass = 'w-full rounded-lg border border-[#E4E8E6] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#1A4A36]'
const blank: SupplierInput = { name: '', type: 'food', buildingName: '', locationDescription: '', floor: 1, latitude: '', longitude: '', startingTime: 'NA', closingTime: 'NA', imageURL: 'NA' }
export default function SupplierManager({ admin = false }: { admin?: boolean }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const { suppliers, loading, error, reload } = useSuppliers(query, category)
  const [selected, setSelected] = useState<Supplier>()
  const [mode, setMode] = useState<'view' | 'edit' | 'create' | 'delete' | null>(null)
  const [form, setForm] = useState<SupplierInput>(blank)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  async function open(id: number, next: 'view' | 'edit' | 'delete') {
    setBusy(true); setActionError(''); setNotice('')
    try {
      const row = await getSupplier(id)
      setSelected(row)
      const { supplierId: _id, createdAt: _created, updatedAt: _updated, ...input } = row
      setForm(input); setMode(next)
    } catch (err) { setActionError((err as Error).message) }
    finally { setBusy(false) }
  }
  async function submit() {
    setBusy(true); setActionError('')
    try {
      if (mode === 'delete' && selected) await deleteSupplier(selected.supplierId)
      else await saveSupplier(form, mode === 'edit' ? selected : undefined)
      setNotice(mode === 'delete' ? 'Supplier deleted.' : 'Supplier saved.')
      setMode(null); reload()
    } catch (err) { setActionError((err as Error).message) }
    finally { setBusy(false) }
  }
  const fields = [
    ['name', 'Name', 'text'], ['buildingName', 'Building', 'text'],
    ['locationDescription', 'Location description', 'text'], ['floor', 'Floor', 'number'],
    ['latitude', 'Latitude', 'number'], ['longitude', 'Longitude', 'number'],
    ['startingTime', 'Opening time (e.g. 0900hrs)', 'text'], ['closingTime', 'Closing time (e.g. 1800hrs)', 'text'],
    ['imageURL', 'Image URL (or NA)', 'text'],
  ] as const
  return <section className="text-[#1B2522]">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-[#162A46]">{admin ? 'Supplier Management' : 'Campus Suppliers'}</h2>
      {admin && <button disabled={busy} onClick={() => { setSelected(undefined); setForm({ ...blank }); setActionError(''); setMode('create') }} className="rounded-lg bg-[#1A4A36] px-3 py-2 text-xs font-medium text-white">+ Add Supplier</button>}
    </div>
    <div className="mb-4 grid gap-3 sm:grid-cols-2">
      <label className="text-xs">Search suppliers<input className={inputClass} value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, building or location" /></label>
      <label className="text-xs">Category<select className={inputClass} value={category} onChange={e => setCategory(e.target.value)}>{['All', ...categories].map(type => <option key={type} value={type}>{categoryLabel(type)}</option>)}</select></label>
    </div>
    {notice && <p role="status" className="mb-3 text-sm text-[#1A4A36]">{notice}</p>}
    {(error || (actionError && !mode)) && <p role="alert" className="mb-3 text-sm text-red-600">{error || actionError} <button onClick={reload} className="underline">Retry</button></p>}
    {loading ? <p role="status">Loading suppliers…</p> : !error && suppliers.length === 0 ? <p className="py-8 text-center text-sm text-[#3F6B5A]">No suppliers found.</p> : <div className="overflow-x-auto rounded-xl border border-[#E4E8E6] bg-white">
      <table className="w-full text-left text-xs"><thead><tr>{['Name', 'Location', 'Type', 'Actions'].map(label => <th key={label} className="border-b border-[#E4E8E6] px-4 py-3 text-[#3F6B5A]">{label}</th>)}</tr></thead>
        <tbody>{suppliers.map(row => <tr key={row.supplierId} className="border-b border-[#E4E8E6] last:border-0">
          <td className="px-4 py-3 font-medium">{row.name}</td><td className="px-4 py-3">{row.buildingName}</td><td className="px-4 py-3">{categoryLabel(row.type)}</td>
          <td className="px-4 py-3"><div className="flex flex-wrap gap-3"><button disabled={busy} onClick={() => void open(row.supplierId, 'view')}>View</button>{admin && <><button disabled={busy} onClick={() => void open(row.supplierId, 'edit')}>Edit</button><button disabled={busy} onClick={() => void open(row.supplierId, 'delete')} className="text-red-600">Delete</button></>}</div></td>
        </tr>)}</tbody>
      </table>
    </div>}
    {mode && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="supplier-dialog-title" className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h3 id="supplier-dialog-title" className="mb-4 font-semibold text-[#162A46]">{mode === 'create' ? 'Add Supplier' : mode === 'edit' ? 'Edit Supplier' : mode === 'delete' ? 'Delete Supplier' : selected?.name}</h3>
        {actionError && <p role="alert" className="mb-3 text-sm text-red-600">{actionError}{mode === 'edit' && selected && <button disabled={busy} onClick={() => void open(selected.supplierId, 'edit')} className="ml-2 underline">Reload latest record</button>}</p>}
        {mode === 'view' ? <><SupplierImage imageURL={selected?.imageURL} name={selected?.name || 'Supplier'} /><dl className="space-y-3 text-sm">{[['Category', selected ? categoryLabel(selected.type) : '—'], ...fields.map(([key, label]) => [label, form[key]])].map(([label, value]) => <div key={String(label)}><dt className="text-xs text-[#3F6B5A]">{label}</dt><dd className="break-words">{value || '—'}</dd></div>)}</dl><button className="mt-5 underline" onClick={() => setMode(null)}>Close</button></> :
          <form onSubmit={e => { e.preventDefault(); void submit() }}>
            {mode === 'delete' ? <p className="mb-5 text-sm">Delete {selected?.name} from the active supplier list?</p> : <div className="grid gap-4 sm:grid-cols-2">
              {fields.map(([key, label, type]) => <label key={key} className="text-xs">{label}<input autoFocus={key === 'name'} className={inputClass} type={type} step={key === 'floor' ? '1' : 'any'} required={['name', 'buildingName', 'locationDescription', 'floor', 'latitude', 'longitude'].includes(key)} value={form[key] ?? ''} onChange={e => setForm(old => ({ ...old, [key]: key === 'floor' ? Number(e.target.value) : e.target.value }))} /></label>)}
              <label className="text-xs">Category<select className={inputClass} value={form.type} onChange={e => setForm(old => ({ ...old, type: e.target.value }))}>{!categories.some(c => c === form.type) && <option value={form.type}>{categoryLabel(form.type)}</option>}{categories.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}</select></label>
            </div>}
            <div className="mt-5 flex gap-3"><button type="button" disabled={busy} onClick={() => setMode(null)} className="flex-1 rounded-lg border py-2 text-sm">Cancel</button><button disabled={busy} className="flex-1 rounded-lg bg-[#1A4A36] py-2 text-sm text-white disabled:opacity-50">{busy ? 'Saving…' : mode === 'delete' ? 'Delete' : 'Save'}</button></div>
          </form>}
      </div>
    </div>}
  </section>
}
