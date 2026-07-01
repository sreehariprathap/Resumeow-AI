# Resumeow-AI Architecture

## Data Flow
- **Firebase v11+ Offline-First**: Uses `experimentalForceLongPolling` to bypass corporate network/AV filters (`ERR_BLOCKED_BY_CLIENT`).
- **Token Requests**:
  1. Users can create a request using `createTokenRequest`.
  2. Document saved to `tokenRequests` collection.
  3. Admins view pending requests via `getTokenRequests`.
  4. Admins resolve requests via `resolveTokenRequest`, which updates the status and increments the user's token allocation in `userProfiles`.

## LaTeX PDF Generation
- **Compilation**: All LaTeX → PDF compilation MUST be routed through `latex.ytotech.com` API endpoint via the `compileLatexToPdf` helper in `src/lib/latexCompiler.ts`. 
- **No Third Parties**: Services like `latexonline.cc` or raw `pdflatex` commands are not permitted.

## Debugging and Logging
- **Global Flag**: Set `window.resumeow = { debug: true }` in the browser console to enable verbose logging.
- **Centralized Logger**: All console operations are routed through `src/lib/logger.ts`.
