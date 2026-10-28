import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Reset Password — Demo Davpay",
  description: "Demo formulir konfirmasi akun Davpay.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
