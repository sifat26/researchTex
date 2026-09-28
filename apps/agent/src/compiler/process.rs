use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::process::Command;
use std::time::Instant;
use crate::jobs::manager::JobManager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompileLog {
    pub stdout: String,
    pub stderr: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProcessResult {
    pub exit_code: Option<i32>,
    pub duration_ms: u128,
    pub logs: CompileLog,
    pub success: bool,
}

/// Executes a safe, bounded compilation command inside the given working directory.
pub async fn execute_compiler(
    engine: &str,
    project_dir: &Path,
    root_file: &str,
    job_manager: &JobManager,
    job_id: &str,
) -> Result<ProcessResult, String> {
    // Only allow specific engines
    let safe_engines = ["pdflatex", "xelatex", "lualatex", "bibtex", "biber"];
    if !safe_engines.contains(&engine) {
        return Err(format!("Unsupported compiler engine: {}", engine));
    }

    // Extract the directory and filename from root_file
    let path = Path::new(root_file);
    let mut working_dir = project_dir.to_path_buf();
    let file_name = if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            working_dir = working_dir.join(parent);
        }
        path.file_name().unwrap_or_default().to_string_lossy().to_string()
    } else {
        root_file.to_string()
    };

    // Default arguments for latex engines to ensure non-interactive, safe runs
    let mut args = vec![];
    if engine.contains("latex") {
        args.push("-interaction=nonstopmode");
        args.push("-halt-on-error");
        args.push("-file-line-error"); // better for parsing errors
    }
    args.push(&file_name);

    let start = Instant::now();

    let mut child = Command::new(engine)
        .current_dir(&working_dir)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to spawn process: {}", e))?;

    let manager_clone = job_manager.clone();
    let id_clone = job_id.to_string();

    let output = tokio::select! {
        out = child.wait_with_output() => {
            out.map_err(|e| format!("Failed to wait on child: {}", e))?
        },
        _ = async move {
            loop {
                tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                if crate::jobs::manager::is_cancelled(&manager_clone, &id_clone).await {
                    break;
                }
            }
        } => {
            return Err("Compilation cancelled by user.".to_string());
        }
    };

    let duration_ms = start.elapsed().as_millis();

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    Ok(ProcessResult {
        exit_code: output.status.code(),
        duration_ms,
        logs: CompileLog { stdout, stderr },
        success: output.status.success(),
    })
}
