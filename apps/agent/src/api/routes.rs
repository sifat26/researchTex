use axum::{
    extract::{Path as AxumPath, State, Multipart},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Serialize;
use std::path::PathBuf;
use std::fs;
use uuid::Uuid;
use base64::{Engine as _, engine::general_purpose};

use crate::compiler::detector::get_health;
use crate::compiler::pipeline::run_pipeline;
use crate::jobs::manager::{cancel_job, set_job_status, CompileStatus, JobManager};
use crate::security::validation::validate_and_join_path;

#[derive(Clone)]
pub struct AppState {
    pub jobs: JobManager,
}


#[derive(Debug, Serialize)]
pub struct CompileResponse {
    pub success: bool,
    pub job_id: String,
    pub engine: String,
    pub pdf_base64: Option<String>,
    pub exit_code: i32,
    pub duration_ms: u128,
    pub stdout: String,
    pub stderr: String,
    pub error: Option<String>,
    pub log_entries: Vec<crate::compiler::parser::CompileLogEntry>,
}

pub async fn health_handler() -> impl IntoResponse {
    let health = get_health();
    (StatusCode::OK, Json(health))
}

pub async fn compile_handler(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let mut root_file = "main.tex".to_string();
    let mut engine = "pdflatex".to_string();
    let mut run_bib = false;
    let mut job_id_in = String::new();
    let mut zip_data = Vec::new();

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        if name == "root_file" {
            root_file = field.text().await.unwrap_or_default();
        } else if name == "engine" {
            engine = field.text().await.unwrap_or_default();
        } else if name == "run_bib" {
            let val = field.text().await.unwrap_or_default();
            run_bib = val == "true";
        } else if name == "job_id" {
            job_id_in = field.text().await.unwrap_or_default();
        } else if name == "project_zip" {
            zip_data = field.bytes().await.unwrap_or_default().to_vec();
        }
    }

    let job_id = if job_id_in.is_empty() { Uuid::new_v4().to_string() } else { job_id_in };
    
    let base_path = std::env::temp_dir().join(format!("researchtex_job_{}", job_id));
    
    if let Err(e) = fs::create_dir_all(&base_path) {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(build_error_response(&job_id, &engine, &format!("Failed to create workspace: {}", e))),
        );
    }

    if !zip_data.is_empty() {
        let zip_path = base_path.join("project.zip");
        if let Err(e) = fs::write(&zip_path, &zip_data) {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(build_error_response(&job_id, &engine, &format!("Failed to save zip: {}", e))),
            );
        }
        
        match std::fs::File::open(&zip_path) {
            Ok(file) => {
                match zip::ZipArchive::new(file) {
                    Ok(mut archive) => {
                        for i in 0..archive.len() {
                            if let Ok(mut file) = archive.by_index(i) {
                                let outpath = match file.enclosed_name() {
                                    Some(path) => base_path.join(path),
                                    None => continue,
                                };
                                if (*file.name()).ends_with('/') {
                                    let _ = fs::create_dir_all(&outpath);
                                } else {
                                    if let Some(p) = outpath.parent() {
                                        let _ = fs::create_dir_all(p);
                                    }
                                    if let Ok(mut outfile) = fs::File::create(&outpath) {
                                        let _ = std::io::copy(&mut file, &mut outfile);
                                    }
                                }
                            }
                        }
                    },
                    Err(e) => {
                        return (
                            StatusCode::BAD_REQUEST,
                            Json(build_error_response(&job_id, &engine, &format!("Invalid zip archive: {}", e))),
                        );
                    }
                }
            },
            Err(e) => {
                 return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(build_error_response(&job_id, &engine, &format!("Failed to read zip: {}", e))),
                );
            }
        }
    }

    match validate_and_join_path(&base_path, &root_file) {
        Ok(root_file_path) => {
            if !root_file_path.exists() {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(build_error_response(&job_id, &engine, "Root file does not exist in payload")),
                );
            }
        }
        Err(err) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(build_error_response(&job_id, &engine, &format!("Invalid root file path: {}", err))),
            );
        }
    }

    crate::jobs::manager::start_job(&state.jobs, &job_id).await;

    match run_pipeline(&base_path, &root_file, &engine, run_bib, &state.jobs, &job_id).await {
        Ok(result) => {
            set_job_status(
                &state.jobs,
                &job_id,
                if result.success { CompileStatus::Success } else { CompileStatus::Error },
            ).await;
            
            let mut pdf_base64 = None;
            let mut pdf_error = None;
            
            if result.success {
                if let Some(pdf_path_str) = &result.pdf_path {
                    let pdf_path = PathBuf::from(pdf_path_str);
                    if let Ok(metadata) = std::fs::metadata(&pdf_path) {
                        let max_pdf_size: u64 = std::env::var("MAX_COMPILE_PDF_SIZE")
                            .unwrap_or_else(|_| "20971520".to_string())
                            .parse()
                            .unwrap_or(20971520); // Default 20 MB
                            
                        if metadata.len() > max_pdf_size {
                            pdf_error = Some("Generated PDF exceeds the configured preview transfer limit.".to_string());
                        } else if let Ok(bytes) = fs::read(&pdf_path) {
                            pdf_base64 = Some(general_purpose::STANDARD.encode(&bytes));
                        }
                    }
                }
            }

            let res = CompileResponse {
                success: result.success && pdf_error.is_none(),
                job_id,
                engine: engine.clone(),
                pdf_base64,
                exit_code: result.exit_code,
                duration_ms: result.duration_ms,
                stdout: result.stdout.clone(),
                stderr: result.stderr.clone(),
                error: pdf_error.or_else(|| if !result.success { Some("Compilation failed".to_string()) } else { None }),
                log_entries: result.log_entries,
            };
            (StatusCode::OK, Json(res))
        }
        Err(e) => {
            set_job_status(&state.jobs, &job_id, CompileStatus::Error).await;
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(build_error_response(&job_id, &engine, &e)),
            )
        }
    }
}

pub async fn cancel_compile_handler(
    State(state): State<AppState>,
    AxumPath(job_id): AxumPath<String>,
) -> impl IntoResponse {
    match cancel_job(&state.jobs, &job_id).await {
        Ok(_) => (StatusCode::OK, Json("Job cancelled".to_string())),
        Err(e) => (StatusCode::BAD_REQUEST, Json(e)),
    }
}

fn build_error_response(job_id: &str, engine: &str, msg: &str) -> CompileResponse {
    CompileResponse {
        success: false,
        job_id: job_id.to_string(),
        engine: engine.to_string(),
        pdf_base64: None,
        exit_code: 1,
        duration_ms: 0,
        stdout: "".to_string(),
        stderr: "".to_string(),
        error: Some(msg.to_string()),
        log_entries: vec![],
    }
}
