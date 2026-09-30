use super::process::{execute_compiler, ProcessResult};
use std::path::Path;

use crate::jobs::manager::JobManager;
use crate::compiler::parser::{parse_latex_logs, CompileLogEntry};

#[derive(Debug)]
pub struct PipelineResult {
    pub success: bool,
    pub exit_code: i32,
    pub duration_ms: u128,
    pub stdout: String,
    pub stderr: String,
    pub pdf_path: Option<String>,
    pub log_entries: Vec<CompileLogEntry>,
}

/// Runs a standard multi-pass compilation if required.
pub async fn run_pipeline(
    project_dir: &Path,
    root_file: &str,
    engine: &str,
    run_bib: bool,
    job_manager: &JobManager,
    job_id: &str,
) -> Result<PipelineResult, String> {
    let mut total_duration = 0;
    let mut combined_stdout = String::new();
    let mut combined_stderr = String::new();

    // Pass 1
    let mut res = execute_compiler(engine, project_dir, root_file, job_manager, job_id).await?;
    total_duration += res.duration_ms;
    combined_stdout.push_str(&res.logs.stdout);
    combined_stderr.push_str(&res.logs.stderr);

    if !res.success {
        return Ok(build_result(false, res, total_duration, combined_stdout, combined_stderr, None, root_file));
    }

    let needs_biber = combined_stdout.contains("Please (re)run Biber");
    let needs_bibtex = run_bib || combined_stdout.contains("No file") && combined_stdout.contains(".bbl");
    let mut needs_rerun = combined_stdout.contains("Rerun to get cross-references right") || 
                          combined_stdout.contains("There were undefined references");

    let base_name = root_file.trim_end_matches(".tex");

    // Bibliography pass
    if needs_biber || needs_bibtex {
        let bib_engine = if needs_biber { "biber" } else { "bibtex" };
        let bib_res = execute_compiler(bib_engine, project_dir, base_name, job_manager, job_id).await?;
        total_duration += bib_res.duration_ms;
        combined_stdout.push_str(&bib_res.logs.stdout);
        combined_stderr.push_str(&bib_res.logs.stderr);

        // Pass 2
        res = execute_compiler(engine, project_dir, root_file, job_manager, job_id).await?;
        total_duration += res.duration_ms;
        combined_stdout.push_str(&res.logs.stdout);
        combined_stderr.push_str(&res.logs.stderr);
        
        if !res.success {
            return Ok(build_result(false, res, total_duration, combined_stdout, combined_stderr, None, root_file));
        }

        needs_rerun = res.logs.stdout.contains("Rerun to get cross-references right") || 
                      res.logs.stdout.contains("There were undefined references");
    }

    // Additional rerun pass if needed
    if needs_rerun {
        res = execute_compiler(engine, project_dir, root_file, job_manager, job_id).await?;
        total_duration += res.duration_ms;
        combined_stdout.push_str(&res.logs.stdout);
        combined_stderr.push_str(&res.logs.stderr);
    }

    let success = res.success;
    let _exit_code = res.exit_code.unwrap_or(1);
    
    // Check if PDF was generated
    let pdf_filename = format!("{}.pdf", base_name);
    let pdf_full_path = project_dir.join(&pdf_filename);
    
    let pdf_path = if pdf_full_path.exists() && success {
        Some(pdf_full_path.to_string_lossy().to_string())
    } else {
        None
    };

    Ok(build_result(success, res, total_duration, combined_stdout, combined_stderr, pdf_path, root_file))
}

fn build_result(
    success: bool,
    last_res: ProcessResult,
    total_duration: u128,
    stdout: String,
    stderr: String,
    pdf_path: Option<String>,
    root_file: &str,
) -> PipelineResult {
    let mut log_entries = parse_latex_logs(&stdout, &stderr);
    
    // Fix paths if the compiler was run in a subdirectory
    if let Some(parent) = Path::new(root_file).parent() {
        if !parent.as_os_str().is_empty() {
            let prefix = parent.to_string_lossy().to_string();
            for entry in &mut log_entries {
                if let Some(f) = &mut entry.file {
                    let clean_f = f.strip_prefix("./").unwrap_or(f);
                    *f = format!("{}/{}", prefix, clean_f);
                }
            }
        }
    }

    PipelineResult {
        success,
        exit_code: last_res.exit_code.unwrap_or(1),
        duration_ms: total_duration,
        stdout,
        stderr,
        pdf_path,
        log_entries,
    }
}
