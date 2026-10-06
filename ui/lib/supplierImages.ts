// Bundle the checked-in CSV images so GitHub HTML links work offline and in builds.
const images = import.meta.glob<string>('../../data/images/*.jpeg', {
  eager: true, query: '?url', import: 'default',
})
export function supplierImageUrl(value: string | null | undefined): string | null {
  if (!value || value === 'NA') return null
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    if (url.hostname === 'github.com' && url.pathname.startsWith('/CS3219-AY2627S1/FoC-Template/blob/main/data/images/')) {
      const name = url.pathname.split('/').pop()
      return images[`../../data/images/${name}`] || null
    }
    return url.href
  } catch { return null }
}
