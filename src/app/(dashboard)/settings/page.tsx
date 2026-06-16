"use client"

import { useState, useEffect } from "react"
import { Key, Palette, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { useApiKey } from "@/hooks/use-api-key"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const { claudeKey, geminiKey, saveClaudeKey, saveGeminiKey, loaded } = useApiKey()
  const [claudeDraft, setClaudeDraft] = useState("")
  const [geminiDraft, setGeminiDraft] = useState("")
  const [showClaude, setShowClaude] = useState(false)
  const [showGemini, setShowGemini] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (loaded) {
      setClaudeDraft(claudeKey)
      setGeminiDraft(geminiKey)
    }
  }, [loaded, claudeKey, geminiKey])

  function handleSave() {
    saveClaudeKey(claudeDraft.trim())
    saveGeminiKey(geminiDraft.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-zinc-100">Configuración</h1>
        <p className="text-sm text-zinc-500">Personaliza Perf-Bi según tus preferencias</p>
      </div>

      <div className="flex max-w-2xl flex-col gap-6">

        {/* AI Keys */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <Key className="h-4 w-4 text-zinc-500" strokeWidth={1.75} />
            <div>
              <h2 className="text-sm font-medium text-zinc-100">API Keys de IA <span className="ml-1.5 text-xs text-zinc-600">(opcional)</span></h2>
              <p className="text-xs text-zinc-500">
                Sin key la herramienta funciona completa. Con key desbloqueas NL→SQL y generación de dashboards desde imagen.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-400">Claude API Key (Anthropic)</label>
                {claudeKey && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Configurada
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showClaude ? "text" : "password"}
                  value={claudeDraft}
                  onChange={e => setClaudeDraft(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 pr-10 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  onClick={() => setShowClaude(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                >
                  {showClaude ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-600">
                Necesaria para generar dashboards desde imagen y NL→SQL con Claude.{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 underline hover:text-indigo-300"
                >
                  Obtener key →
                </a>
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-400">Gemini API Key (Google)</label>
                {geminiKey && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Configurada
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showGemini ? "text" : "password"}
                  value={geminiDraft}
                  onChange={e => setGeminiDraft(e.target.value)}
                  placeholder="AIza..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 pr-10 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  onClick={() => setShowGemini(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                >
                  {showGemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-600">
                Alternativa gratuita con Gemini Flash.{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 underline hover:text-indigo-300"
                >
                  Obtener key →
                </a>
              </p>
            </div>

            <button
              onClick={handleSave}
              className={cn(
                "self-start rounded-lg px-4 py-2 text-xs font-medium transition-all",
                saved
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-indigo-500 text-white hover:bg-indigo-600"
              )}
            >
              {saved ? "✓ Guardado" : "Guardar keys"}
            </button>
          </div>
        </section>

        {/* Apariencia */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <Palette className="h-4 w-4 text-zinc-500" strokeWidth={1.75} />
            <div>
              <h2 className="text-sm font-medium text-zinc-100">Apariencia</h2>
              <p className="text-xs text-zinc-500">Tema visual de la interfaz</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 rounded-lg border border-indigo-500 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-400">
              <span className="h-3 w-3 rounded-full bg-zinc-900 ring-1 ring-indigo-500" />
              Oscuro (default)
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 hover:border-zinc-600">
              <span className="h-3 w-3 rounded-full bg-white ring-1 ring-zinc-400" />
              Claro (próximamente)
            </button>
          </div>
        </section>

      </div>
    </div>
  )
}
