import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { parseCifraClubHtml } from './cifraclub-parser'

export const getCifraClubSong = createServerFn({ method: 'GET' })
  .validator((data: unknown) => {
    return z
      .object({
        url: z.string().url(),
      })
      .parse(data)
  })
  .handler(async ({ data }) => {
    const response = await fetch(data.url)
    if (!response.ok) {
      throw new Error('Falha ao buscar cifra no Cifra Club')
    }
    const html = await response.text()
    return { html }
  })

export const importCifraClub = createServerFn({ method: 'GET' })
  .validator((data: unknown) => {
    return z
      .object({
        url: z.string().url(),
      })
      .parse(data)
  })
  .handler(async ({ data }) => {
    const response = await fetch(data.url)
    if (!response.ok) {
      throw new Error('Falha ao buscar cifra no Cifra Club')
    }
    const html = await response.text()
    const { data: importado } = parseCifraClubHtml(html)
    return importado
  })