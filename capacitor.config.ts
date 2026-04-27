import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor 7 config — wrap the Next.js app in native iOS/Android shells.
 *
 * Build flow:
 *   1. `npm run build:mobile` — Next static export → `out/` dir
 *   2. `npx cap sync` — copies out/ + plugins to ios/android projects
 *   3. `npx cap open ios` / `cap open android` — abre Xcode / Android Studio
 *
 * Server URL é null por design — em produção o app carrega o bundle local.
 * Pra dev rápido com hot reload, descomente `server.url` apontando pro
 * `npm run dev` (precisa estar na mesma rede).
 */
const config: CapacitorConfig = {
  appId: 'com.mindpractice.app',
  appName: 'MindPractice',
  webDir: 'out',

  // server: {
  //   url: 'http://192.168.1.100:3000', // troca pro IP da sua máquina dev
  //   cleartext: true,
  // },

  ios: {
    contentInset: 'always',
    backgroundColor: '#0a0a0f',
  },
  android: {
    backgroundColor: '#0a0a0f',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0a0a0f',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#d4af37',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0f',
    },
  },
};

export default config;
