# Outlet Admin App

This app is the web surface for outlet operators. Keep workflows outlet-scoped and avoid platform-wide super-admin assumptions.

Native POS capabilities, such as thermal printing, should go through `src/lib/native-bridge.ts` so the app can run both in a browser and inside a Flutter wrapper.
