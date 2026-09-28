"use client";

import { useEffect, useRef, useState } from "react";

type Segment = { id: number; start: number; end: number; text: string };

const LANGUAGES = [
  { code: "id", label: "Indonesia" },
  { code: "en", label: "Inggris" },
  { code: "ja", label: "Jepang" },
  { code: "ko", label: "Korea" },
  { code: "zh", label: "Mandarin" },
  { code: "ms", label: "Melayu" },
  { code: "th", label: "Thailand" },
  { code: "vi", label: "Vietnam" },
  { code: "es", label: "Spanyol" },
  { code: "fr", label: "Prancis" },
  { code: "ar", label: "Arab" },
  { code: "hi", label: "Hindi" },
];

const WAVE_BARS = [6, 14, 9, 22, 12, 30, 18, 26, 10, 20, 8, 24, 14, 32, 16, 10, 22, 12, 18, 8];

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatSegmentTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [quality, setQuality] = useState<"cepat" | "akurat">("cepat");
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [srt, setSrt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === "working") {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  function handleFilePicked(picked: File | null) {
    setFile(picked);
    setStatus("idle");
    setError("");
    setSegments([]);
    setSrt("");
  }

  async function handleSubmit() {
    if (!file) return;
    setStatus("working");
    setError("");

    const form = new FormData();
    form.append("file", file);
    form.append("sourceLanguage", sourceLanguage);
    form.append("targetLanguage", targetLanguage);
    form.append("quality", quality);

    try {
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat subtitle.");
      setSegments(data.segments);
      setSrt(data.srt);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat subtitle.");
      setStatus("error");
    }
  }

  function handleDownload() {
    const blob = new Blob([srt], { type: "text/srt" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file?.name.replace(/\.[^/.]+$/, "") || "subtitle"}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="mx-auto max-w-2xl px-6 pt-16 pb-10">
        <div className="flex items-end gap-[3px] h-16 mb-8">
          {WAVE_BARS.map((h, i) => (
            <div
              key={i}
              className="w-[5px] rounded-full bg-teal/70"
              style={{
                height: `${h * 3}px`,
                animation: `wave-rise 600ms ease-out ${i * 25}ms both`,
              }}
            />
          ))}
        </div>
        <h1 className="font-display text-4xl leading-[1.15] text-paper">
          Tayangan tanpa subtitle, <em className="italic text-amber">sekarang punya teks.</em>
        </h1>
        <p className="mt-4 text-muted text-[15px] leading-relaxed max-w-[36ch]">
          Upload audio atau video — donghua, film, apa saja yang belum ada subtitlenya.
          Dengarkan ucapannya, cocokkan waktunya, dan unduh file .srt siap pakai.
        </p>
      </section>

      {/* Upload deck */}
      <section className="mx-auto max-w-2xl px-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) handleFilePicked(dropped);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragOver ? "border-amber bg-surface2" : "border-line bg-surface"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*"
            className="hidden"
            onChange={(e) => handleFilePicked(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <p className="font-mono text-sm text-teal">{file.name}</p>
          ) : (
            <>
              <p className="text-paper text-[15px]">Taruh file di sini, atau ketuk untuk pilih</p>
              <p className="mt-1 text-muted text-xs">MP3, WAV, MP4, MKV — sampai 25MB per file</p>
            </>
          )}
        </div>

        {/* Mode */}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button className="rounded-md border border-amber bg-surface2 px-4 py-3 text-left">
            <span className="block text-paper text-sm font-medium">Hanya .srt</span>
            <span className="block text-muted text-xs mt-0.5">File subtitle, cepat</span>
          </button>
          <button
            disabled
            className="rounded-md border border-line px-4 py-3 text-left opacity-50 cursor-not-allowed"
          >
            <span className="flex items-center gap-1.5 text-paper text-sm font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" /> Hardsub
            </span>
            <span className="block text-muted text-xs mt-0.5">Segera hadir</span>
          </button>
        </div>

        {/* Options */}
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1.5">Kualitas</label>
            <div className="flex gap-2">
              {(["cepat", "akurat"] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`rounded-full px-4 py-1.5 text-sm border ${
                    quality === q
                      ? "border-amber text-amber"
                      : "border-line text-muted"
                  }`}
                >
                  {q === "cepat" ? "Cepat" : "Akurat"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1.5">Bahasa asli</label>
            <select
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-paper"
            >
              <option value="auto">Deteksi otomatis</option>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1.5">Terjemahkan ke</label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-paper"
            >
              <option value="">Sama seperti bahasa aslinya</option>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.label}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!file || status === "working"}
          className="mt-6 w-full rounded-md bg-amber py-3 text-ink font-medium disabled:opacity-40"
        >
          {status === "working" ? "Memproses..." : "Buat subtitle"}
        </button>

        {status === "working" && (
          <p className="mt-3 text-center font-mono text-sm text-teal">
            Mendengarkan audio... {formatClock(elapsed)}
          </p>
        )}
        {status === "error" && (
          <p className="mt-3 text-center text-sm text-amber">{error}</p>
        )}
      </section>

      {/* Result timeline */}
      {status === "done" && (
        <section className="mx-auto max-w-2xl px-6 mt-12 pb-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-paper">Subtitle jadi</h2>
            <button
              onClick={handleDownload}
              className="text-sm text-amber border border-amber rounded-md px-3 py-1.5"
            >
              Unduh .srt
            </button>
          </div>
          <div className="rounded-lg border border-line overflow-hidden">
            {segments.map((seg, i) => (
              <div
                key={seg.id}
                className={`flex gap-4 px-4 py-3 border-l-2 border-amber/60 ${
                  i % 2 === 0 ? "bg-surface" : "bg-surface2"
                }`}
              >
                <span className="font-mono text-xs text-muted shrink-0 pt-0.5">
                  {formatSegmentTime(seg.start)}
                </span>
                <span className="text-sm text-paper leading-snug">{seg.text}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <style>{`
        @keyframes wave-rise {
          from { transform: scaleY(0); opacity: 0; }
          to { transform: scaleY(1); opacity: 1; }
        }
        div.flex.items-end > div { transform-origin: bottom; }
      `}</style>
    </main>
  );
}
