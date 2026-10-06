import type { Registration } from "../api/users"
import { useState } from "react"
import type { Page } from "../App"

interface Props {
  onRegister: (input: Registration) => Promise<void>
  onNavigate: (page: Page) => void
}

export default function SignupPage({ onRegister, onNavigate }: Props) {
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ firstName: "", lastName: "", username: "", email: "", password: "", confirm: "" })
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const inputCls =
    "w-full px-3.5 py-2.5 border border-[#E4E8E6] rounded-lg text-sm text-[#1B2522] placeholder-[#9CA3AF] bg-white focus:outline-none focus:border-[#1A4A36] focus:ring-1 focus:ring-[#1A4A36] transition-colors"

  const fields: { key: keyof typeof form; label: string; type: string; placeholder: string }[] = [
    { key: "firstName", label: "First name", type: "text", placeholder: "Jordan" },
    { key: "lastName", label: "Last name", type: "text", placeholder: "Tan" },
    { key: "username", label: "Username", type: "text", placeholder: "jordan.tan" },
    { key: "email",    label: "University email",   type: "email",    placeholder: "yourname@u.nus.edu" },
    { key: "password", label: "Password",           type: "password", placeholder: "••••••••" },
    { key: "confirm",  label: "Confirm password",   type: "password", placeholder: "••••••••" },
  ]

  return (
    <div className="min-h-screen bg-[#F7F9F8] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-[#1A4A36] rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-semibold text-[#162A46] text-base">CampusDash</span>
        </div>

        <div className="bg-white border border-[#E4E8E6] rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[#162A46] mb-1">Create your account</h2>
          <p className="text-sm text-[#3F6B5A] mb-5">Join your campus errand network.</p>

          <div className="flex items-start gap-2.5 bg-[#E8F1ED] border border-[#1A4A36]/10 rounded-lg px-4 py-3 mb-6">
            <svg className="w-4 h-4 text-[#1A4A36] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-[#1A4A36] font-medium leading-relaxed">
              {"Use your NUS email. Password: at least 8 characters, including an uppercase letter, number and special character."}
            </p>
          </div>

          {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
          <form onSubmit={async (e) => { e.preventDefault(); if (form.password !== form.confirm) { setError('Passwords do not match.'); return } setError(''); setBusy(true); try { const { confirm: _confirm, ...input } = form; await onRegister(input) } catch (err) { setError((err as Error).message) } finally { setBusy(false) } }} className="space-y-4">
            {fields.map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-[#1B2522] mb-1.5">{label}</label>
                <input
                  required minLength={type === "password" ? 8 : undefined} type={type}
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                  className={inputCls}
                />
              </div>
            ))}
            <button
              disabled={busy} type="submit"
              className="w-full py-2.5 bg-[#1A4A36] text-white text-sm font-medium rounded-lg hover:bg-[#163D2C] active:scale-[.99] transition-all"
            >
              {busy ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-xs text-[#3F6B5A] mt-5">
            Already have an account?{" "}
            <button
              onClick={() => onNavigate("login")}
              className="text-[#1A4A36] font-semibold hover:underline"
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
