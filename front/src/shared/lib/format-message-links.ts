export type MessageSegment =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string; href: string }

const URL_PATTERN = /https?:\/\/[^\s<]+[^\s<.,;:!?)]/g

export function splitMessageLinks(text: string): MessageSegment[] {
  const segments: MessageSegment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(URL_PATTERN)) {
    const href = match[0]
    const index = match.index ?? 0

    if (index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, index) })
    }

    segments.push({ type: 'link', value: href, href })
    lastIndex = index + href.length
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return segments.length ? segments : [{ type: 'text', value: text }]
}
