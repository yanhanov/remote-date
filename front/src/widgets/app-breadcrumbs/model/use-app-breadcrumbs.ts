import { computed } from "vue"
import { useRoute } from "vue-router"

export type BreadcrumbItem = {
  label: string
  to?: string
}

export function useAppBreadcrumbs() {
  const route = useRoute()

  const items = computed<BreadcrumbItem[]>(() => {
    const path = route.path

    if (path === "/") {
      return [{ label: "Home" }]
    }

    const crumbs: BreadcrumbItem[] = [{ label: "Home", to: "/" }]

    if (path === "/about") {
      crumbs.push({ label: "About" })
      return crumbs
    }

    if (path === "/youtube") {
      crumbs.push({ label: "YouTube" })
      return crumbs
    }

    if (path.startsWith("/room/")) {
      crumbs.push({ label: "YouTube", to: "/youtube" })
      crumbs.push({ label: "Room" })
      return crumbs
    }

    if (path === "/soundcloud") {
      crumbs.push({ label: "SoundCloud" })
      return crumbs
    }

    if (path.startsWith("/sound-room/")) {
      crumbs.push({ label: "SoundCloud", to: "/soundcloud" })
      crumbs.push({ label: "Room" })
      return crumbs
    }

    if (path === "/profile") {
      crumbs.push({ label: "Profile" })
      return crumbs
    }

    if (path === "/friends") {
      crumbs.push({ label: "Friends" })
      return crumbs
    }

    if (path === "/messages") {
      crumbs.push({ label: "Messages" })
      return crumbs
    }

    crumbs.push({ label: "Page" })
    return crumbs
  })

  return { items }
}
