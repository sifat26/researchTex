use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CompileStatus {
    Queued,
    Running,
    Success,
    Error,
    Cancelled,
}

#[derive(Debug, Clone)]
pub struct JobState {
    pub id: String,
    pub status: CompileStatus,
    // Using a simple flag for cancellation to keep it straightforward for Phase 4
    pub cancel_requested: bool,
}

pub type JobManager = Arc<Mutex<HashMap<String, JobState>>>;

pub fn create_job_manager() -> JobManager {
    Arc::new(Mutex::new(HashMap::new()))
}

pub async fn start_job(manager: &JobManager, job_id: &str) {
    let mut jobs = manager.lock().await;
    jobs.insert(job_id.to_string(), JobState {
        id: job_id.to_string(),
        status: CompileStatus::Running,
        cancel_requested: false,
    });
}

pub async fn set_job_status(manager: &JobManager, job_id: &str, status: CompileStatus) {
    let mut jobs = manager.lock().await;
    if let Some(job) = jobs.get_mut(job_id) {
        // Do not override a cancelled job with an error
        if job.status == CompileStatus::Cancelled {
            return;
        }
        job.status = status;
    }
}

pub async fn cancel_job(manager: &JobManager, job_id: &str) -> Result<(), String> {
    let mut jobs = manager.lock().await;
    if let Some(job) = jobs.get_mut(job_id) {
        if job.status == CompileStatus::Running {
            job.cancel_requested = true;
            job.status = CompileStatus::Cancelled;
            Ok(())
        } else {
            Err("Job is not running".to_string())
        }
    } else {
        Err("Job not found".to_string())
    }
}

pub async fn is_cancelled(manager: &JobManager, job_id: &str) -> bool {
    let jobs = manager.lock().await;
    if let Some(job) = jobs.get(job_id) {
        job.cancel_requested || job.status == CompileStatus::Cancelled
    } else {
        false
    }
}
