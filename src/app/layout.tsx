import "./globals.css"
import "./integration-app.css"
import { ThemeProvider } from "@/app/providers"
import { Header } from "@/components/header"
import { inter } from "@/app/fonts"
import { IntegrationProvider } from "./integration-provider"
import { AuthProvider } from "./auth-provider"
import { MembraneProviderWrapper } from "./membrane-provider"

export const metadata = {
  title: {
    default: "Use Case Template",
    template: "%s | Use Case Template",
  },
  description: "Integration.app use case template application",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <IntegrationProvider>
              <MembraneProviderWrapper>
                <Header />
                <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                  {children}
                </main>
              </MembraneProviderWrapper>
            </IntegrationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
