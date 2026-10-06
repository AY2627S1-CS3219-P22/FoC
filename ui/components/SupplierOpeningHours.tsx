import { useState } from 'react'
import { blankOpeningHours, saveOpeningHours, weekDays, type OpeningHours } from '../api/suppliers'

export function HoursFields({ day, onChange }: { day: OpeningHours; onChange: (day: OpeningHours) => void }) {
  return <div className="flex flex-wrap items-center gap-3 py-2">
    <span className="w-24 text-sm">{weekDays[day.dayOfWeek]}</span>
    <label className="text-sm"><input type="checkbox" checked={day.isClosed} onChange={e => onChange({ ...day, isClosed: e.target.checked, opensAt: e.target.checked ? null : '09:00:00', closesAt: e.target.checked ? null : '17:00:00' })} /> Closed</label>
    {!day.isClosed && <>{(['opensAt', 'closesAt'] as const).map(key => <label key={key} className="text-xs">{key === 'opensAt' ? 'Opens' : 'Closes'}<input className="block rounded border px-2 py-1" aria-label={`${weekDays[day.dayOfWeek]} ${key === 'opensAt' ? 'opens' : 'closes'}`} type="time" step="1" required value={day[key] || ''} onChange={e => onChange({ ...day, [key]: e.target.value.length === 5 ? `${e.target.value}:00` : e.target.value })} /></label>)}</>}
  </div>
}

// Separate submission avoids pretending parent edits and seven day replacements are atomic.
export default function SupplierOpeningHours({ supplierId }: { supplierId: number }) {
  const [day, setDay] = useState<OpeningHours>(blankOpeningHours()[0])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  return <form className="mt-6 border-t pt-4" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setMessage('')
    try { await saveOpeningHours(supplierId, day); setMessage(`${weekDays[day.dayOfWeek]} hours saved.`) }
    catch (error) { setMessage((error as Error).message) }
    finally { setBusy(false) }
  }}>
    <h4 className="font-medium">Replace opening hours for one day</h4>
    <p className="my-2 text-xs">Current weekly hours are not available here. Enter the complete schedule for the selected day. Saving replaces that day only.</p>
    <fieldset disabled={busy}>
      <label className="text-sm">Day<select className="ml-2 rounded border p-2" value={day.dayOfWeek} onChange={e => { setDay(blankOpeningHours()[Number(e.target.value)]); setMessage('') }}>{weekDays.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label>
      <HoursFields day={day} onChange={setDay} />
      <button className="rounded-lg border px-3 py-2 text-sm">{busy ? 'Saving…' : `Replace ${weekDays[day.dayOfWeek]} hours`}</button>
    </fieldset>
    {message && <p role="status" className="mt-2 text-sm">{message}</p>}
  </form>
}
