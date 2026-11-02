// Coach languages: `name` goes to Gemini, `bcp` drives speech recognition / synthesis, `label` is shown natively.
export const LANGS = [
  { id: "auto", label: "Auto — match my question", name: "", bcp: "" },
  { id: "en", label: "English", name: "English", bcp: "en-US" },
  { id: "hi", label: "हिन्दी (Hindi)", name: "Hindi", bcp: "hi-IN" },
  { id: "es", label: "Español", name: "Spanish", bcp: "es-ES" },
  { id: "pt", label: "Português", name: "Brazilian Portuguese", bcp: "pt-BR" },
  { id: "fr", label: "Français", name: "French", bcp: "fr-FR" },
  { id: "ar", label: "العربية (Arabic)", name: "Arabic", bcp: "ar-SA" },
  { id: "de", label: "Deutsch", name: "German", bcp: "de-DE" },
  { id: "id", label: "Bahasa Indonesia", name: "Indonesian", bcp: "id-ID" },
  { id: "sw", label: "Kiswahili", name: "Swahili", bcp: "sw-KE" },
  { id: "yo", label: "Yorùbá", name: "Yoruba", bcp: "yo-NG" },
  { id: "bn", label: "বাংলা (Bengali)", name: "Bengali", bcp: "bn-IN" },
  { id: "ta", label: "தமிழ் (Tamil)", name: "Tamil", bcp: "ta-IN" },
  { id: "mr", label: "मराठी (Marathi)", name: "Marathi", bcp: "mr-IN" },
  { id: "ja", label: "日本語", name: "Japanese", bcp: "ja-JP" },
  { id: "ko", label: "한국어", name: "Korean", bcp: "ko-KR" },
  { id: "zh", label: "中文", name: "Simplified Chinese", bcp: "zh-CN" },
  { id: "tl", label: "Tagalog", name: "Tagalog", bcp: "fil-PH" },
] as const;

export type LangId = (typeof LANGS)[number]["id"];
export const langById = (id?: string) => LANGS.find((l) => l.id === id) || LANGS[0];
