# ResearchTex — Phase 17B Payload Audit

## 1. Original Data Flow
The original compiler data flow transfers the entire project codebase through the browser:
1. **Next.js Server (`getProjectSnapshot` Action)**: Reads all files for a project from PostgreSQL (via `FileService`). Binary files like PNG/JPG are loaded as Base64 strings.
2. **Transfer to Browser**: Next.js serializes this massive array of file contents and sends it to the client browser over HTTP as the Server Action response.
3. **Browser Memory**: The browser parses the JSON, creating a huge Javascript array of objects containing Base64 encoded strings.
4. **Serialization**: The browser calls `JSON.stringify(payload)` to prepare the HTTP request for the local compiler agent.
5. **Transfer to Rust**: The browser `POST`s the gigantic JSON payload to `http://localhost:4433/compile`.
6. **Rust Agent (`agent/src/api/routes.rs`)**: Axum parses the massive JSON into memory. (This previously threw 413 until `DefaultBodyLimit::disable()` was applied).
7. **Execution**: Rust decodes Base64 to binary and writes to a temporary filesystem workspace, runs `pdflatex`, and reads the resulting PDF.
8. **Transfer to Browser (PDF)**: Rust encodes the generated PDF back into Base64 and returns a huge JSON response to the browser.

## 2. Issues with Original Flow
- Unnecessary Base64 overhead (33% size bloat).
- The Browser acts as a massive bottleneck.
- Repeated serialization/deserialization (DB -> Node -> JSON -> Browser -> JSON -> Rust).
- Memory spikes in Next.js Server, Browser, and Rust Agent.

## 3. Planned Changes (Phase 17B)
To fix this without rewriting everything, we will introduce a direct API proxy or a zip-streaming approach:
1. We cannot easily have Rust download directly from Next.js without passing authentication tokens.
2. But wait! The Browser *can* request a ZIP from Next.js, and directly send it to Rust as a binary stream (or `FormData`), completely avoiding `JSON.stringify` of Base64 strings!
3. Alternatively, the Browser can request an "export token" from Next.js, and hand that token to the Rust Agent. The Rust Agent then makes a single streaming `GET` request to Next.js to download the project as a `.zip` archive, unzips it into the workspace, compiles, and streams the PDF back to the browser.

We will use the **Export Token / Direct Download** approach, as it completely bypasses loading the project files into the Browser's memory and avoids Base64 entirely.
