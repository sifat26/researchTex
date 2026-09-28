export function isBinaryFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  
  const textExtensions = new Set([
    "tex", "bib", "cls", "sty", "bst", "cfg", "txt", "md", "csv", "json", "xml", "svg", "gitignore", "prettierrc", "eslintrc"
  ]);

  const binaryExtensions = new Set([
    "png", "jpg", "jpeg", "gif", "pdf", "webp", "zip", "tar", "gz", "rar", "7z", "doc", "docx", "xls", "xlsx", "ppt", "pptx"
  ]);

  if (ext && binaryExtensions.has(ext)) {
    return true;
  }
  
  if (ext && textExtensions.has(ext)) {
    return false;
  }
  
  // Default to text for unknown files, as LaTeX projects primarily consist of text
  return false;
}
