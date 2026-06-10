"use client"

import { useEffect, use } from "react"
import { useRouter } from "next/navigation"

export default function LocaleCatchAllPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>
}) {
  const { slug } = use(params)
  const router = useRouter()

  useEffect(() => {
    const target = `/${Array.isArray(slug) ? slug.join("/") : ""}`
    router.replace(target === "/" ? "/" : target)
  }, [router, slug])

  return null
}

