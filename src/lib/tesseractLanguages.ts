/** Map app language codes to Tesseract traineddata pack names. */
const APP_TO_TESSERACT: Record<string, string> = {
  en: 'eng',
  es: 'spa',
  fr: 'fra',
  de: 'deu',
  it: 'ita',
  pt: 'por',
  nl: 'nld',
  sv: 'swe',
  no: 'nor',
  da: 'dan',
  fi: 'fin',
  pl: 'pol',
  ru: 'rus',
  uk: 'ukr',
  cs: 'ces',
  el: 'ell',
  tr: 'tur',
  ar: 'ara',
  he: 'heb',
  hi: 'hin',
  ja: 'jpn',
  ko: 'kor',
  zh: 'chi_sim',
  th: 'tha',
  vi: 'vie',
  id: 'ind',
  hu: 'hun',
  ro: 'ron',
}

export type OcrLanguageOption = {
  code: string
  tesseract: string
  label: string
}

export const OCR_LANGUAGES: OcrLanguageOption[] = [
  { code: 'en', tesseract: 'eng', label: 'English' },
  { code: 'zh', tesseract: 'chi_sim', label: 'Chinese (Simplified)' },
  { code: 'ja', tesseract: 'jpn', label: 'Japanese' },
  { code: 'ko', tesseract: 'kor', label: 'Korean' },
  { code: 'fr', tesseract: 'fra', label: 'French' },
  { code: 'de', tesseract: 'deu', label: 'German' },
  { code: 'es', tesseract: 'spa', label: 'Spanish' },
  { code: 'it', tesseract: 'ita', label: 'Italian' },
  { code: 'pt', tesseract: 'por', label: 'Portuguese' },
  { code: 'ru', tesseract: 'rus', label: 'Russian' },
  { code: 'ar', tesseract: 'ara', label: 'Arabic' },
  { code: 'hi', tesseract: 'hin', label: 'Hindi' },
  { code: 'th', tesseract: 'tha', label: 'Thai' },
  { code: 'vi', tesseract: 'vie', label: 'Vietnamese' },
]

/** Resolve a Tesseract language pack from an app language code or browser locale. */
export function resolveTesseractLanguage(
  appLanguage?: string | null,
): string {
  if (appLanguage) {
    const mapped = APP_TO_TESSERACT[appLanguage]
    if (mapped) return mapped
  }
  const browser = navigator.language.split('-')[0].toLowerCase()
  return APP_TO_TESSERACT[browser] ?? 'eng'
}
