/** Curated set of common book languages with a representative flag. */
export type LanguageOption = {
  code: string
  name: string
  native: string
  flag: string
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇵🇹' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', native: 'Svenska', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', native: 'Norsk', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', native: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', native: 'Suomi', flag: '🇫🇮' },
  { code: 'pl', name: 'Polish', native: 'Polski', flag: '🇵🇱' },
  { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська', flag: '🇺🇦' },
  { code: 'cs', name: 'Czech', native: 'Čeština', flag: '🇨🇿' },
  { code: 'el', name: 'Greek', native: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
  { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
  { code: 'he', name: 'Hebrew', native: 'עברית', flag: '🇮🇱' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', native: '中文', flag: '🇨🇳' },
  { code: 'th', name: 'Thai', native: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'hu', name: 'Hungarian', native: 'Magyar', flag: '🇭🇺' },
  { code: 'ro', name: 'Romanian', native: 'Română', flag: '🇷🇴' },
  { code: 'other', name: 'Other', native: 'Other', flag: '🌐' },
]

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]))

/** Map MARC / 3-letter codes (used by Open Library) to our 2-letter codes. */
const MARC_TO_ISO: Record<string, string> = {
  eng: 'en',
  spa: 'es',
  fre: 'fr',
  fra: 'fr',
  ger: 'de',
  deu: 'de',
  ita: 'it',
  por: 'pt',
  dut: 'nl',
  nld: 'nl',
  swe: 'sv',
  nor: 'no',
  dan: 'da',
  fin: 'fi',
  pol: 'pl',
  rus: 'ru',
  ukr: 'uk',
  cze: 'cs',
  ces: 'cs',
  gre: 'el',
  ell: 'el',
  tur: 'tr',
  ara: 'ar',
  heb: 'he',
  hin: 'hi',
  jpn: 'ja',
  kor: 'ko',
  chi: 'zh',
  zho: 'zh',
  tha: 'th',
  vie: 'vi',
  ind: 'id',
  hun: 'hu',
  rum: 'ro',
  ron: 'ro',
}

/** Normalize an arbitrary language string/code to one of our option codes. */
export function normalizeLanguageCode(input?: string | null): string {
  if (!input) return ''
  const raw = input.trim().toLowerCase()
  const short = raw.split(/[-_]/)[0]
  if (BY_CODE.has(short)) return short
  if (MARC_TO_ISO[raw]) return MARC_TO_ISO[raw]
  if (MARC_TO_ISO[short]) return MARC_TO_ISO[short]
  return short || 'other'
}

export function getLanguage(code?: string | null): LanguageOption | undefined {
  if (!code) return undefined
  return BY_CODE.get(normalizeLanguageCode(code))
}
