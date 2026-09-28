// Prevents additional console window on Windows in release
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod api;
mod compiler;
mod jobs;
mod security;

use axum::{
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};

use api::routes::{cancel_compile_handler, compile_handler, health_handler, AppState};
use jobs::manager::create_job_manager;

#[tokio::main]
async fn main() {
    // 1. Initialize Axum Server State
    let job_manager = create_job_manager();
    let state = AppState { jobs: job_manager };

    // 2. Setup CORS (Allow Next.js web app to talk to the agent)
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    use axum::extract::DefaultBodyLimit;

    let max_body_size: usize = std::env::var("MAX_COMPILE_PROJECT_SIZE")
        .unwrap_or_else(|_| "52428800".to_string())
        .parse()
        .unwrap_or(52428800);

    // 3. Build Axum Router
    let app = Router::new()
        .route("/health", get(health_handler))
        .route("/compile", post(compile_handler))
        .route("/compile/{job_id}/cancel", post(cancel_compile_handler))
        .layer(cors)
        .layer(DefaultBodyLimit::max(max_body_size))
        .with_state(state);

    // 4. Spawn Axum server in a background Tokio thread
    tokio::spawn(async move {
        let addr = SocketAddr::from(([127, 0, 0, 1], 4433));
        println!("ResearchTex Agent API listening on {}", addr);
        let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
        axum::serve(listener, app).await.unwrap();
    });

    // 5. Run Tauri Application (Background / Tray)
    // In Phase 4, we don't strictly need a webview.
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
