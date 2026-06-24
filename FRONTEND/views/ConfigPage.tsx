"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Settings2, RotateCcw, Info, Brain, Zap } from "lucide-react";
import { useAppContext } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface Weights {
  skills: number;
  career: number;
  experience: number;
  location: number;
  education: number;
  ceWeight: number;
  ceShortlist: number;
}

const DEFAULTS: Weights = {
  skills: 35,
  career: 30,
  experience: 10,
  location: 10,
  education: 5,
  ceWeight: 60,
  ceShortlist: 300,
};

const WEIGHT_FIELDS = [
  { key: "skills" as const, label: "Skills Match", desc: "Core technical fit importance" },
  { key: "career" as const, label: "Career Quality", desc: "Product vs consulting background weight" },
  { key: "experience" as const, label: "Experience Years", desc: "YoE curve influence" },
  { key: "location" as const, label: "Location", desc: "Geographic preference strictness" },
  { key: "education" as const, label: "Education", desc: "Institution tier influence" },
];

const BEHAVIORAL_CURVES = [
  {
    label: "Activity decay half-life",
    default: "90 days",
    points: [
      { x: "90 days inactive", y: "0.37×" },
      { x: "180 days inactive", y: "0.14×" },
      { x: "Active", y: "1.00×" },
    ],
  },
  {
    label: "Response rate floor",
    default: "0.30 floor",
    points: [
      { x: "rate = 0.0", y: "0.30×" },
      { x: "rate = 0.5", y: "0.65×" },
      { x: "rate = 1.0", y: "1.00×" },
    ],
  },
  {
    label: "Notice period decay",
    default: "30 day start",
    points: [
      { x: "60 days", y: "0.69×" },
      { x: "90 days", y: "0.47×" },
      { x: "Immediate", y: "1.00×" },
    ],
  },
];

