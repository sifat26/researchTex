use std::path::{Component, Path, PathBuf};

/// Safely constructs an absolute path from a base directory and a user-provided relative path.
/// It prevents directory traversal attacks (e.g. `../../etc/passwd`).
pub fn validate_and_join_path(base_dir: &Path, user_path: &str) -> Result<PathBuf, String> {
    let mut resolved_path = base_dir.to_path_buf();
    let relative_path = Path::new(user_path);

    for component in relative_path.components() {
        match component {
            Component::Normal(comp) => resolved_path.push(comp),
            Component::CurDir => {}
            Component::ParentDir => {
                // Do not allow escaping the base directory
                if resolved_path == base_dir {
                    return Err("Path traversal attempt detected".to_string());
                }
                resolved_path.pop();
            }
            Component::RootDir | Component::Prefix(_) => {
                return Err("Absolute paths are not allowed".to_string());
            }
        }
    }

    Ok(resolved_path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_paths() {
        let base = Path::new("/workspace/project");
        assert_eq!(
            validate_and_join_path(base, "main.tex").unwrap(),
            PathBuf::from("/workspace/project/main.tex")
        );
        assert_eq!(
            validate_and_join_path(base, "sections/intro.tex").unwrap(),
            PathBuf::from("/workspace/project/sections/intro.tex")
        );
        assert_eq!(
            validate_and_join_path(base, "./figures/graph.png").unwrap(),
            PathBuf::from("/workspace/project/figures/graph.png")
        );
    }

    #[test]
    fn test_traversal_prevention() {
        let base = Path::new("/workspace/project");
        assert!(validate_and_join_path(base, "../other/main.tex").is_err());
        assert!(validate_and_join_path(base, "sections/../../other.tex").is_err());
        assert!(validate_and_join_path(base, "/etc/passwd").is_err());
    }
}
