export const TEST_USER = {
  email: `e2e-${Date.now()}@shelfie.test`,
  password: 'ShelfieE2E!test99',
}

export const MOCK_ISBN = '9780143127741'

const MOCK_LOOKUP = {
  title: 'The Goldfinch',
  author: 'Donna Tartt',
  language: 'en',
}

/** Skip the first-run onboarding modal if it appears (waits for profile). */
export async function dismissOnboarding(
  page: import('@playwright/test').Page,
) {
  const dialog = page.getByRole('dialog')
  try {
    await dialog.waitFor({ state: 'visible', timeout: 8000 })
  } catch {
    return
  }
  await page.getByRole('button', { name: /^skip$/i }).click()
  await dialog.waitFor({ state: 'hidden', timeout: 10000 })
}

export async function mockBookApis(page: import('@playwright/test').Page) {
  await page.route('**/api/book-lookup**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        title: MOCK_LOOKUP.title,
        author: MOCK_LOOKUP.author,
        isbn: MOCK_ISBN,
        language: MOCK_LOOKUP.language,
        cover_url: 'https://books.google.com/mock-cover.jpg',
        source: 'mock',
      }),
    })
  })

  await page.route('**/*googleapis.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            volumeInfo: {
              title: MOCK_LOOKUP.title,
              authors: [MOCK_LOOKUP.author],
              language: MOCK_LOOKUP.language,
              industryIdentifiers: [
                { type: 'ISBN_13', identifier: MOCK_ISBN },
              ],
              imageLinks: {
                thumbnail: 'https://books.google.com/mock-cover.jpg',
              },
            },
          },
        ],
      }),
    })
  })

  await page.route('**/openlibrary.org/api/books**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        [`ISBN:${MOCK_ISBN}`]: {
          title: MOCK_LOOKUP.title,
          authors: [{ name: MOCK_LOOKUP.author }],
        },
      }),
    })
  })

  await page.route('**/openlibrary.org/search.json**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ docs: [] }),
    })
  })
}
