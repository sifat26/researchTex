use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompileLogEntry {
    pub level: String,
    pub message: String,
    pub file: Option<String>,
    pub line: Option<u32>,
}

/// A very basic heuristic parser for common LaTeX log outputs.
pub fn parse_latex_logs(stdout: &str, stderr: &str) -> Vec<CompileLogEntry> {
    let mut entries = Vec::new();

    // Split logs by lines
    let lines: Vec<&str> = stdout.lines().chain(stderr.lines()).collect();
    
    let mut i = 0;
    while i < lines.len() {
        let line = lines[i].trim();
        
        if line.starts_with("! ") {
            // LaTeX Error
            let message = line.strip_prefix("! ").unwrap_or(line).to_string();
            // Look ahead for "l.123 " to find the line number
            let mut line_num = None;
            for j in 1..=3 {
                if i + j < lines.len() {
                    let next_line = lines[i+j].trim();
                    if next_line.starts_with("l.") {
                        if let Some(space_idx) = next_line.find(' ') {
                            if let Ok(num) = next_line[2..space_idx].parse::<u32>() {
                                line_num = Some(num);
                                break;
                            }
                        }
                    }
                }
            }
            entries.push(CompileLogEntry {
                level: "error".to_string(),
                message,
                file: None, // Complex to parse standard latex file context without file-line-error
                line: line_num,
            });
        } else if line.contains("Error:") || line.contains("error:") {
            entries.push(CompileLogEntry {
                level: "error".to_string(),
                message: line.to_string(),
                file: None,
                line: None,
            });
        } else if line.contains("Warning:") || line.contains("warning:") {
            entries.push(CompileLogEntry {
                level: "warning".to_string(),
                message: line.to_string(),
                file: None,
                line: None,
            });
        } else if line.starts_with("Overfull") || line.starts_with("Underfull") {
            entries.push(CompileLogEntry {
                level: "warning".to_string(),
                message: line.to_string(),
                file: None,
                line: None,
            });
        }
        
        // Handle -file-line-error format: "file.tex:123: Error message"
        if let Some(colon1) = line.find(':') {
            if let Some(colon2) = line[colon1+1..].find(':') {
                let file = &line[..colon1];
                let line_str = &line[colon1+1..colon1+1+colon2];
                let msg = &line[colon1+1+colon2+1..].trim();
                
                if let Ok(line_num) = line_str.parse::<u32>() {
                    let level = if msg.to_lowercase().contains("warning") {
                        "warning"
                    } else {
                        "error"
                    };
                    
                    entries.push(CompileLogEntry {
                        level: level.to_string(),
                        message: msg.to_string(),
                        file: Some(file.to_string()),
                        line: Some(line_num),
                    });
                }
            }
        }

        i += 1;
    }

    // Deduplicate entries heuristically
    let mut deduped = Vec::new();
    for entry in entries {
        if !deduped.iter().any(|e: &CompileLogEntry| e.message == entry.message && e.line == entry.line) {
            deduped.push(entry);
        }
    }

    deduped
}
