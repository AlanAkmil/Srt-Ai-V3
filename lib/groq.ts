import type { SubtitleSegment } from "./srt";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

type GroqVerboseSegment = {
  start: number;
  end: number;
  text: string;
};

type GroqTranscriptionResponse = {
  text: string;
  language?: string;
  segments?: GroqVerboseSegment[];
};

export async function transcribeAudio(
  file: File,
  sourceLanguage: string | undefined,
  model: "whisper-large-v3" | "whisper-large-v3-turbo"
): Promise<{ language: string; segments: SubtitleSegment[] }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY belum diset di environment.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("model", model);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  if (sourceLanguage && sourceLanguage !== "auto") {
    form.append("language", sourceLanguage);
  }

  const res = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq transcription gagal (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as GroqTranscriptionResponse;
  const rawSegments = data.segments ?? [];

  const segments: SubtitleSegment[] = rawSegments.map((seg, i) => ({
    id: i,
    start: seg.start,
    end: seg.end,
    text: seg.text.trim(),
  }));

  return { language: data.language ?? sourceLanguage ?? "auto", segments };
}

const TRANSLATE_BATCH_SIZE = 40;

export async function translateSegments(
  segments: SubtitleSegment[],
  targetLanguage: string
): Promise<SubtitleSegment[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY belum diset di environment.");
  }

  const batches: SubtitleSegment[][] = [];
  for (let i = 0; i < segments.length; i += TRANSLATE_BATCH_SIZE) {
    batches.push(segments.slice(i, i + TRANSLATE_BATCH_SIZE));
  }

  const translatedBatches = await Promise.all(
    batches.map((batch) => translateBatch(batch, targetLanguage, apiKey))
  );

  return translatedBatches.flat();
}

async function translateBatch(
  batch: SubtitleSegment[],
  targetLanguage: string,
  apiKey: string
): Promise<SubtitleSegment[]> {
  const payload = batch.map((s) => ({ id: s.id, text: s.text }));

  const prompt = [
    `Terjemahkan setiap baris dialog berikut ke bahasa "${targetLanguage}".`,
    "Ini teks subtitle untuk tayangan yang diucapkan, jadi terjemahkan secara natural dan seringkas mungkin agar pas dibaca dalam waktu singkat.",
    "Jangan tambah atau kurangi jumlah baris. Balas HANYA dengan JSON array, tidak ada teks lain, dengan bentuk persis:",
    `[{"id": number, "text": string}, ...]`,
    "Data:",
    JSON.stringify(payload),
  ].join("\n");

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq translate gagal (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "[]";
  const jsonStart = raw.indexOf("[");
  const jsonEnd = raw.lastIndexOf("]");
  const cleaned = raw.slice(jsonStart, jsonEnd + 1);

  const translated = JSON.parse(cleaned) as { id: number; text: string }[];
  const byId = new Map(translated.map((t) => [t.id, t.text]));

  return batch.map((s) => ({ ...s, text: byId.get(s.id) ?? s.text }));
}
