import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tutornow.app',
  appName: 'TutorNow',
  webDir: 'out',
  server: {
    url: 'https://tutor-now-app-y3bo.vercel.app',
    cleartext: true
  }
};

export default config;
