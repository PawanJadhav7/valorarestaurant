// components/BackendTest.tsx
import React, { useState } from "react";
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
      const res = await fetch("https://maricela-eruditional-nonexpediently.ngrok-free.dev/ai-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }), // matches payload: str = Body(...)
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }

      const data = await res.json(); // e.g. { result: "..." }
      
      if (data.x && data.y) {
        setChartData(null);
        setResponse(`AI says: ${data.answer}`);
      } else {
        setResponse(`Backend says: ${JSON.stringify(data)}`);
      }

    } catch (err: any) {
      setResponse(`Error: ${err.message || "Request failed"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Text input */}
      <div>
        <textarea
          placeholder="Backend Test"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4} // default visible lines
          className="w-full text-sm rounded-xl border border-border bg-background/40 px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-muted resize-y"
        />
      </div>

      {/* Button */}
      <div>
        <button
          type="button"
          onClick={handleConnect}
          disabled={loading || !text}
          className="w-full rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/30 disabled:opacity-50"
        >
          {loading ? "Connecting..." : "Connect To Backend →"}
        </button>
      </div>

      {/* Result */}
      {response && (
        <p className="text-xl text-muted-foreground">
          {response}
        </p>
      )}
      {/* {chartData && (
        <div className="mt-3">
          <SimpleLineChart x={chartData.x} y={chartData.y} />
        </div>
      )} */}
    </div>
  );
}
