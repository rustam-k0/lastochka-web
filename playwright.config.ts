import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./tests',
  testMatch:'**/*.e2e.ts',
  timeout:45_000,
  expect:{timeout:10_000},
  use:{baseURL:'http://127.0.0.1:3000',trace:'retain-on-failure'},
  projects:[
    {name:'mobile-chromium',use:{browserName:'chromium',viewport:{width:390,height:844}}},
    {name:'desktop-chromium',use:{browserName:'chromium',viewport:{width:1440,height:1000}}},
  ],
  webServer:{
    command:'SESSION_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef PUBLIC_ORIGIN=http://127.0.0.1:3000 DEFAULT_STORE_ID=2 CHECKOUT_ENABLED=false npm start',
    url:'http://127.0.0.1:3000',
    reuseExistingServer:true,
    timeout:60_000,
  },
});
