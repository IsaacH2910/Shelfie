import { LANGUAGES } from '@/lib/languages'

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
  'zh-Hans': 'chi_sim',
  'zh-Hant': 'chi_tra',
  th: 'tha',
  vi: 'vie',
  id: 'ind',
  hu: 'hun',
  ro: 'ron',
}

/**
 * Practical multi-script pack for unknown / mixed covers.
 * Kept small so the first download finishes reliably on mobile.
 */
export const AUTO_OCR_TESSERACT = 'eng+chi_sim+chi_tra+jpn'

export type OcrLanguageOption = {
  code: string
  tesseract: string
  label: string
}

/** Non-Latin packs also include eng for bilingual covers. */
function withEnglishFallback(pack: string): string {
  if (pack === 'eng' || pack.includes('+')) return pack
  return `${pack}+eng`
}

export const OCR_LANGUAGES: OcrLanguageOption[] = [
  {
    code: 'auto',
    tesseract: AUTO_OCR_TESSERACT,
    label: 'Auto (EN · 中文 · 日本語)',
  },
  ...LANGUAGES.filter((language) => language.code !== 'other')
    .map((language) => {
      const pack = APP_TO_TESSERACT[language.code]
      if (!pack) return null
      return {
        code: language.code,
        tesseract: withEnglishFallback(pack),
        label: `${language.name} · ${language.native}`,
      } satisfies OcrLanguageOption
    })
    .filter((option): option is OcrLanguageOption => option !== null),
]

/** Resolve a Tesseract language pack from an app language code or browser locale. */
export function resolveTesseractLanguage(
  appLanguage?: string | null,
): string {
  if (appLanguage) {
    const mapped = APP_TO_TESSERACT[appLanguage]
    if (mapped) return withEnglishFallback(mapped)
  }
  const browser = navigator.language.toLowerCase()
  if (browser.startsWith('zh-tw') || browser.startsWith('zh-hk')) {
    return withEnglishFallback('chi_tra')
  }
  if (browser.startsWith('zh')) return withEnglishFallback('chi_sim')
  const short = browser.split('-')[0]
  const pack = APP_TO_TESSERACT[short]
  return pack ? withEnglishFallback(pack) : AUTO_OCR_TESSERACT
}
