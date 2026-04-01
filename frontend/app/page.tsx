// frontend/app/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";

/* ─── Win2K Window Chrome ─── */
function WinWindow({
  title,
  icon,
  children,
  className = "",
  contentClass = "",
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClass?: string;
}) {
  return (
    <div className={`win-window ${className}`} style={{ fontFamily: "Tahoma, Arial, sans-serif" }}>
      {/* Title bar */}
      <div className="win-titlebar select-none">
        {icon && <span className="text-xs">{icon}</span>}
        <span className="flex-1 text-xs font-bold">{title}</span>
        {/* Window control buttons */}
        <div className="flex gap-0.5">
          <button className="win-btn" style={{ padding: "0 4px", minWidth: 16, minHeight: 14, fontSize: 9, lineHeight: 1 }}>_</button>
          <button className="win-btn" style={{ padding: "0 4px", minWidth: 16, minHeight: 14, fontSize: 9, lineHeight: 1 }}>□</button>
          <button className="win-btn" style={{ padding: "0 4px", minWidth: 16, minHeight: 14, fontSize: 9, lineHeight: 1, background: "#c04040", borderTopColor: "#ff8080", borderLeftColor: "#ff8080" }}>✕</button>
        </div>
      </div>
      {/* Menu bar */}
      <div className="win-panel flex gap-0" style={{ borderTop: "none", padding: "2px 4px", fontSize: 11 }}>
        {["File", "Edit", "View", "Help"].map((m) => (
          <button key={m} className="hover:bg-[#0a2470] hover:text-white px-2 py-0.5 text-xs" style={{ background: "none", border: "none", cursor: "default" }}>
            {m}
          </button>
        ))}
      </div>
      {/* Content */}
      <div className={`p-3 ${contentClass}`}>
        {children}
      </div>
      {/* Status bar */}
      <div className="win-statusbar flex items-center gap-4">
        <div className="win-sunken" style={{ minWidth: 180, padding: "1px 4px", fontSize: 11 }}>
          Ready
        </div>
        <div className="win-sunken flex-1" style={{ padding: "1px 4px", fontSize: 11 }}>
          Valora AI — Operational Intelligence Platform
        </div>
      </div>
    </div>
  );
}

/* ─── Win2K Raised Panel ─── */
function WinPanel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`win-groupbox ${className}`}>
      {title && (
        <div
          style={{
            position: "absolute",
            top: -8,
            left: 8,
            background: "#d4d0c8",
            padding: "0 4px",
            fontSize: 11,
            fontWeight: "bold",
            fontFamily: "Tahoma, Arial, sans-serif",
          }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Win2K Stat Tile ─── */
function StatTile({ label, value, note, noteColor = "#000080" }: { label: string; value: string; note: string; noteColor?: string }) {
  return (
    <div className="win-sunken p-2" style={{ background: "#ffffff" }}>
      <div style={{ fontSize: 10, color: "#404040", fontFamily: "Tahoma, Arial, sans-serif" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: "bold", fontFamily: "Tahoma, Arial, sans-serif", marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 10, color: noteColor, fontFamily: "Tahoma, Arial, sans-serif", marginTop: 2 }}>{note}</div>
    </div>
  );
}

/* ─── Tab Button ─── */
function WinTab({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "win-tab win-tab-active" : "win-tab"}
      style={{ fontFamily: "Tahoma, Arial, sans-serif", fontSize: 11 }}
    >
      {children}
    </button>
  );
}

/* ─── Contact Row ─── */
function ContactRow({ label, title, subtitle, href }: { label: string; title: string; subtitle: string; href?: string }) {
  const inner = (
    <div className="win-raised flex items-start gap-3 p-2" style={{ marginBottom: 4 }}>
      <div
        className="win-sunken flex items-center justify-center"
        style={{ width: 32, height: 32, flexShrink: 0, background: "#ffffff", fontSize: 14 }}
      >
        {label === "Email" ? "✉" : label === "LinkedIn" ? "in" : label === "X / Twitter" ? "𝕏" : "☎"}
      </div>
      <div>
        <div style={{ fontSize: 10, color: "#404040", fontFamily: "Tahoma, Arial, sans-serif", textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 11, fontWeight: "bold", color: "#000080", fontFamily: "Tahoma, Arial, sans-serif" }}>{title}</div>
        <div style={{ fontSize: 10, color: "#404040", fontFamily: "Tahoma, Arial, sans-serif" }}>{subtitle}</div>
      </div>
    </div>
  );
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>;
  return inner;
}

/* ─── FAQ Row ─── */
function FaqRow({ q, a }: { q: string; a: string }) {
  return (
    <div className="win-raised p-2 mb-2">
      <div style={{ fontSize: 11, fontWeight: "bold", fontFamily: "Tahoma, Arial, sans-serif", color: "#000080" }}>{q}</div>
      <div style={{ fontSize: 11, fontFamily: "Tahoma, Arial, sans-serif", marginTop: 2, color: "#000000" }}>{a}</div>
    </div>
  );
}

/* ─── Win2K System Tray Clock ─── */
function TaskbarClock() {
  const [time, setTime] = React.useState<string | null>(null);

  React.useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Render placeholder during SSR/hydration
  if (time === null) {
    return <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, minWidth: 50 }}>--:--</span>;
  }

  return (
    <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11 }}>
      {time}
    </span>
  );
}

