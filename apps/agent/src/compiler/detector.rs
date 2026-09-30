use serde::{Deserialize, Serialize};
use which::which;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompilerInfo {
    pub pdflatex: Option<String>,
    pub xelatex: Option<String>,
    pub lualatex: Option<String>,
    pub bibtex: Option<String>,
    pub biber: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentHealth {
    pub status: String,
    pub agent: String,
    pub version: String,
    pub platform: String,
    pub available_engines: Vec<String>,
    pub compilers: CompilerInfo,
}

pub fn detect_compilers() -> CompilerInfo {
    let check = |cmd: &str| -> Option<String> {
        which(cmd).ok().map(|p| p.to_string_lossy().to_string())
    };

    CompilerInfo {
        pdflatex: check("pdflatex"),
        xelatex: check("xelatex"),
        lualatex: check("lualatex"),
        bibtex: check("bibtex"),
        biber: check("biber"),
    }
}

pub fn get_health() -> AgentHealth {
    let compilers = detect_compilers();
    
    let mut available_engines = Vec::new();
    if compilers.pdflatex.is_some() { available_engines.push("pdflatex".to_string()); }
    if compilers.xelatex.is_some() { available_engines.push("xelatex".to_string()); }
    if compilers.lualatex.is_some() { available_engines.push("lualatex".to_string()); }

    AgentHealth {
        status: "ok".to_string(),
        agent: "ResearchTex Agent".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        platform: std::env::consts::OS.to_string(),
        available_engines,
        compilers,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_structure() {
        let health = get_health();
        assert_eq!(health.status, "ok");
        assert_eq!(health.agent, "ResearchTex Agent");
    }
}
