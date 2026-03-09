// components/BackendTest.tsx
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SimpleLineChart } from "@/components/restaurant/SimpleLineChart";

export function BackendTest() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [chartData, setChartData] = useState<{ x: number[]; y: number[] } | null>(null);

  async function handleConnect() {
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch(
        "https://maricela-eruditional-nonexpediently.ngrok-free.dev/ai-prompt",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text }),
        }
      );

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }

      const data = await res.json();

      // Prefer the markdown answer string if it exists
      const md =
        typeof data?.answer === "string"
          ? data.answer
          : typeof data?.result === "string"
            ? data.result
            : null;

      if (data?.x && data?.y) {
        setChartData({ x: data.x, y: data.y });
      }

      // If we got markdown, render it; otherwise show pretty JSON
      if (md) {
        // Normalize escaped newlines if backend returns them as "\\n"
        const normalized = md.replace(/\\n/g, "\n");
        setResponse(normalized);
      } else {
        setResponse("Backend says:\n\n```json\n" + JSON.stringify(data, null, 2) + "\n```");
      }


    } catch (err: any) {
      setResponse(`Error: ${err.message || "Request failed"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Text input */}
      <textarea
        placeholder="Backend Test"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full text-sm rounded-xl border border-border bg-background/40 px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-muted resize-y"
      />

      {/* Button */}
      <button
        type="button"
        onClick={handleConnect}
        disabled={loading || !text}
        className="w-full rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/30 disabled:opacity-50"
      >
        {loading ? "Connecting..." : "Connect To Backend →"}
      </button>

      {/* Render Markdown Properly */}
      {response && (
        <div className="prose prose-sm dark:prose-invert max-w-none rounded-xl border border-border bg-card/40 p-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {response}
          </ReactMarkdown>
        </div>
      )}

      {/* Optional Chart */}
      {chartData && (
        <div className="mt-3">
          <SimpleLineChart x={chartData.x} y={chartData.y} />
        </div>
      )}
    </div>
  );
}