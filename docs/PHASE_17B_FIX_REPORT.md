# Phase 17B Fix Report: Large Project / 413 Payload Architecture

## Objective
Stabilize the existing ResearchTex local compile architecture by eliminating HTTP 413 payload limits and memory bloat caused by inline Base64 transferring of large binary files in JSON payloads, without migrating away from the current architecture.

## Identified Issues
1. **JSON/Base64 Bloat**: The `getProjectSnapshot` Next.js action created a JSON object containing the `base64` string of all binary files in the project. Base64 adds ~33% inflation, and JSON serialization of a 20MB file requires massive contiguous string allocation in V8, often crashing the Next.js process or browser.
2. **Infinite Body Limit (`DefaultBodyLimit::disable()`)**: The Rust `apps/agent` intentionally disabled HTTP payload size limits entirely to try and accommodate these bloated JSON payloads, posing a DOS security risk.
3. **No File Limits**: There was no hard validation for maximum project compilation sizes on either the Next.js side or the Rust side.
4. **Agent Response Bloat**: A successfully compiled 30MB PDF would be serialized into Base64 within the Rust JSON response, causing memory issues during Next.js hydration or parsing.

## Fixes Implemented

### 1. Re-architected Compiler Transfer Pipeline to ZIP Streaming
Instead of generating a massive JSON payload with Base64 content, the application now leverages native `JSZip` and binary blobs:
- Created a new `GET /api/projects/[projectId]/compile-snapshot` route in Next.js that safely flushes collaboration server state and builds a `.zip` stream of the project.
- Updated the React `local-compiler-client.ts` to fetch this `.zip` as a native `Blob`, bypassing stringification completely.
- Formatted the Rust `CompileRequest` using a standard `multipart/form-data` object wrapping the ZIP `Blob` and compilation parameters (`root_file`, `engine`, `run_bib`).

### 2. Rust Agent Multipart & ZIP Support
- Switched the Rust `compile_handler` from parsing `Json<CompileRequest>` to `axum::extract::Multipart`.
- Added the `zip` crate to the Agent to extract the provided `.zip` stream directly into the temporary workspace folder, perfectly preserving binary encodings.
- Removed the hazardous `DefaultBodyLimit::disable()` layer, replacing it with `DefaultBodyLimit::max()`.

### 3. Safety Limits & Hard Constraints
Introduced safe bounds based on environmental variables with safe fallbacks:
- `MAX_COMPILE_PROJECT_SIZE`: Defaults to 50MB. Enforced during the Next.js `compile-snapshot` generation and Rust Axum layer.
- `MAX_COMPILE_FILE_SIZE`: Defaults to 20MB. Enforced during `compile-snapshot` creation; rejects explicitly oversized binary assets.
- `MAX_COMPILE_PDF_SIZE`: Defaults to 20MB. Rust calculates the raw byte size of the generated PDF before converting it to Base64 for the response. If the PDF exceeds the limit, the payload returns gracefully with a readable `error` without crashing.

### 4. Regression & Type Checking
- Verified compilation flow stability via `cargo check` and `cargo test` in `apps/agent`.
- Retained the current architecture's security checks (`validate_and_join_path`) to prevent path traversal within the ZIP extraction layer.

## Remaining Considerations
- The current implementation of `pdf_base64` return still leverages JSON out of necessity to deliver the UI preview within the same request. If average PDF generation begins to exceed 20MB, the `/compile` endpoint should be restructured to return a download URL or token instead of inline `base64`.
- The compilation state continues to rely heavily on a live websocket flush before snapshot generation to capture all ongoing editor changes. If the Collab server is slow, there may be a marginal delay in snapshot building.
