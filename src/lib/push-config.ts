// Only this explicitly selected, public configuration is returned to browsers.
export function publicPushConfig() {
  return {
    apiKey: process.env.FIREBASE_WEB_API_KEY || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_WEB_APP_ID || '',
  };
}

export function pushConfigured() {
  return process.env.WEB_PUSH_ENABLED === 'true'
    && Object.values(publicPushConfig()).every(Boolean)
    && Boolean(process.env.FIREBASE_WEB_VAPID_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
}
