"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Sparkles, Loader2, MessageSquare, Users, UserCheck,
  ChevronDown, Trash2, ExternalLink, Coins, AlertTriangle,
} from "lucide-react";
import { useAppContext } from "@/store/appStore";
import Link from "next/link";

const API_BASE = "http://localhost:8000";

const SUGGESTED_QUESTIONS = [
  "Why is candidate #1 ranked above #2?",
  "Which candidates are in Pune or Bengaluru?",
  "Summarize the top 10 candidates for my hiring manager",
  "Who has the most FAISS or vector search experience?",
  "Which candidates have a notice period under 30 days?",
  "Show me candidates with strong production ML experience",
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  tokens?: number;
  cost?: number;
  timestamp: Date;
  error?: boolean;
}

const CONTEXT_OPTIONS = [
  { value: 100, label: "All 100 ranked candidates" },
  { value: 10, label: "Top 10 only" },
  { value: 20, label: "Top 20 only" },
  { value: 50, label: "Top 50 only" },
];

export default function AIChatPage() {
  const { state, dispatch } = useAppContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [contextSize, setContextSize] = useState(100);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [sessionCost, setSessionCost] = useState(0);
  const [backendApiEnabled, setBackendApiEnabled] = useState<boolean | null>(null); // null = loading
  const [backendResultsCount, setBackendResultsCount] = useState<number>(-1); // -1 = loading
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Always fetch real state from backend on mount — fixes hard-refresh issue
  useEffect(() => {
    const init = async () => {
      try {
        // Fetch API settings
        const settingsRes = await fetch(`${API_BASE}/api/api-settings`);
        if (settingsRes.ok) {
          const s = await settingsRes.json();
          setBackendApiEnabled(s.api_mode_enabled);
          // Sync into store too
          dispatch({
            type: "SET_API_SETTINGS",
            payload: {
              provider: s.provider,
              apiModeEnabled: s.api_mode_enabled,
              fallbackEnabled: s.fallback_enabled,
              geminiKeySet: s.gemini_key_set,
              openaiKeySet: s.openai_key_set,
              modelConfig: s.model_config,
              sessionTokens: s.session_tokens || 0,
              sessionCostUsd: s.session_cost_usd || 0,
            },
          });
        } else {
          setBackendApiEnabled(false);
        }
      } catch {
        setBackendApiEnabled(false);
      }

      try {
        // Fetch results to check if they exist
        const statusRes = await fetch(`${API_BASE}/api/status`);
        if (statusRes.ok) {
          const s = await statusRes.json();
          setBackendResultsCount(s.results_ready || 0);
        } else {
          setBackendResultsCount(0);
        }
      } catch {
        setBackendResultsCount(0);
      }
    };
    init();
  }, [dispatch]);

  // Derive: use backend state if available, fall back to store
  const apiModeEnabled = backendApiEnabled !== null ? backendApiEnabled : state.apiSettings?.apiModeEnabled;
  const resultsCount = backendResultsCount >= 0 ? backendResultsCount : (state.backendResults || []).length;
  const hasResults = resultsCount > 0;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim() || sending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          context_size: contextSize,
          add_to_history: true,
        }),
      });
      const data = await res.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer || "No response received.",
        citations: data.citations || [],
        tokens: data.tokens_used || 0,
        cost: data.cost_usd || 0,
        timestamp: new Date(),
        error: !data.success,
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (data.session_tokens) setSessionTokens(data.session_tokens);
      if (data.session_cost_usd) setSessionCost(data.session_cost_usd);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Could not reach the backend. Is the server running?",
        timestamp: new Date(),
        error: true,
      }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [sending, contextSize]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearHistory = async () => {
    await fetch(`${API_BASE}/api/chat/history`, { method: "DELETE" });
    setMessages([]);
  };

  // Loading state — checking backend
  if (backendApiEnabled === null || backendResultsCount === -1) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)] px-8">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-[13px] text-muted-foreground">Connecting to AI backend...</p>
        </div>
      </div>
    );
  }

  // Not enabled states
  if (!apiModeEnabled) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)] px-8">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">API Mode Required</h2>
            <p className="text-[13px] text-muted-foreground mt-1">
              AI Chat is only available in API Mode. Enable it in API Settings and configure your API key.
            </p>
          </div>
          <Link
            href="/api-settings"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors"
          >
            Go to API Settings <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  if (!hasResults) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)] px-8">
        <div className="text-center space-y-4 max-w-sm">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">No Results Available</h2>
            <p className="text-[13px] text-muted-foreground mt-1">
              Run the ranking pipeline first to load candidate data, then come back to chat.
            </p>
          </div>
          <Link
            href="/input"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors"
          >
            Run Ranking
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="text-[14px] font-semibold text-foreground">AI Recruiter Chat</div>
            <div className="text-[11px] text-muted-foreground">
              {state.apiSettings?.provider === "gemini" ? "Powered by Gemini 1.5 Flash" : "Powered by GPT-4o-mini"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Context selector */}
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <div className="relative">
              <select
                value={contextSize}
                onChange={e => setContextSize(Number(e.target.value))}
                className="appearance-none text-[12px] pl-2.5 pr-6 py-1 rounded-lg border border-border bg-background text-foreground focus:outline-none cursor-pointer"
              >
                {CONTEXT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Session stats */}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground border border-border rounded-lg px-2 py-1">
            <Coins className="w-3 h-3" />
            {sessionTokens.toLocaleString()} tokens · ${sessionCost.toFixed(4)}
          </div>

          {/* Clear */}
          <button
            onClick={clearHistory}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-6 pt-4">
            {/* Welcome message */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-[16px] font-semibold text-foreground">Ask about your candidates</h2>
              <p className="text-[13px] text-muted-foreground mt-1">
                I have access to all {Math.min(contextSize, resultsCount)} ranked candidates. Ask anything.
              </p>
            </div>

            {/* Suggested questions */}
            <div className="grid grid-cols-2 gap-2 max-w-xl mx-auto">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => sendMessage(q)}
                  className="text-left text-[12px] px-3 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {q}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] space-y-1.5 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                {/* Avatar */}
                <div className={`flex items-center gap-1.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === "user" ? "bg-foreground" : "bg-purple-100 dark:bg-purple-900/30"
                  }`}>
                    {msg.role === "user"
                      ? <UserCheck className="w-3 h-3 text-background" />
                      : <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    }
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {msg.role === "user" ? "You" : "AI Assistant"}
                  </span>
                </div>

                {/* Bubble */}
                <div className={`
                  px-4 py-3 rounded-2xl text-[13px] leading-relaxed
                  ${msg.role === "user"
                    ? "bg-foreground text-background rounded-tr-sm"
                    : msg.error
                      ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50 rounded-tl-sm"
                      : "bg-card border border-border text-foreground rounded-tl-sm"
                  }
                `}>
                  {msg.content}
                </div>

                {/* Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.citations.map(cid => (
                      <Link
                        key={cid}
                        href={`/results`}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors"
                      >
                        {cid}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Token info */}
                {msg.tokens !== undefined && msg.tokens > 0 && (
                  <div className="text-[10px] text-muted-foreground">
                    {msg.tokens.toLocaleString()} tokens · ${(msg.cost || 0).toFixed(5)}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Sending indicator */}
        {sending && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-card border border-border flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              <span className="text-[13px] text-muted-foreground">Thinking...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-6 py-4 border-t border-border bg-background/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about candidates... (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="w-full resize-none text-[13px] px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20 max-h-32 overflow-y-auto"
              style={{ minHeight: "44px" }}
            />
          </div>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || sending}
            className={`
              flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all
              ${input.trim() && !sending
                ? "bg-foreground text-background hover:bg-foreground/90 shadow-sm"
                : "bg-muted text-muted-foreground cursor-not-allowed"
              }
            `}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-[11px] text-muted-foreground">
            Context: {Math.min(contextSize, resultsCount)} candidates loaded
          </p>
          <p className="text-[11px] text-muted-foreground">
            Session: {sessionTokens.toLocaleString()} tokens · ${sessionCost.toFixed(4)}
          </p>
        </div>
      </div>
    </div>
  );
}
