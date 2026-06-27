"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key, Zap, CheckCircle2, XCircle, AlertTriangle, Loader2,
  Eye, EyeOff, ChevronDown, Sparkles, Shield, ToggleLeft,
  ToggleRight, RefreshCw, Coins, BarChart3, Settings,
} from "lucide-react";
import { useAppContext } from "@/store/appStore";
import type { ApiProvider, ApiSettings } from "@/store/appStore";

const API_BASE = "http://localhost:8000";

// Cost estimates per 1k tokens (USD)
const COST_TABLE: Record<string, Record<string, number>> = {
  gemini: {
    "gemini-1.5-flash": 0.000075,
    "gemini-1.5-pro": 0.00125,
    "gemini-2.0-flash": 0.0001,
  },
  openai: {
    "gpt-4o-mini": 0.00015,
    "gpt-4o": 0.005,
  },
};

const MODEL_OPTIONS: Record<ApiProvider, Record<string, string[]>> = {
  gemini: {
    reasoning: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"],
    jd_parse: ["gemini-1.5-pro", "gemini-1.5-flash"],
    chat: ["gemini-1.5-flash", "gemini-1.5-pro"],
  },
  openai: {
    reasoning: ["gpt-4o-mini", "gpt-4o"],
    jd_parse: ["gpt-4o", "gpt-4o-mini"],
    chat: ["gpt-4o-mini", "gpt-4o"],
  },
};

const PROVIDER_INFO: Record<ApiProvider, { label: string; color: string; bg: string; description: string; keyLink: string }> = {
  gemini: {
    label: "Google Gemini",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50",
    description: "gemini-1.5-flash is free for moderate usage. Best for cost-effective ranking.",
    keyLink: "https://aistudio.google.com/app/apikey",
  },
  openai: {
    label: "OpenAI",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50",
    description: "gpt-4o-mini has the most reliable JSON output. Best for structured reasoning.",
    keyLink: "https://platform.openai.com/api-keys",
  },
};

function estimateCost(provider: ApiProvider, model: string, candidateCount: number): string {
  const perK = COST_TABLE[provider]?.[model] ?? 0.001;
  // ~800 tokens per candidate for reasoning, 10 per batch
  const totalTokens = Math.ceil(candidateCount / 10) * 800;
  const cost = (totalTokens / 1000) * perK;
  if (cost < 0.001) return "< $0.001";
  return `$${cost.toFixed(4)}`;
}

type ValidationState = "idle" | "loading" | "success" | "error";

