export interface BibEntry {
  key: string;
  type: string; // e.g. "article", "book"
  fields: Record<string, string>; // e.g. title, author, year
}

export interface ParseResult {
  entries: BibEntry[];
  warnings: string[];
}

export class BibTeXParser {
  private input: string;
  private pos: number = 0;
  private warnings: string[] = [];
  private entries: BibEntry[] = [];

  constructor(input: string) {
    this.input = input;
  }

  public parse(): ParseResult {
    while (this.pos < this.input.length) {
      this.skipWhitespace();
      if (this.pos >= this.input.length) break;

      const char = this.input[this.pos];
      if (char === '@') {
        this.parseEntry();
      } else {
        // Skip junk characters between entries
        this.pos++;
      }
    }

    return {
      entries: this.entries,
      warnings: this.warnings,
    };
  }

  private skipWhitespace() {
    while (this.pos < this.input.length) {
      const c = this.input[this.pos];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
        this.pos++;
      } else if (c === '%') { // BibTeX uses % for comments sometimes, though technically it's anything outside @
        while (this.pos < this.input.length && this.input[this.pos] !== '\n') {
          this.pos++;
        }
      } else {
        break;
      }
    }
  }

  private parseEntry() {
    this.pos++; // skip '@'
    const type = this.readIdentifier().toLowerCase();
    
    // Ignore @comment and @string for now
    if (type === 'comment') {
      // @comment can be block or line, if it has { we parse matching, else skip line
      this.skipWhitespace();
      if (this.input[this.pos] === '{') {
        this.readBalancedBraces();
      } else {
        while (this.pos < this.input.length && this.input[this.pos] !== '\n') this.pos++;
      }
      return;
    }
    if (type === 'string' || type === 'preamble') {
      this.skipWhitespace();
      if (this.input[this.pos] === '{') this.readBalancedBraces();
      else if (this.input[this.pos] === '(') this.readBalancedParens();
      return;
    }

    this.skipWhitespace();
    
    let openChar = this.input[this.pos];
    if (openChar !== '{' && openChar !== '(') {
      this.warnings.push(`Expected '{' or '(' after @${type} at position ${this.pos}`);
      return;
    }
    
    const closeChar = openChar === '{' ? '}' : ')';
    this.pos++; // skip open char

    this.skipWhitespace();
    
    // Read citation key
    const key = this.readKey();
    if (!key) {
      this.warnings.push(`Missing key for @${type} near position ${this.pos}`);
      // Try to recover by skipping to end of entry
      this.recover(closeChar);
      return;
    }

    this.skipWhitespace();

    if (this.input[this.pos] !== ',') {
      // An entry with just a key?
      if (this.input[this.pos] === closeChar) {
        this.entries.push({ key, type, fields: {} });
        this.pos++;
        return;
      }
      this.warnings.push(`Expected ',' after key '${key}' at position ${this.pos}`);
      this.recover(closeChar);
      return;
    }

    this.pos++; // skip ','
    
    const fields: Record<string, string> = {};

    while (this.pos < this.input.length) {
      this.skipWhitespace();
      
      const char = this.input[this.pos];
      if (char === closeChar) {
        this.pos++; // end of entry
        break;
      }

      const fieldName = this.readIdentifier().toLowerCase();
      if (!fieldName) {
        // Might be trailing comma
        if (this.input[this.pos] === closeChar) {
          this.pos++;
          break;
        }
        if (this.input[this.pos] === ',') {
           this.pos++;
           continue;
        }
        this.warnings.push(`Expected field name in entry '${key}' at position ${this.pos}`);
        this.recover(closeChar);
        break;
      }

      this.skipWhitespace();

      if (this.input[this.pos] !== '=') {
        this.warnings.push(`Expected '=' after field '${fieldName}' in entry '${key}'`);
        this.recover(closeChar);
        break;
      }
      
      this.pos++; // skip '='
      this.skipWhitespace();

      const fieldValue = this.readValue();
      fields[fieldName] = fieldValue.trim();

      this.skipWhitespace();

      if (this.input[this.pos] === ',') {
        this.pos++;
      } else if (this.input[this.pos] !== closeChar) {
        this.warnings.push(`Expected ',' or '${closeChar}' after field '${fieldName}' in entry '${key}'`);
        this.recover(closeChar);
        break;
      }
    }

    this.entries.push({ key, type, fields });
  }

  private readIdentifier(): string {
    let start = this.pos;
    while (this.pos < this.input.length) {
      const c = this.input[this.pos] || "";
      if (/[a-zA-Z0-9_\-\+\.\/:]/.test(c)) {
        this.pos++;
      } else {
        break;
      }
    }
    return this.input.substring(start, this.pos);
  }

  private readKey(): string {
    let start = this.pos;
    while (this.pos < this.input.length) {
      const c = this.input[this.pos];
      if (c === ',' || c === '}' || c === ')' || c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '=') {
        break;
      }
      this.pos++;
    }
    return this.input.substring(start, this.pos).trim();
  }

  private readValue(): string {
    const startChar = this.input[this.pos];
    
    let value = "";
    if (startChar === '{') {
      const start = this.pos;
      this.readBalancedBraces();
      value = this.input.substring(start + 1, this.pos - 1);
    } else if (startChar === '"') {
      this.pos++; // skip quote
      const start = this.pos;
      while (this.pos < this.input.length) {
        const c = this.input[this.pos];
        if (c === '\\' && this.pos + 1 < this.input.length) {
           this.pos += 2;
           continue;
        }
        if (c === '"') {
           const end = this.pos;
           this.pos++;
           value = this.input.substring(start, end);
           break;
        }
        if (c === '{') { // Braces inside quotes
           this.readBalancedBraces();
           continue;
        }
        this.pos++;
      }
      if (!value) value = this.input.substring(start, this.pos); // if it ended without quote
    } else {
      // Unquoted/unbraced value (usually numbers or macros)
      let start = this.pos;
      while (this.pos < this.input.length) {
        const c = this.input[this.pos];
        if (c === ',' || c === '}' || c === ')' || c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '#') {
          break;
        }
        this.pos++;
      }
      value = this.input.substring(start, this.pos);
    }

    // Now check if there is a '#' for concatenation
    let tempPos = this.pos;
    this.skipWhitespace();
    if (this.pos < this.input.length && this.input[this.pos] === '#') {
      this.pos++; // skip #
      this.skipWhitespace();
      const nextPart = this.readValue();
      return value + " " + nextPart;
    } else {
      // No concatenation, restore pos if we skipped spaces that we shouldn't have?
      // Wait, skipping spaces after a value is fine because the caller `parseEntry` 
      // expects to skip whitespace anyway to find the `,` or `}`.
      // But just to be safe:
      this.pos = tempPos;
      return value;
    }
  }

  private readBalancedBraces() {
    let braceCount = 0;
    while (this.pos < this.input.length) {
      const c = this.input[this.pos];
      // simplistic escape check
      if (c === '\\' && this.pos + 1 < this.input.length) {
        this.pos += 2;
        continue;
      }
      if (c === '{') braceCount++;
      if (c === '}') {
        braceCount--;
        if (braceCount === 0) {
          this.pos++;
          return;
        }
      }
      this.pos++;
    }
  }

  private readBalancedParens() {
    let count = 0;
    while (this.pos < this.input.length) {
      const c = this.input[this.pos];
      if (c === '(') count++;
      if (c === ')') {
        count--;
        if (count === 0) {
          this.pos++;
          return;
        }
      }
      this.pos++;
    }
  }

  private recover(closeChar: string) {
    let braceCount = closeChar === '}' ? 1 : 0;
    while (this.pos < this.input.length) {
      const c = this.input[this.pos];
      if (closeChar === '}') {
        if (c === '{') braceCount++;
        if (c === '}') {
          braceCount--;
          if (braceCount === 0) {
            this.pos++;
            return;
          }
        }
      } else {
        if (c === closeChar) {
          this.pos++;
          return;
        }
      }
      this.pos++;
    }
  }
}
