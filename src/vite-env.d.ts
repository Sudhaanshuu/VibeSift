/// <reference types="vite/client" />
import '@testing-library/jest-dom/vitest';

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_USE_MOCK_API?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_SUBTITLE?: string;
  readonly VITE_COGNITO_USER_POOL_ID?: string;
  readonly VITE_COGNITO_CLIENT_ID?: string;
  readonly VITE_AWS_REGION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
