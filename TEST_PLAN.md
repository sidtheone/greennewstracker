# Comprehensive Test Plan - GreenNewsTracker

This document outlines the testing strategy, tools, and implementation roadmap for the GreenNewsTracker project.

## 1. Testing Strategy

We will adopt a multi-layered testing approach to ensure reliability across the monorepo.

### Unit Testing
- **Focus**: Individual functions, utilities, and isolated components.
- **Scope**: `backend/shared/utils`, `backend/worker/src/rss`, `frontend/src/utils`, `frontend/src/components`.
- **Goal**: Verify logic correctness without external dependencies.

### Integration Testing
- **Focus**: Interaction between modules and external services (Database, API routes).
- **Scope**: `backend/api/src/routes`, `backend/worker/src/classifier`.
- **Goal**: Ensure that different parts of the system work together correctly.

### End-to-End (E2E) Testing
- **Focus**: Critical user journeys from the frontend to the backend.
- **Scope**: Full flow from fetching news to displaying them in the UI.
- **Goal**: Validate the system as a whole from the user's perspective.

---

## 2. Tools & Frameworks

We recommend **Vitest** as the primary testing framework for its speed, Vite compatibility, and excellent TypeScript support.

| Tool | Purpose |
| :--- | :--- |
| **Vitest** | Test runner and assertion library for all packages. |
| **React Testing Library** | Component testing for the frontend. |
| **jsdom** | Browser environment simulation for frontend tests. |
| **Supertest** | HTTP assertions for API integration tests. |
| **msw (Mock Service Worker)** | Mocking API requests in frontend and worker tests. |

---

## 3. Backend API Tests (`backend/api`)

### Middleware Tests
- **Rate Limiter**: Verify that requests are blocked after exceeding the limit.
- **Error Handler**: Ensure consistent JSON error responses for different error types.
- **Cache**: Test that subsequent requests for the same resource return cached data.

### Route Tests (Integration)
- **News**: Test `/api/news` with various query parameters (country, category).
- **Countries**: Verify the list of supported countries is returned correctly.
- **Health**: Ensure the health check endpoint returns `200 OK`.

### Mocking Strategy
- Use an in-memory SQLite database for integration tests to ensure isolation and speed.
- Mock `@greennewstracker/shared/db` during unit tests.

---

## 4. Backend Worker Tests (`backend/worker`)

### Unit Tests
- **RSS Parser**: Test with various RSS XML formats (valid, malformed, missing fields).
- **Fetcher**: Verify retry logic and timeout handling for external requests.
- **Deduper**: Ensure duplicate news items are correctly identified and filtered.

### Mocking Strategy
- **OpenAI Classifier**: Mock the OpenAI API responses using Vitest mocks or MSW to avoid costs and latency during testing.

---

## 5. Shared Utility Tests (`backend/shared`)

### Unit Tests
- **Validation**: Test Zod schemas against valid and invalid data payloads.
- **Crypto**: Verify hashing and comparison functions for consistency.

---

## 6. Frontend Tests (`frontend`)

### Utility Tests
- **`date.ts`**: Test relative time formatting and locale handling.
- **`url.ts`**: Verify URL sanitization and parameter parsing.

### Component Tests (React Testing Library)
- **NewsCard**: Ensure it renders news data correctly and handles missing images gracefully.
- **Header**: Verify navigation links and search functionality.

### Hook Tests
- **`useNews`**: Test data fetching state (loading, error, success) using MSW to mock the API.
- **`useCountries`**: Verify country list fetching and caching.

---

## 7. Implementation Roadmap

### Phase 1: Environment Setup
1. Install `vitest` and related dependencies in the root and individual packages.
2. Configure `vitest.config.ts` for each package.
3. Add `test` scripts to `package.json` files.

### Phase 2: Shared & Utility Testing
1. Implement unit tests for `backend/shared/utils`.
2. Implement unit tests for `frontend/src/utils`.

### Phase 3: Backend Testing
1. Set up integration test environment for `backend/api` with in-memory SQLite.
2. Add tests for middlewares and core routes.
3. Implement worker unit tests with mocked RSS feeds.

### Phase 4: Frontend Testing
1. Set up `jsdom` and React Testing Library.
2. Add component tests for core UI elements.
3. Implement hook tests with MSW.

### Phase 5: CI Integration
1. Add a test step to the CI/CD pipeline to run all tests on every pull request.
