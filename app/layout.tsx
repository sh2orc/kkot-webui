import './globals.css'
import ClientProviders from '@/components/providers/client-providers'
import GlobalLayout from '@/components/layout/global-layout'
import { Metadata, Viewport } from 'next'
import { adminSettingsRepository } from '@/lib/db/server'

// Function to fetch branding settings from the server
async function getBrandingSettings() {
  try {
    const appNameSetting = await adminSettingsRepository.findByKey('app.name')
    const appName = appNameSetting && appNameSetting.length > 0 ? appNameSetting[0].value : 'KKOT WebUI'
    return { appName }
  } catch (error) {
    console.warn('Failed to fetch branding settings:', error)
    return { appName: 'kkot webui' }
  }
}

// Generate dynamic metadata
export async function generateMetadata(): Promise<Metadata> {
  const { appName } = await getBrandingSettings()
  
  return {
    title: appName,
    description: `${appName} is an open-source UI project designed to provide a seamless user interface for interacting with large language models (LLMs).`,
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClientProviders>
          <GlobalLayout>
            {children}
          </GlobalLayout>
        </ClientProviders>
      </body>
    </html>
  )
}