/* ─── Win2K Video Player Modal ─── */
function WinVideoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 9999, background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="win-window"
        style={{ width: "90%", maxWidth: 720, fontFamily: "Tahoma, Arial, sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div className="win-titlebar select-none">
          <span className="text-xs">📼</span>
          <span className="flex-1 text-xs font-bold">Windows Media Player — Valora AI Demo</span>
          <div className="flex gap-0.5">
            <button className="win-btn" style={{ padding: "0 4px", minWidth: 16, minHeight: 14, fontSize: 9, lineHeight: 1 }}>_</button>
            <button className="win-btn" style={{ padding: "0 4px", minWidth: 16, minHeight: 14, fontSize: 9, lineHeight: 1 }}>□</button>
            <button
              onClick={onClose}
              className="win-btn"
              style={{ padding: "0 4px", minWidth: 16, minHeight: 14, fontSize: 9, lineHeight: 1, background: "#c04040", borderTopColor: "#ff8080", borderLeftColor: "#ff8080" }}
            >
              ✕
            </button>
          </div>
        </div>
        {/* Menu bar */}
        <div className="win-panel flex gap-0" style={{ borderTop: "none", padding: "2px 4px", fontSize: 11 }}>
          {["File", "View", "Play", "Tools", "Help"].map((m) => (
            <button key={m} className="hover:bg-[#0a2470] hover:text-white px-2 py-0.5 text-xs" style={{ background: "none", border: "none", cursor: "default" }}>
              {m}
            </button>
          ))}
        </div>
        {/* Video content */}
        <div className="win-sunken" style={{ margin: 4, background: "#000000" }}>
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
            <iframe
              src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
              title="Valora AI Demo Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
            />
          </div>
        </div>
        {/* Playback controls */}
        <div className="win-panel" style={{ margin: "0 4px 4px", padding: 4 }}>
          <div className="flex items-center gap-2">
            {/* Progress bar */}
            <div className="win-sunken flex-1" style={{ height: 12, background: "#000080", position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "35%", background: "#00ff00" }} />
            </div>
            <span style={{ fontSize: 10, fontFamily: "'Courier New', monospace", color: "#000000" }}>01:23 / 03:32</span>
          </div>
          <div className="flex items-center justify-center gap-1 mt-2">
            <button className="win-btn" style={{ fontSize: 10, padding: "2px 6px" }}>⏮</button>
            <button className="win-btn" style={{ fontSize: 10, padding: "2px 6px" }}>⏪</button>
            <button className="win-btn win-btn-primary" style={{ fontSize: 10, padding: "2px 10px" }}>⏸</button>
            <button className="win-btn" style={{ fontSize: 10, padding: "2px 6px" }}>⏩</button>
            <button className="win-btn" style={{ fontSize: 10, padding: "2px 6px" }}>⏭</button>
            <div style={{ width: 16 }} />
            <span style={{ fontSize: 10 }}>🔊</span>
            <div className="win-sunken" style={{ width: 60, height: 8, background: "#ffffff", position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "70%", background: "#000080" }} />
            </div>
          </div>
        </div>
        {/* Status bar */}
        <div className="win-statusbar flex items-center gap-4">
          <div className="win-sunken" style={{ minWidth: 120, padding: "1px 4px", fontSize: 10 }}>
            Playing
          </div>
          <div className="win-sunken flex-1" style={{ padding: "1px 4px", fontSize: 10 }}>
            Valora AI Demo — Operational Intelligence Platform
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function HomePage() {
  const [tab, setTab] = React.useState<"platform" | "contact" | "faq">("platform");
  const [videoOpen, setVideoOpen] = React.useState(false);

  return (
    <div
      className="win-desktop win-scanlines min-h-screen"
      style={{ padding: "12px", fontFamily: "Tahoma, Arial, sans-serif" }}
    >
      {/* Main Application Window */}
      <WinWindow
        title="Valora AI — Operational Intelligence for Restaurant Operators"
        icon="🖥"
        contentClass="space-y-3"
      >
        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Left: Headline */}
          <WinPanel title="Welcome to Valora AI" className="flex-1">
            {/* "Operational Intelligence" badge */}
            <div
              className="win-sunken inline-block mb-3"
              style={{ background: "#000080", color: "#ffffff", padding: "2px 8px", fontSize: 10, fontFamily: "Tahoma, Arial, sans-serif" }}
            >
              ► Operational intelligence for restaurant operators
            </div>

            <h1
              style={{
                fontSize: 22,
                fontWeight: "bold",
                fontFamily: "Tahoma, Arial, sans-serif",
                color: "#000080",
                lineHeight: 1.3,
                marginBottom: 8,
              }}
            >
              Turn restaurant business data into{" "}
              <span style={{ color: "#c04000" }}>smarter operating decisions</span>
            </h1>

            <p style={{ fontSize: 11, fontFamily: "Tahoma, Arial, sans-serif", color: "#000000", lineHeight: 1.6, marginBottom: 12 }}>
              Valora AI helps operators monitor sales, labor, inventory, and margin in one
              decision-ready workspace — with clear alerts, key drivers, and next actions.
            </p>

            {/* Feature tags */}
            <div className="flex flex-wrap gap-1 mb-4">
              {["Detect profit leaks early", "Control labor costs", "Monitor inventory risk", "Multi-location clarity"].map((f) => (
                <span key={f} className="win-raised" style={{ padding: "2px 6px", fontSize: 10, fontFamily: "Tahoma, Arial, sans-serif" }}>
                  ✓ {f}
                </span>
              ))}
            </div>

            {/* CTA */}
            <div className="flex items-center gap-2">
              <Link href="/signup">
                <button className="win-btn win-btn-primary">
                  ► Start your workspace
                </button>
              </Link>
              <Link href="/signin">
                <button className="win-btn" style={{ fontSize: 11 }}>
                  Login
                </button>
              </Link>
            </div>
          </WinPanel>

          {/* Right: Live Dashboard Widget */}
          <WinWindow
            title="Today&apos;s Operating Health"
            icon="📊"
            className="w-full lg:w-80"
            contentClass=""
          >
            {/* Live indicator */}
            <div className="flex items-center gap-2 mb-2" style={{ padding: "0 4px", paddingTop: 4 }}>
              <span
                className="win-raised win-blink"
                style={{ background: "#008000", color: "#ffffff", fontSize: 9, padding: "1px 5px", fontFamily: "Tahoma, Arial, sans-serif" }}
              >
                ● LIVE
              </span>
              <span style={{ fontSize: 10, color: "#404040", fontFamily: "Tahoma, Arial, sans-serif" }}>
                Real-time data feed active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1 px-1 pb-2">
              <StatTile label="Net Sales" value="$18.4K" note="▲ +6.2% vs prior" noteColor="#800080" />
              <StatTile label="Prime Cost" value="58.4%" note="▲ watch labor drift" noteColor="#800000" />
              <StatTile label="Inventory Risk" value="Low" note="▲ 1 slow-moving category" noteColor="#008000" />
              <div className="win-sunken p-2" style={{ background: "#ffffff" }}>
                <div style={{ fontSize: 10, color: "#404040", fontFamily: "Tahoma, Arial, sans-serif" }}>Next Best Action</div>
                <div style={{ fontSize: 10, fontFamily: "Tahoma, Arial, sans-serif", marginTop: 2, lineHeight: 1.4 }}>
                  Trim next purchase cycle and review weekend labor mix.
                </div>
              </div>
            </div>
          </WinWindow>
        </div>

        {/* Tab Section */}
        <div>
          {/* Tab bar */}
          <div className="flex gap-0" style={{ borderBottom: "2px solid #808080" }}>
            <WinTab active={tab === "platform"} onClick={() => setTab("platform")}>📋 Platform</WinTab>
            <WinTab active={tab === "contact"} onClick={() => setTab("contact")}>📧 Contact</WinTab>
            <WinTab active={tab === "faq"} onClick={() => setTab("faq")}>❓ FAQ</WinTab>
          </div>

          {/* Tab Content */}
          <div className="win-panel" style={{ borderTop: "none", padding: 8 }}>
            {tab === "platform" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <WinPanel title="What Valora AI Does">
                  <p style={{ fontSize: 11, fontFamily: "Tahoma, Arial, sans-serif", marginBottom: 8 }}>
                    Valora helps restaurant operators understand performance, detect risk earlier,
                    and act on the few decisions that actually move margin.
                  </p>
                  {[
                    { title: "See performance clearly", desc: "Bring sales, labor, inventory, and margin into one clean operating view." },
                    { title: "Understand what changed", desc: "Surface the drivers behind movement so operators know what is helping and what is drifting." },
                    { title: "Act with clarity", desc: "Turn daily performance signals into practical next actions for the team." },
                  ].map((item) => (
                    <div key={item.title} className="win-raised p-2 mb-1">
                      <div style={{ fontSize: 11, fontWeight: "bold", color: "#000080", fontFamily: "Tahoma, Arial, sans-serif" }}>► {item.title}</div>
                      <div style={{ fontSize: 11, fontFamily: "Tahoma, Arial, sans-serif", marginTop: 2 }}>{item.desc}</div>
                    </div>
                  ))}
                </WinPanel>

                <WinPanel title="Product Walkthrough">
                  <p style={{ fontSize: 11, fontFamily: "Tahoma, Arial, sans-serif", marginBottom: 8 }}>
                    Click below to watch a demo of how Valora turns business data into action.
                  </p>
                  <button
                    onClick={() => setVideoOpen(true)}
                    className="win-sunken flex flex-col items-center justify-center w-full cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ minHeight: 200, background: "#000000", color: "#00ff00", fontFamily: "\"Courier New\", monospace", border: "none" }}
                  >
                    <div
                      className="win-raised flex items-center justify-center"
                      style={{ width: 56, height: 56, background: "#d4d0c8", borderRadius: 0 }}
                    >
                      <span style={{ fontSize: 24, color: "#000080" }}>▶</span>
                    </div>
                    <div style={{ fontSize: 12, marginTop: 12, color: "#00ff00", fontWeight: "bold" }}>
                      ► PLAY DEMO VIDEO
                    </div>
                    <div style={{ fontSize: 10, marginTop: 4, color: "#00c000" }}>
                      Windows Media Player
                    </div>
                    <div
                      className="win-raised mt-3"
                      style={{ padding: "4px 12px", fontSize: 10, background: "#d4d0c8", color: "#000000" }}
                    >
                      Double-click to open
                    </div>
                  </button>
                </WinPanel>
              </div>
            )}

            {tab === "contact" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <ContactRow label="Email" title="support@valora.ai" subtitle="General product and onboarding support" href="mailto:support@valora.ai" />
                <ContactRow label="LinkedIn" title="Valora AI" subtitle="Company updates and product visibility" href="https://www.linkedin.com/company/valoraai-inc" />
                <ContactRow label="X / Twitter" title="@ValoraAIInc" subtitle="Announcements, launch updates, and insights" href="https://x.com/ValoraAIInc" />
                <ContactRow label="Phone" title="+1 (000) 000-0000" subtitle="Boston, MA · remote-first" />
              </div>
            )}

            {tab === "faq" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <FaqRow q="What does Valora AI help me monitor?" a="Valora is designed to help restaurant operators monitor sales, margin, labor, inventory, and operational risk in one decision-ready view." />
                <FaqRow q="Is it built for one location or many?" a="It is designed to support both individual restaurant operators and growing multi-location teams." />
                <FaqRow q="How do I get started?" a="Create your workspace, choose a plan, and connect or upload business data to generate your first operating view." />
                <FaqRow q="What makes it different from another dashboard?" a="Valora focuses on signals, drivers, and actions — not just charts. The goal is faster, clearer operating decisions." />
              </div>
            )}
          </div>
        </div>
      </WinWindow>

      {/* Win2K Taskbar */}
      <div className="win-taskbar mt-3 rounded-none" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100 }}>
        {/* Start button */}
        <button
          className="win-btn"
          style={{
            background: "linear-gradient(180deg, #3c8c3c 0%, #245024 100%)",
            color: "#ffffff",
            fontWeight: "bold",
            fontSize: 12,
            padding: "3px 10px",
            borderTopColor: "#60c060",
            borderLeftColor: "#60c060",
          }}
        >
          🪟 Start
        </button>

        {/* Separator */}
        <div style={{ width: 2, background: "#404040", height: 20, margin: "0 4px" }} />

        {/* Open "app" in taskbar */}
        <button
          className="win-btn win-tab-active"
          style={{ fontSize: 11, padding: "2px 8px", minWidth: 140, justifyContent: "flex-start", gap: 4 }}
        >
          🖥 Valora AI — Home
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* System tray */}
        <div
          className="win-sunken flex items-center gap-2"
          style={{ background: "#d4d0c8", padding: "2px 8px", fontSize: 10, fontFamily: "Tahoma, Arial, sans-serif" }}
        >
          <span>🔊</span>
          <span>🌐</span>
          <TaskbarClock />
        </div>
      </div>

      {/* Bottom padding for taskbar */}
      <div style={{ height: 40 }} />

      {/* Copyright */}
      <div className="text-center pb-2" style={{ fontSize: 10, fontFamily: "Tahoma, Arial, sans-serif", color: "#ffffff" }}>
        © {new Date().getFullYear()} Valora AI, Inc. All rights reserved. · Best viewed in Internet Explorer 5.0 · 800×600 resolution
      </div>

      {/* Video Modal */}
      <WinVideoModal isOpen={videoOpen} onClose={() => setVideoOpen(false)} />
    </div>
  );
}
