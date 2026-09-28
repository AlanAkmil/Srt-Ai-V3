import { NextRequest, NextResponse } from "next/server";
import { buildSrt } from "@/lib/srt";
import { transcribeAudio, translateSegments } from "@/lib/groq";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const sourceLanguage = (form.get("sourceLanguage") as string) || "auto";
    const targetLanguage = (form.get("targetLanguage") as string) || "";
    const quality = (form.get("quality") as string) || "turbo";

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Tidak ada file audio/video yang dikirim." },
        { status: 400 }
      );
    }

    const model = quality === "akurat" ? "whisper-large-v3" : "whisper-large-v3-turbo";

    const { language, segments } = await transcribeAudio(file, sourceLanguage, model);

    let finalSegments = segments;
    if (targetLanguage && targetLanguage !== language) {
      finalSegments = await translateSegments(segments, targetLanguage);
    }

    const srt = buildSrt(finalSegments);

    return NextResponse.json({
      detectedLanguage: language,
      segments: finalSegments,
      srt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
