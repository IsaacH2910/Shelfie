/** Deterministic shelf accent color from the shelf name (no DB column needed). */

export function shelfAccent(name: string): {
  hue: number
  css: string
  soft: string
  border: string
} {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 33 + name.charCodeAt(i)) % 360
  }
  const hue = hash
  return {
    hue,
    css: `hsl(${hue} 48% 46%)`,
    soft: `hsl(${hue} 42% 92%)`,
    border: `hsl(${hue} 40% 72%)`,
  }
}
