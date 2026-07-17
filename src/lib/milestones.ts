/** Lightweight milestone celebration without extra dependencies. */

export function celebrateMilestone(kind: 'finish' | 'goal' = 'finish') {
  if (typeof document === 'undefined') return
  const root = document.createElement('div')
  root.className = 'shelfie-confetti'
  root.setAttribute('aria-hidden', 'true')
  root.dataset.kind = kind

  const colors =
    kind === 'goal'
      ? ['#7c6af5', '#f5c542', '#34d399', '#f472b6', '#60a5fa']
      : ['#7c6af5', '#a78bfa', '#34d399', '#fbbf24']

  for (let i = 0; i < 28; i++) {
    const piece = document.createElement('span')
    piece.className = 'shelfie-confetti-piece'
    piece.style.setProperty('--x', `${(Math.random() - 0.5) * 160}vw`)
    piece.style.setProperty('--y', `${40 + Math.random() * 50}vh`)
    piece.style.setProperty('--r', `${Math.random() * 720 - 360}deg`)
    piece.style.setProperty('--delay', `${Math.random() * 120}ms`)
    piece.style.background = colors[i % colors.length]
    root.appendChild(piece)
  }

  document.body.appendChild(root)
  window.setTimeout(() => root.remove(), 1600)
}
