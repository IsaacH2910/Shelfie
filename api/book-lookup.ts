import type { VercelRequest, VercelResponse } from '@vercel/node'
import { lookupIsbnServer } from './_lib/isbnLookup'

export { lookupIsbnServer }

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const isbn = String(req.query.isbn ?? '')
  if (!isbn) {
    res.status(400).json({ error: 'Missing isbn' })
    return
  }

  try {
    const result = await lookupIsbnServer(isbn)
    if (!result) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.status(200).json(result)
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Lookup failed',
    })
  }
}
