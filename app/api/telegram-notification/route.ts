import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const REQUEST_COOLDOWN_MS = 30_000
const recentRequests = new Map<string, number>()

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return false

  try {
    const originUrl = new URL(origin)
    if (originUrl.protocol !== "https:" && originUrl.protocol !== "http:") return false

    const forwardedHosts = [
      request.headers.get("x-forwarded-host"),
      request.headers.get("host"),
      request.headers.get("x-vercel-deployment-url"),
      process.env.VERCEL_URL,
    ]

    const allowedHosts = forwardedHosts
      .flatMap((value) => value?.split(",") ?? [])
      .map((value) => value.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "").toLowerCase())
      .filter(Boolean)

    return allowedHosts.includes(originUrl.host.toLowerCase())
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 })
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    return NextResponse.json({ error: "Notifikasi belum dikonfigurasi." }, { status: 503 })
  }

  const forwardedFor = request.headers.get("x-forwarded-for")
  const clientKey = forwardedFor?.split(",")[0]?.trim() || "unknown"
  const now = Date.now()
  const lastRequest = recentRequests.get(clientKey)

  if (lastRequest && now - lastRequest < REQUEST_COOLDOWN_MS) {
    return NextResponse.json({ error: "Coba lagi sebentar." }, { status: 429 })
  }

  for (const [key, timestamp] of recentRequests) {
    if (now - timestamp >= REQUEST_COOLDOWN_MS) recentRequests.delete(key)
  }
  recentRequests.set(clientKey, now)

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "Notifikasi: formulir demo telah dikonfirmasi. Tidak ada nama atau isi formulir yang dikirim.",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    })

    if (!telegramResponse.ok) {
      return NextResponse.json({ error: "Notifikasi gagal dikirim. Silakan coba lagi." }, { status: 502 })
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "Notifikasi gagal dikirim. Silakan coba lagi." }, { status: 502 })
  }
}
