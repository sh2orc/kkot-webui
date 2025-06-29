import { adminSettingsRepository } from "@/lib/db/repository"
import GeneralSettingsForm from "./general-settings-form"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function GeneralSettingsPage() {
  // Fetch settings data with SSR
  const settings = await adminSettingsRepository.findAll()
  
  // Convert settings to key-value object
  const settingsMap = settings.reduce((acc: Record<string, string>, setting: any) => {
        acc[setting.key] = setting.value
        return acc
      }, {})
      
  // Set default values if settings are empty
  if (Object.keys(settingsMap).length === 0) {
    // Save default settings
    const defaultSettings = [
      { key: 'app.name', value: 'kkot-webui' },
      { key: 'auth.signupEnabled', value: 'true' },
      { key: 'auth.apiKeyEnabled', value: 'true' },
      { key: 'auth.apiKeyEndpointLimited', value: 'false' },
      { key: 'auth.jwtExpiry', value: '-1' },
      { key: 'auth.ldapEnabled', value: 'false' },
      { key: 'auth.ldap.label', value: 'LDAP Server' },
      { key: 'auth.ldap.host', value: 'localhost' },
      { key: 'auth.ldap.port', value: '389' },
      { key: 'auth.ldap.mailAttr', value: 'mail' },
      { key: 'auth.ldap.usernameAttr', value: 'uid' },
      { key: 'auth.oauth.google.enabled', value: 'false' },
      { key: 'auth.oauth.microsoft.enabled', value: 'false' },
      { key: 'auth.oauth.kakao.enabled', value: 'false' },
      { key: 'auth.oauth.naver.enabled', value: 'false' },
      { key: 'auth.oauth.github.enabled', value: 'false' },
    ]
    
    // Save default settings to DB
    for (const setting of defaultSettings) {
      await adminSettingsRepository.upsert(setting.key, setting.value)
      settingsMap[setting.key] = setting.value
    }
  }
  
  return <GeneralSettingsForm initialSettings={settingsMap} />
} 
