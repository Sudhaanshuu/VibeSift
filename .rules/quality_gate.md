# VibeSift Quality & Security Gate Rules

Every engineer and AI assistant working on VibeSift must enforce these three immutable rules before completing any modification:

---

## Rule 1: Page Load & Smoke Integrity Guarantee
- **No Blank Pages**: Every view must mount cleanly without unhandled runtime exceptions.
- **Router Context Safety**: All components requiring router context (`useNavigate`, `useLocation`, `Link`) must only be invoked within a verified `<Router>` / `<BrowserRouter>` context. When designing standalone components, prefer event callbacks or ensure a parent router wrapper.
- **Verification Command**: Run `npm test` and `npm run build` after every modification to verify that all components and pages mount without errors.

---

## Rule 2: Continuous Feature Regression Testing
- **New Features Require Tests**: For every new UI section, routing transition, or audit validation rule added, corresponding unit/integration test cases must be added to the test suite (e.g. `src/App.test.tsx` or component-specific test files).
- **Test Suite Pass Requirement**: All tests in the test suite must pass (`npm test`) with exit code 0 before code is considered complete.

---

## Rule 3: Zero Secret Leakage & Git Protection
- **Never Commit Secrets**: Do not commit live API keys, AWS credentials (`AKIA...`), secret tokens, or private `.env` files into source control or push to GitHub.
- **Automated Secret Scanner**: The automated test `src/lib/security/secretLeak.test.ts` runs on every test pass to verify that `.gitignore` blocks all environment and credential files, and that no source files contain live secret patterns.
- **Safe Placeholders Only**: Use public configuration tokens (`VITE_USE_MOCK_API`, public API domain endpoints) and keep all production secrets securely inside AWS Secrets Manager or KMS on the backend.
