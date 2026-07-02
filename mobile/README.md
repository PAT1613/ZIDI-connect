# ZIDI Connect — Mobile

React Native (Expo SDK 56) companion app for ZIDI Connect. Talks to the same Django backend as the web frontend (`../frontend`). TypeScript throughout. File-based routing via expo-router. Styling via NativeWind (the web app's Tailwind palette is ported in `tailwind.config.js`).

## Stack

- Expo SDK 56 + expo-router (file-based, `src/app/`)
- TypeScript, NativeWind v4 (Tailwind 3.4)
- TanStack Query (`@tanstack/react-query`)
- Axios (JWT bearer, single-flight 401 refresh)
- `expo-secure-store` for tokens (NOT AsyncStorage — credentials)
- `react-hook-form` + `zod`
- `react-native-gifted-charts` for dashboard charts
- `expo-file-system` + `expo-sharing` for report exports
- `react-native-toast-message` for toasts
- `lucide-react-native` for icons

## Project layout (parallel to `frontend/src/`)

```
mobile/
  src/
    app/                  # expo-router screens (file-based)
      _layout.tsx         # root: providers (QueryClient, AuthProvider, Toast)
      index.tsx           # entry — redirects to (tabs) or (auth)/login
      (auth)/
        _layout.tsx
        login.tsx
      (tabs)/
        _layout.tsx
        index.tsx         # Dashboard
        settings.tsx
    api/                  # one module per resource — mirrors frontend/src/api/
      client.ts           # axios + interceptors + single-flight refresh + extractError
      auth.ts customers.ts services.ts subscriptions.ts
      invoices.ts payments.ts communications.ts notifications.ts
      escalations.ts users.ts audit.ts reports.ts integrations.ts
      types.ts
    components/ui/        # Button, Input, Card, StatCard, Screen
    context/AuthContext.tsx
    hooks/                # useAuth, usePermission, useDebounce, useListQuery
    lib/                  # constants, format, storage (SecureStore wrappers)
    global.css            # Tailwind directives — imported once in app/_layout.tsx
```

## Setup

```bash
cd mobile
npm install                  # already done if you scaffolded
cp .env.example .env         # edit if your dev LAN IP changes
```

### `.env`

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.194:8000/api/v1
```

**Use your dev machine's LAN IP — NOT `localhost`** — so a physical device / emulator can reach the Django backend. If your IP changes (e.g. WiFi swap), edit `.env` and restart the bundler.

## Run

Make sure the backend is up (from repo root: `docker compose up -d backend`).

```bash
npm run start            # Expo dev server (scan QR with Expo Go on device)
npm run android          # Android emulator
npm run ios              # iOS simulator (macOS only)
npm run web              # web preview (uses react-native-web)
```

Login with the seeded superuser: `admin@zidi.local` / `ChangeMe!123`.

## Architecture notes

### Auth + 401 refresh

`src/api/client.ts` mirrors the web's axios setup:

- **Request interceptor** — reads access token from SecureStore, injects `Authorization: Bearer ...`.
- **Response interceptor** — on 401 (for any request other than `/auth/login` or `/auth/refresh`), runs a **single-flight refresh** (concurrent 401s queue onto one in-flight refresh promise) and retries. On refresh failure: clears SecureStore and calls the registered `onUnauthorized` handler (set by `AuthContext` to clear in-memory user → triggers route redirect to `(auth)/login`).
- **Token storage keys** match the web app: `zidi.access`, `zidi.refresh`, `zidi.user`.

### RBAC

`usePermission(allowedRoles)` returns `{ allowed, roleName, isAuthenticated }`. Use it to gate write buttons and conditionally render tabs. Roles come from `user.role.name`. Backend enforces too — surface 403s gracefully (toast).

### Lists

`useListQuery(key, fetcher)` wraps TanStack Query's `useInfiniteQuery` for DRF pagination (`page`/`page_size=25`, debounced `search`, `ordering`). Returns flattened `rows` plus `fetchNextPage` for infinite scroll.

### Report exports

`api/client.ts → downloadToCache(path, filename)` uses `expo/fetch` (auth-friendly) to download the PDF/Excel into the OS cache dir via the SDK 56 `File`/`Paths` API, returns the local URI. Caller then opens the share sheet with `expo-sharing`.

### Push notifications

`lib/push.ts` requests permission after successful login, obtains the Expo push token via `expo-notifications`, and registers it with the backend at `POST /devices/register/`. On logout, the token is unregistered. Push receipts are handled in `lib/pushListeners.ts` — foreground display + tap-to-navigate (escalations → `/escalations`, notifications → `/(tabs)/notifications`). Dead tokens (`DeviceNotRegistered`) are pruned server-side in the `send_expo_push` Celery task.

Push **only works on real iOS/Android builds** — Expo Go and simulators can't obtain a native token. Use `eas build --profile development` for on-device testing.

### Biometric unlock (opt-in)

`lib/biometric.ts` wraps `expo-local-authentication`. Toggle it on in Settings; on the next cold start `AuthContext` prompts for Face ID / fingerprint before hydrating the session. Web / no-hardware devices bypass gracefully. Failing the prompt clears the session (forces re-login).

### Date pickers

`components/ui/DateField.tsx` — cross-platform: Android modal, iOS inline, web `<input type="date">`. Wire format stays `YYYY-MM-DD`.

## EAS builds

`eas.json` defines three profiles:

| Profile | Build type | API base URL |
|---|---|---|
| `development` | Dev client, internal, APK / iOS-sim | LAN (edit `env.EXPO_PUBLIC_API_BASE_URL`) |
| `preview` | Release APK / signed IPA, internal | Staging URL |
| `production` | AAB / signed IPA, auto-increment version | Prod URL |

```bash
npm i -g eas-cli
eas login
eas build:configure     # only once per project

# On-device push / biometric testing:
eas build --profile development --platform android
# → install the APK, run `npx expo start --dev-client`

# Internal QA / TestFlight:
eas build --profile preview --platform all

# Production release:
eas build --profile production --platform all
eas submit --profile production --platform all
```

Update `env.EXPO_PUBLIC_API_BASE_URL` in each profile before running any build. Push works only on physical devices with a dev client or release build — Expo Go can't hold a native push token as of SDK 53+.

## Phase 3 — not yet done

- Sentry (or equivalent) hook in the `ErrorBoundary`.
- Rate-limiting on login attempts (backend).
- Deep-link routing for cold-start pushes (currently only foreground taps).
- E2E tests via Detox / Maestro.
