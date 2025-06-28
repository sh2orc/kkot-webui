import { systemSettingsRepository } from "@/lib/db/repository"
import GeneralSettingsForm from "./general-settings-form"

export default async function GeneralSettingsPage() {
  // SSR로 설정 데이터 가져오기
  const settings = await systemSettingsRepository.findAll()
  
  // 설정을 key-value 객체로 변환
  const settingsMap = settings.reduce((acc: Record<string, string>, setting: any) => {
        acc[setting.key] = setting.value
        return acc
      }, {})
      
  // 빈 설정인 경우 기본값 설정
  if (Object.keys(settingsMap).length === 0) {
    // 기본 설정 저장
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
    
    // 기본 설정을 DB에 저장
    for (const setting of defaultSettings) {
      await systemSettingsRepository.upsert(setting.key, setting.value)
      settingsMap[setting.key] = setting.value
    }
  }
  
  return <GeneralSettingsForm initialSettings={settingsMap} />
} 
