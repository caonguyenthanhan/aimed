import { GoogleGenAI, Modality } from "@google/genai"

export async function geminiTranscribe(opts: {
  apiKey: string
  audioBase64: string
  mimeType: string
  model?: string
}) {
  const ai = new GoogleGenAI({ apiKey: String(opts.apiKey || "").trim() })
  const resp = await ai.models.generateContent({
    model: (typeof opts.model === "string" && opts.model.trim()) ? opts.model.trim() : "gemini-3-flash-preview",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { data: String(opts.audioBase64 || ""), mimeType: String(opts.mimeType || "audio/webm") } },
          { text: "Transcribe the audio exactly as spoken. Return only the transcription." },
        ],
      },
    ],
  } as any)
  const text = String((resp as any)?.text || "").trim()
  return { text }
}

export async function geminiTextToSpeech(opts: {
  apiKey: string
  text: string
  model?: string
  voiceName?: string
}) {
  const ai = new GoogleGenAI({ apiKey: String(opts.apiKey || "").trim() })
  const resp = await ai.models.generateContent({
    model: (typeof opts.model === "string" && opts.model.trim()) ? opts.model.trim() : "gemini-2.5-flash-preview-tts",
    contents: [{ role: "user", parts: [{ text: String(opts.text || "") }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: (typeof opts.voiceName === "string" && opts.voiceName.trim()) ? opts.voiceName.trim() : "Kore" } },
      },
    },
  } as any)
  const b64 = String((resp as any)?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "").trim()
  return { audioBase64: b64 || undefined }
}