export default function ApiSettingsPage() {
  const { state, dispatch } = useAppContext();

  const [provider, setProvider] = useState<ApiProvider>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [apiModeEnabled, setApiModeEnabled] = useState(false);
  const [fallbackEnabled, setFallbackEnabled] = useState(true);
  const [modelConfig, setModelConfig] = useState({
    reasoning_model: "gemini-1.5-flash",
    jd_parse_model: "gemini-1.5-pro",
    chat_model: "gemini-1.5-flash",
  });
  const [validationState, setValidationState] = useState<ValidationState>("idle");
  const [validationError, setValidationError] = useState("");
  const [validatedModel, setValidatedModel] = useState("");
  const [sessionStats, setSessionStats] = useState({ tokens: 0, cost: 0 });
  const [serverSettings, setServerSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const candidateCount = state.uploadedCount || 100;

  // Load settings from backend
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/api-settings`);
      if (res.ok) {
        const data = await res.json();
        setServerSettings(data);
        setProvider(data.provider as ApiProvider);
        setApiModeEnabled(data.api_mode_enabled);
        setFallbackEnabled(data.fallback_enabled);
        setModelConfig(data.model_config || modelConfig);
        setSessionStats({
          tokens: data.session_tokens || 0,
          cost: data.session_cost_usd || 0,
        });
        // Update store
        dispatch({
          type: "SET_API_SETTINGS",
          payload: {
            provider: data.provider,
            apiModeEnabled: data.api_mode_enabled,
            fallbackEnabled: data.fallback_enabled,
            geminiKeySet: data.gemini_key_set,
            openaiKeySet: data.openai_key_set,
            modelConfig: data.model_config,
            sessionTokens: data.session_tokens || 0,
            sessionCostUsd: data.session_cost_usd || 0,
          } as ApiSettings,
        });
      }
    } catch {
      // Backend may not be running
    }
  }, []);

  useEffect(() => {
    loadSettings();
    const interval = setInterval(loadSettings, 10000);
    return () => clearInterval(interval);
  }, [loadSettings]);

  const handleValidate = async () => {
    if (!apiKey.trim()) return;
    setValidationState("loading");
    setValidationError("");
    try {
      const res = await fetch(`${API_BASE}/api/api-settings/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, api_key: apiKey, model_config: modelConfig }),
      });
      const data = await res.json();
      if (data.success) {
        setValidationState("success");
        setValidatedModel(data.model_used || "");
      } else {
        setValidationState("error");
        setValidationError(data.error || "Validation failed");
      }
    } catch (e: any) {
      setValidationState("error");
      setValidationError("Could not reach backend. Is the server running?");
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/api-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          api_mode_enabled: apiModeEnabled,
          fallback_enabled: fallbackEnabled,
          model_config: modelConfig,
        }),
      });
      const data = await res.json();
      if (data.success) {
        dispatch({
          type: "SET_API_SETTINGS",
          payload: {
            provider,
            apiModeEnabled,
            fallbackEnabled,
            modelConfig,
          },
        });
      }
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleProviderChange = (p: ApiProvider) => {
    setProvider(p);
    setValidationState("idle");
    setApiKey("");
    const defaults = {
      gemini: { reasoning_model: "gemini-1.5-flash", jd_parse_model: "gemini-1.5-pro", chat_model: "gemini-1.5-flash" },
      openai: { reasoning_model: "gpt-4o-mini", jd_parse_model: "gpt-4o", chat_model: "gpt-4o-mini" },
    };
    setModelConfig(defaults[p]);
  };

  const handleResetStats = async () => {
    await fetch(`${API_BASE}/api/session-stats`, { method: "DELETE" });
    setSessionStats({ tokens: 0, cost: 0 });
  };

  const keyIsSet = provider === "gemini"
    ? serverSettings?.gemini_key_set
    : serverSettings?.openai_key_set;

  const info = PROVIDER_INFO[provider];

  return (
    <div className="max-w-3xl mx-auto px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">S0 · API Settings</div>
          {apiModeEnabled && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> API Mode Active
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">API Settings</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Configure LLM providers to unlock AI-powered reasoning, chat, and JD parsing.
          Competition Mode ranking always uses local models — this is purely additive.
        </p>
      </div>

      {/* Mode Toggle Banner */}
      <motion.section
        className={`rounded-xl border p-4 transition-colors ${
          apiModeEnabled
            ? "border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-950/20"
            : "border-border bg-card"
        }`}
        layout
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[14px] font-semibold text-foreground flex items-center gap-2">
              {apiModeEnabled ? (
                <><Sparkles className="w-4 h-4 text-purple-500" /> API Mode — Enhanced Recruiter Features</>
              ) : (
                <><Shield className="w-4 h-4 text-muted-foreground" /> Competition Mode — Local Only (Default)</>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {apiModeEnabled
                ? `Using ${provider === "gemini" ? "Google Gemini" : "OpenAI"} for reasoning, JD parsing, and chat. Rankings still use local models.`
                : "All ranking, embeddings, and reasoning use local models only. No internet required."}
            </p>
          </div>
          <button
            onClick={() => {
              setApiModeEnabled(v => !v);
            }}
            className="flex-shrink-0 p-1"
          >
            {apiModeEnabled
              ? <ToggleRight className="w-8 h-8 text-purple-500" />
              : <ToggleLeft className="w-8 h-8 text-muted-foreground" />
            }
          </button>
        </div>
      </motion.section>

      {/* Provider Selection */}
      <section className="space-y-3">
        <h2 className="text-[14px] font-semibold text-foreground flex items-center gap-2">
          <Settings className="w-4 h-4 text-muted-foreground" /> Provider Selection
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {(["gemini", "openai"] as ApiProvider[]).map(p => {
            const pInfo = PROVIDER_INFO[p];
            const active = provider === p;
            return (
              <button
                key={p}
                onClick={() => handleProviderChange(p)}
                className={`
                  text-left rounded-xl border p-4 transition-all
                  ${active
                    ? `${pInfo.bg} ring-2 ring-offset-1 ring-offset-background ${p === "gemini" ? "ring-blue-400" : "ring-emerald-400"}`
                    : "border-border bg-card hover:bg-muted/30"
                  }
                `}
              >
                <div className={`text-[13px] font-semibold mb-1 ${active ? pInfo.color : "text-foreground"}`}>
                  {pInfo.label}
                </div>
                <div className="text-[11px] text-muted-foreground">{pInfo.description}</div>
                {active && (
                  <a
                    href={pInfo.keyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className={`mt-2 text-[10px] underline ${pInfo.color}`}
                  >
                    Get API Key ↗
                  </a>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* API Key Input */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-[14px] font-semibold text-foreground flex items-center gap-2">
          <Key className="w-4 h-4 text-muted-foreground" />
          API Key — {PROVIDER_INFO[provider].label}
          {keyIsSet && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Key loaded from .env
            </span>
          )}
        </h2>

        <div className="space-y-2">
          <div className="relative flex items-center gap-2">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setValidationState("idle"); }}
              placeholder={keyIsSet ? "Key already set in .env — enter to override for this session" : `Enter your ${PROVIDER_INFO[provider].label} API key`}
              className="flex-1 text-[13px] px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20 font-mono"
            />
            <button
              onClick={() => setShowKey(v => !v)}
              className="p-2.5 rounded-lg border border-border bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Keys are never logged, never sent to GitHub. Store permanently in BACKEND/.env
          </p>
        </div>

        {/* Validate Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleValidate}
            disabled={(!apiKey.trim() && !keyIsSet) || validationState === "loading"}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all
              ${validationState === "loading"
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-foreground text-background hover:bg-foreground/90"
              }
            `}
          >
            {validationState === "loading"
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Testing...</>
              : <><Zap className="w-3.5 h-3.5" /> Test Connection</>
            }
          </button>

          <AnimatePresence mode="wait">
            {validationState === "success" && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-[13px] text-emerald-600 dark:text-emerald-400 font-medium"
              >
                <CheckCircle2 className="w-4 h-4" />
                Connected — {validatedModel}
              </motion.span>
            )}
            {validationState === "error" && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-[13px] text-red-600 dark:text-red-400"
              >
                <XCircle className="w-4 h-4" />
                {validationError}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Per-Task Model Selection */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-[14px] font-semibold text-foreground">Per-Task Model Selection</h2>
        <div className="space-y-3">
          {[
            { key: "reasoning_model", label: "Reasoning Generation", desc: "Generates 1-2 sentence recruiter notes for top-100 candidates" },
            { key: "jd_parse_model", label: "JD Parsing", desc: "Parses custom JDs — one-time call, worth using a stronger model" },
            { key: "chat_model", label: "Recruiter Chat", desc: "Powers Q&A — speed matters more than maximum quality" },
          ].map(task => {
            const options = MODEL_OPTIONS[provider][task.key.replace("_model", "")] || [];
            const currentVal = modelConfig[task.key as keyof typeof modelConfig];
            return (
              <div key={task.key} className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-foreground">{task.label}</div>
                  <div className="text-[11px] text-muted-foreground">{task.desc}</div>
                </div>
                <div className="relative flex-shrink-0">
                  <select
                    value={currentVal}
                    onChange={e => setModelConfig(mc => ({ ...mc, [task.key]: e.target.value }))}
                    className="appearance-none text-[12px] pl-3 pr-7 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 cursor-pointer font-mono"
                  >
                    {options.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Cost Estimator */}
        <div className="pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-2">
            <Coins className="w-3 h-3" /> Cost Estimator ({candidateCount} candidates)
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Reasoning", model: modelConfig.reasoning_model },
              { label: "JD Parsing", model: modelConfig.jd_parse_model },
              { label: "Chat (10 msgs)", model: modelConfig.chat_model },
            ].map(item => (
              <div key={item.label} className="rounded-lg bg-muted/30 px-3 py-2">
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
                <div className="text-[13px] font-mono font-semibold text-foreground">
                  {estimateCost(provider, item.model, candidateCount)}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{item.model}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fallback Configuration */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Automatic Fallback to Local Models
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              When ON: API failures silently use local models. Rankings always produced.
              When OFF: API failure shows an error in the UI.
            </p>
          </div>
          <button onClick={() => setFallbackEnabled(v => !v)}>
            {fallbackEnabled
              ? <ToggleRight className="w-8 h-8 text-emerald-500" />
              : <ToggleLeft className="w-8 h-8 text-muted-foreground" />
            }
          </button>
        </div>
      </section>

      {/* Session Usage */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" /> Session Usage
          </h2>
          <button
            onClick={handleResetStats}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Reset
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="text-[11px] text-muted-foreground">Tokens Used</div>
            <div className="text-[20px] font-bold font-mono text-foreground">
              {sessionStats.tokens.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="text-[11px] text-muted-foreground">Estimated Cost</div>
            <div className="text-[20px] font-bold font-mono text-foreground">
              ${sessionStats.cost.toFixed(4)}
            </div>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-foreground text-background text-[13px] font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Save Settings
        </button>
        <p className="text-[12px] text-muted-foreground">
          API key must be set in <code className="font-mono text-[11px] px-1 py-0.5 bg-muted rounded">BACKEND/.env</code> for persistence across restarts.
        </p>
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 p-4 text-[12px] text-amber-800 dark:text-amber-300">
        <strong className="block mb-1">Competition Mode is always safe.</strong>
        API Mode only enhances reasoning, chat, and JD parsing. The core ranking algorithm — 
        embeddings, feature scoring, cross-encoder re-ranking — always uses local models regardless of this setting.
        The submission.csv will be identical whether API Mode is on or off.
      </div>
    </div>
  );
}
