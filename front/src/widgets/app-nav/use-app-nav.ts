import { useRoute } from 'vue-router'

export function useAppNav() {
  const route = useRoute()

  function isNavActive(url: string): boolean {
    const path = route.path

    if (url === '/') return path === '/'
    if (url === '/youtube')
      return path === '/youtube' || path.startsWith('/room/')
    if (url === '/soundcloud')
      return path === '/soundcloud' || path.startsWith('/sound-room/')
    if (url === '/messages')
      return path === '/messages' || path.startsWith('/messages/')

    return path === url || path.startsWith(`${url}/`)
  }

  return { isNavActive }
}
