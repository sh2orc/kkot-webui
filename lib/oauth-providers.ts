// 커스텀 Kakao OAuth Provider
export function KakaoProvider(options: any) {
  return {
    id: 'kakao',
    name: 'Kakao',
    type: 'oauth',
    version: '2.0',
    authorization: {
      url: 'https://kauth.kakao.com/oauth/authorize',
      params: {
        scope: 'profile_nickname profile_image account_email',
      },
    },
    token: 'https://kauth.kakao.com/oauth/token',
    userinfo: 'https://kapi.kakao.com/v2/user/me',
    profile(profile: any) {
      return {
        id: String(profile.id),
        name: profile.kakao_account?.profile?.nickname || profile.properties?.nickname,
        email: profile.kakao_account?.email,
        image: profile.kakao_account?.profile?.profile_image_url || profile.properties?.profile_image,
      };
    },
    clientId: options.clientId,
    clientSecret: options.clientSecret,
  };
}

// 커스텀 Naver OAuth Provider
export function NaverProvider(options: any) {
  return {
    id: 'naver',
    name: 'Naver',
    type: 'oauth',
    version: '2.0',
    authorization: {
      url: 'https://nid.naver.com/oauth2.0/authorize',
      params: {
        response_type: 'code',
        state: 'random_state',
      },
    },
    token: 'https://nid.naver.com/oauth2.0/token',
    userinfo: 'https://openapi.naver.com/v1/nid/me',
    profile(profile: any) {
      return {
        id: profile.response.id,
        name: profile.response.name || profile.response.nickname,
        email: profile.response.email,
        image: profile.response.profile_image,
      };
    },
    clientId: options.clientId,
    clientSecret: options.clientSecret,
  };
}
