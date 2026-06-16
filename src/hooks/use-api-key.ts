"use client"

import { useState, useEffect } from "react"

export function useApiKey() {
  const [claudeKey, setClaudeKeyState] = useState("")
  const [geminiKey, setGeminiKeyState] = useState("")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setClaudeKeyState(localStorage.getItem("perf-bi-claude-key") ?? "")
    setGeminiKeyState(localStorage.getItem("perf-bi-gemini-key") ?? "")
    setLoaded(true)
  }, [])

  function saveClaudeKey(key: string) {
    if (key) localStorage.setItem("perf-bi-claude-key", key)
    else localStorage.removeItem("perf-bi-claude-key")
    setClaudeKeyState(key)
  }

  function saveGeminiKey(key: string) {
    if (key) localStorage.setItem("perf-bi-gemini-key", key)
    else localStorage.removeItem("perf-bi-gemini-key")
    setGeminiKeyState(key)
  }

  return { claudeKey, geminiKey, saveClaudeKey, saveGeminiKey, loaded }
}