export default function ConfigPage() {
  const { state, dispatch } = useAppContext();
  const [weights, setWeights] = useState<Weights>(DEFAULTS);

  const setWeight = (key: keyof Weights, value: number) => {
    setWeights(w => ({ ...w, [key]: value }));
  };

  const reset = () => setWeights(DEFAULTS);

  const nonCETotal = weights.skills + weights.career + weights.experience + weights.location + weights.education;

  return (
    <div className="max-w-3xl mx-auto px-8 py-10 space-y-8">

      {/* Header */}
      <div>
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-2">S5 · Ranking Configuration</div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configuration</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Optional. Adjust weights and CE parameters. Most judges can skip directly to Run Ranking.
        </p>
      </div>

      {/* Defaults banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/30">
        <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-foreground">
            Default weights are the exact values used in the competition CSV submission.
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">Changes here affect the demo run only — not the submitted CSV.</p>
        </div>
        <Button size="sm" variant="outline" className="flex-shrink-0 gap-1.5 text-xs" onClick={reset}>
          <RotateCcw className="w-3 h-3" />
          Reset
        </Button>
      </div>

      {/* Component Weights */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-semibold text-foreground">Component Weights</h2>
          <span className={`text-[12px] font-mono ${nonCETotal === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
            Total: {nonCETotal}%
            {nonCETotal !== 100 && " (should be 100%)"}
          </span>
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {WEIGHT_FIELDS.map((f, i) => (
            <motion.div
              key={f.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className="px-5 py-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[13px] font-medium text-foreground">{f.label}</span>
                  <span className="text-[11px] text-muted-foreground ml-2">{f.desc}</span>
                </div>
                <span className="text-[14px] font-bold font-mono text-foreground w-12 text-right">
                  {weights[f.key]}%
                </span>
              </div>
              <Slider
                value={[weights[f.key]]}
                onValueChange={([v]) => setWeight(f.key, v)}
                min={0}
                max={60}
                step={1}
                className="w-full"
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Cross-Encoder Parameters */}
      <section>
        <h2 className="text-[14px] font-semibold text-foreground mb-4 flex items-center gap-2">
          Cross-Encoder Parameters
          <span className="text-[10px] ai-badge px-1.5 py-0.5 rounded-[4px] font-medium">CE</span>
        </h2>
        <div className="rounded-xl border border-ai/20 bg-ai/4 overflow-hidden divide-y divide-border">
          {/* CE Weight */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[13px] font-medium text-foreground">Cross-Encoder Weight</span>
                <span className="text-[11px] text-muted-foreground ml-2">Share of CE score in final blend (0–80%)</span>
              </div>
              <span className="text-[14px] font-bold font-mono text-ai w-12 text-right">{weights.ceWeight}%</span>
            </div>
            <Slider
              value={[weights.ceWeight]}
              onValueChange={([v]) => setWeight("ceWeight", v)}
              min={0}
              max={80}
              step={5}
              className="w-full"
            />
            <p className="text-[11px] text-muted-foreground mt-2 font-mono">
              Final = {100 - weights.ceWeight}% algo + {weights.ceWeight}% CE
            </p>
          </div>

          {/* CE Shortlist */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[13px] font-medium text-foreground">CE Shortlist Size</span>
                <span className="text-[11px] text-muted-foreground ml-2">Candidates sent to cross-encoder</span>
              </div>
              <span className="text-[14px] font-bold font-mono text-foreground w-16 text-right">{weights.ceShortlist}</span>
            </div>
            <Slider
              value={[weights.ceShortlist]}
              onValueChange={([v]) => setWeight("ceShortlist", v)}
              min={100}
              max={500}
              step={50}
              className="w-full"
            />
            <p className="text-[11px] text-muted-foreground mt-2">
              {Math.ceil(weights.ceShortlist / 32)} batches × 32 pairs each.
              {weights.ceShortlist > 300 && " Higher = more thorough, slower."}
            </p>
          </div>
        </div>

        <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Info className="w-3 h-3 flex-shrink-0" />
          Model: cross-encoder/ms-marco-MiniLM-L-6-v2 · Local inference · No network required
        </div>
      </section>

      {/* Behavioral Curves */}
      <section>
        <h2 className="text-[14px] font-semibold text-foreground mb-4">Behavioral Decay Curves</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {BEHAVIORAL_CURVES.map(c => (
            <div key={c.label} className="rounded-xl border border-border bg-card p-4">
              <div className="text-[12px] font-semibold text-foreground mb-0.5">{c.label}</div>
              <div className="text-[11px] text-muted-foreground mb-3">{c.default}</div>
              <div className="space-y-1.5">
                {c.points.map(pt => (
                  <div key={pt.x} className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{pt.x}</span>
                    <span className="text-[11px] font-mono font-bold text-foreground">{pt.y}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Execution mode selector */}
      <section>
        <h2 className="text-[14px] font-semibold text-foreground mb-4">Execution Mode</h2>
        <div className="grid grid-cols-2 gap-3">
          {([
            { mode: "competition" as const, icon: Zap, label: "Competition Mode", desc: "No network, CE only, template reasoning. Matches rank.py exactly." },
            { mode: "demo" as const, icon: Brain, label: "Demo Mode", desc: "LLM-enriched reasoning if API key configured. Labeled clearly as Demo." },
          ] as const).map(m => {
            const Icon = m.icon;
            const active = state.executionMode === m.mode;
            return (
              <button
                key={m.mode}
                onClick={() => dispatch({ type: "SET_EXECUTION_MODE", payload: m.mode })}
                className={`
                  rounded-xl border p-4 text-left transition-all
                  ${active
                    ? m.mode === "demo" ? "border-ai/40 bg-ai/4" : "border-foreground bg-muted/50"
                    : "border-border hover:border-foreground/20"
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className={`w-3.5 h-3.5 ${active && m.mode === "demo" ? "text-ai" : "text-muted-foreground"}`} />
                  <span className="text-[13px] font-semibold text-foreground">{m.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{m.desc}</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
