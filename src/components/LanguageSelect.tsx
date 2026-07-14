import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LANGUAGES } from '@/lib/languages'

export function LanguageSelect({
  value,
  onChange,
  id,
}: {
  value: string
  onChange: (value: string) => void
  id?: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="Select language" />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((language) => (
          <SelectItem key={language.code} value={language.code}>
            <span className="mr-2" aria-hidden>
              {language.flag}
            </span>
            {language.name}
            {language.native !== language.name ? (
              <span className="ml-1.5 text-muted-foreground">
                {language.native}
              </span>
            ) : null}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
