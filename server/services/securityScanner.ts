export interface SecurityScanResult {
  id?: string;
  ruleName: string;
  status: 'pass' | 'warning' | 'fail' | 'not_run';
  description: string;
  details?: string;
  findings?: string[];
}

export interface PackageFile {
  name: string;
  content: string;
}

export class SecurityScanner {
  /**
   * Runs the full automated security scan on a skill package.
   * Does NOT execute uploaded scripts.
   * Inspects metadata, file paths, prompt injection, credentials,
   * dangerous commands, external requests, zip traversal, file access, and extensions.
   */
  public static scanPackage(skillMd: string, files: PackageFile[] = []): {
    overallStatus: 'pass' | 'fail';
    passedChecks: number;
    warningChecks: number;
    totalChecks: number;
    results: SecurityScanResult[];
  } {
    const results: SecurityScanResult[] = [];
    const allContents = [skillMd, ...files.map(f => f.content)].join('\n');

    // Rule 1: SKILL.md Frontmatter & Metadata Compliance
    const hasFrontmatter = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*/m.test(skillMd);
    const hasRequiredName = /name:\s*.+/i.test(skillMd);
    const hasRequiredDesc = /description:\s*.+/i.test(skillMd);

    if (!hasFrontmatter) {
      results.push({
        ruleName: 'RULE_FRONTMATTER',
        status: 'fail',
        description: 'Missing or malformed YAML frontmatter (must start with ---)',
        details: 'SKILL.md must begin with a valid YAML frontmatter block enclosed in --- delimiters declaring name and description.',
        findings: ['No YAML frontmatter block detected at top of SKILL.md']
      });
    } else if (!hasRequiredName || !hasRequiredDesc) {
      const missing: string[] = [];
      if (!hasRequiredName) missing.push('name');
      if (!hasRequiredDesc) missing.push('description');
      results.push({
        ruleName: 'RULE_FRONTMATTER',
        status: 'fail',
        description: `Missing required YAML frontmatter fields: ${missing.join(', ')}`,
        details: 'The frontmatter must declare both "name" and "description" fields.',
        findings: missing.map(m => `Missing field: ${m}`)
      });
    } else {
      // Check for valid version and non-empty body
      const bodyMatch = skillMd.replace(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*/m, '').trim();
      if (bodyMatch.length < 20) {
        results.push({
          ruleName: 'RULE_FRONTMATTER',
          status: 'warning',
          description: 'Frontmatter is valid, but markdown body instructions are minimal',
          details: 'Provide comprehensive instructions in markdown below the frontmatter.',
          findings: ['Markdown body contains fewer than 20 characters']
        });
      } else {
        results.push({
          ruleName: 'RULE_FRONTMATTER',
          status: 'pass',
          description: 'Valid YAML frontmatter with required name and description tags'
        });
      }
    }

    // Rule 2: Prompt Injection and Jailbreak Vector Analysis
    const promptInjectionPatterns: { pattern: RegExp; label: string }[] = [
      { pattern: /ignore\s+(all\s+)?(previous|prior)\s+instructions/i, label: 'Instruction override vector' },
      { pattern: /disregard\s+(the\s+)?(system|above)\s+prompt/i, label: 'System prompt disregard vector' },
      { pattern: /bypass\s+(all\s+)?safety\s+(filters|rules|checks)/i, label: 'Safety filter bypass attempt' },
      { pattern: /act\s+as\s+an?\s+unrestricted\s+ai/i, label: 'Unrestricted persona induction' },
      { pattern: /jailbreak/i, label: 'Explicit jailbreak keyword' },
      { pattern: /dan\s+mode/i, label: 'Do Anything Now (DAN) mode injection' },
      { pattern: /developer\s+mode\s+enabled/i, label: 'Developer mode exploit pattern' },
      { pattern: /reveal\s+(the\s+)?(system\s+prompt|hidden\s+prompt|secret\s+instructions)/i, label: 'System prompt extraction vector' }
    ];

    const injectionFindings: string[] = [];
    for (const p of promptInjectionPatterns) {
      const match = allContents.match(p.pattern);
      if (match) {
        injectionFindings.push(`${p.label} (matched: "${match[0].slice(0, 40)}")`);
      }
    }

    if (injectionFindings.length === 0) {
      results.push({
        ruleName: 'RULE_PROMPT_INJECTION',
        status: 'pass',
        description: 'Zero prompt injection, jailbreak, or system override vectors detected'
      });
    } else {
      results.push({
        ruleName: 'RULE_PROMPT_INJECTION',
        status: 'fail',
        description: 'Suspicious prompt override or jailbreak pattern detected',
        details: `Identified injection vectors: ${injectionFindings.join('; ')}`,
        findings: injectionFindings
      });
    }

    // Rule 3: Unauthorized Disk and Destructive Commands
    const destructivePatterns: { pattern: RegExp; label: string }[] = [
      { pattern: /rm\s+-rf\s+(\/|~|\$HOME|\.\.)/i, label: 'Recursive root/home directory deletion (rm -rf)' },
      { pattern: /mkfs\./i, label: 'Filesystem formatting (mkfs)' },
      { pattern: /dd\s+if=\/dev\/(zero|urandom)/i, label: 'Raw block device overwrite (dd)' },
      { pattern: />\s*\/etc\/(passwd|shadow|hosts)/i, label: 'System file overwrite redirection' },
      { pattern: /format\s+[a-z]:\s*\/y/i, label: 'Windows drive format command' },
      { pattern: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, label: 'Bash fork bomb execution attempt' },
      { pattern: /del\s+\/f\s+\/s\s+\/q\s+[c-z]:\\/i, label: 'Recursive Windows drive deletion' },
      { pattern: /chmod\s+(-R\s+)?777\s+\//i, label: 'Insecure root permissions alteration (chmod 777)' }
    ];

    const destructiveFindings: string[] = [];
    for (const p of destructivePatterns) {
      const match = allContents.match(p.pattern);
      if (match) {
        destructiveFindings.push(`${p.label} (matched: "${match[0].slice(0, 40)}")`);
      }
    }

    if (destructiveFindings.length === 0) {
      results.push({
        ruleName: 'RULE_DISK_MUTATION',
        status: 'pass',
        description: 'No destructive filesystem or disk formatting commands observed'
      });
    } else {
      results.push({
        ruleName: 'RULE_DISK_MUTATION',
        status: 'fail',
        description: 'Destructive disk mutation command flagged',
        details: `Identified destructive commands: ${destructiveFindings.join('; ')}`,
        findings: destructiveFindings
      });
    }

    // Rule 4: Credential and Secret Exfiltration & Excessive File Access
    const secretPatterns: { pattern: RegExp; label: string }[] = [
      { pattern: /\.ssh\/(id_rsa|id_ed25519|authorized_keys)/i, label: 'SSH private key or credential access' },
      { pattern: /curl.*--data.*(\.env|config\.json|api_key)/i, label: 'Environment or secret exfiltration via curl' },
      { pattern: /fetch\(.*base64.*\+.*process\.env/i, label: 'process.env exfiltration via fetch' },
      { pattern: /\/(etc\/shadow|etc\/passwd|etc\/master\.passwd)/i, label: 'Privileged system account file access' },
      { pattern: /pastebin\.com\/api/i, label: 'Exfiltration to Pastebin API' },
      { pattern: /(AKIA[0-9A-Z]{16})/, label: 'Hardcoded AWS Access Key ID' },
      { pattern: /-----BEGIN\s+((RSA|EC|OPENSSH|PGP)\s+)?PRIVATE\s+KEY-----/, label: 'Exposed raw cryptographic private key' },
      { pattern: /ghp_[a-zA-Z0-9]{36}/, label: 'Exposed GitHub Personal Access Token' },
      { pattern: /sk-[a-zA-Z0-9]{32,}/, label: 'Exposed OpenAI or AI platform secret key' }
    ];

    const secretFindings: string[] = [];
    for (const p of secretPatterns) {
      const match = allContents.match(p.pattern);
      if (match) {
        secretFindings.push(`${p.label} (matched: "${match[0].slice(0, 40)}")`);
      }
    }

    if (secretFindings.length === 0) {
      results.push({
        ruleName: 'RULE_EXFILTRATION',
        status: 'pass',
        description: 'Protected against private key, token, or secret exfiltration'
      });
    } else {
      results.push({
        ruleName: 'RULE_EXFILTRATION',
        status: 'fail',
        description: 'Attempt to read or transmit credentials or environment secrets flagged',
        details: `Identified exposed secret or exfiltration pattern: ${secretFindings.join('; ')}`,
        findings: secretFindings
      });
    }

    // Rule 5: Malicious Shell and Subprocess Execution
    const shellPatterns: { pattern: RegExp; label: string }[] = [
      { pattern: /nc\s+(-e|-c)\s+\/bin\/(sh|bash)/i, label: 'Netcat reverse shell execution' },
      { pattern: /bash\s+-i\s+>&?\s*\/dev\/tcp\//i, label: 'Bash interactive socket reverse shell' },
      { pattern: /curl\s+[^|]+\|\s*(sh|bash)/i, label: 'Unverified web payload piped directly into shell' },
      { pattern: /wget\s+[^|]+\|\s*(sh|bash)/i, label: 'Unverified wget payload piped directly into shell' },
      { pattern: /powershell\s+-enc\s+[A-Za-z0-9+/=]{20,}/i, label: 'Base64 encoded hidden PowerShell execution' }
    ];

    const shellFindings: string[] = [];
    for (const p of shellPatterns) {
      const match = allContents.match(p.pattern);
      if (match) {
        shellFindings.push(`${p.label} (matched: "${match[0].slice(0, 40)}")`);
      }
    }

    if (shellFindings.length === 0) {
      results.push({
        ruleName: 'RULE_SHELL_EXECUTION',
        status: 'pass',
        description: 'No unauthorized reverse shells, piped web scripts, or encoded commands'
      });
    } else {
      results.push({
        ruleName: 'RULE_SHELL_EXECUTION',
        status: 'fail',
        description: 'Malicious shell or reverse network terminal identified',
        details: `Identified shell patterns: ${shellFindings.join('; ')}`,
        findings: shellFindings
      });
    }

    // Rule 6: Telemetry and Background Phone-Home Probes (exempt loopback/localhost)
    const telemetryPatterns: { pattern: RegExp; label: string }[] = [
      { pattern: /track_user\s*\(|send_telemetry\s*\(/i, label: 'Covert user telemetry tracking function' },
      { pattern: /analytics\.track.*user_keystrokes/i, label: 'Keylogger / keystroke capture attempt' },
      { pattern: /http:\/\/(?!127\.0\.0\.1|0\.0\.0\.0)1[0-9]{2}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/i, label: 'Hardcoded raw private IP beacon address' },
      { pattern: /webhook\.site\/[a-z0-9-]{36}/i, label: 'Exfiltration to public webhook sink' }
    ];

    const teleFindings: string[] = [];
    for (const p of telemetryPatterns) {
      const match = allContents.match(p.pattern);
      if (match) {
        teleFindings.push(`${p.label} (matched: "${match[0].slice(0, 40)}")`);
      }
    }

    if (teleFindings.length === 0) {
      results.push({
        ruleName: 'RULE_TELEMETRY_PROBES',
        status: 'pass',
        description: 'Zero covert background tracking beacons or unauthorized telemetry'
      });
    } else {
      results.push({
        ruleName: 'RULE_TELEMETRY_PROBES',
        status: 'fail',
        description: 'Unauthorized background tracking or raw IP communication flagged',
        details: `Identified telemetry vectors: ${teleFindings.join('; ')}`,
        findings: teleFindings
      });
    }

    // Rule 7: Code Sanitization & Obfuscated Payload Protection
    const obfuscationPatterns: { pattern: RegExp; label: string }[] = [
      { pattern: /eval\s*\(\s*atob\s*\(/i, label: 'Base64 decoded eval execution' },
      { pattern: /eval\s*\(\s*Buffer\.from\s*\(/i, label: 'Buffer decoded eval execution' },
      { pattern: /exec\s*\(\s*b64decode\s*\(/i, label: 'Python base64 exec execution' },
      { pattern: /\\x[0-9a-f]{2}\\x[0-9a-f]{2}\\x[0-9a-f]{2}\\x[0-9a-f]{2}/i, label: 'Hex-escaped binary shellcode sequence' }
    ];

    const obfFindings: string[] = [];
    for (const p of obfuscationPatterns) {
      const match = allContents.match(p.pattern);
      if (match) {
        obfFindings.push(`${p.label} (matched: "${match[0].slice(0, 40)}")`);
      }
    }

    if (obfFindings.length === 0) {
      results.push({
        ruleName: 'RULE_SANITIZED_OUTPUT',
        status: 'pass',
        description: 'Source code is transparent, human-readable, and free of eval obfuscation'
      });
    } else {
      results.push({
        ruleName: 'RULE_SANITIZED_OUTPUT',
        status: 'fail',
        description: 'Obfuscated or dynamically evaluated code pattern detected',
        details: `Identified obfuscation patterns: ${obfFindings.join('; ')}`,
        findings: obfFindings
      });
    }

    // Rule 8: Package Structure, Filename Safety & Integrity Compliance
    const hasMinContent = skillMd.trim().length >= 50;
    const structureFindings: string[] = [];

    // Check for ZIP path traversal and unsafe filenames
    for (const file of files) {
      const name = file.name;
      // Traversal check
      if (name.includes('..') || name.startsWith('/') || name.startsWith('\\') || /^[a-zA-Z]:/.test(name)) {
        structureFindings.push(`Path traversal or absolute path detected: "${name}"`);
      }
      // Control characters or null bytes
      if (/[\x00-\x1F\x7F]/.test(name)) {
        structureFindings.push(`Invalid control characters in filename: "${name}"`);
      }
      // Dangerous executable/binary extensions
      if (/\.(exe|dll|so|dylib|bin|bat|cmd|com|msi|vbs|scr|pif|app|dmg|iso)$/i.test(name)) {
        structureFindings.push(`Prohibited binary/executable file discovered: "${name}"`);
      }
      // File size limits (max 5MB per supporting file)
      if (file.content && Buffer.byteLength(file.content) > 5 * 1024 * 1024) {
        structureFindings.push(`File exceeds 5MB size limit: "${name}"`);
      }
    }

    // Total package size limit (max 15MB)
    const totalBytes = Buffer.byteLength(skillMd) + files.reduce((acc, f) => acc + Buffer.byteLength(f.content || ''), 0);
    if (totalBytes > 15 * 1024 * 1024) {
      structureFindings.push('Total package size exceeds 15MB limit');
    }

    if (!hasMinContent) {
      structureFindings.push('SKILL.md content is too short (must be at least 50 characters)');
    }

    const hasProhibitedExtensions = structureFindings.some(f => f.includes('Prohibited') || f.includes('traversal'));

    if (hasProhibitedExtensions || !hasMinContent) {
      results.push({
        ruleName: 'RULE_PACKAGE_STRUCTURE',
        status: 'fail',
        description: 'Package contains prohibited file types or empty SKILL.md specification',
        details: !hasMinContent ? 'SKILL.md content is too short' : structureFindings.join('; '),
        findings: structureFindings
      });
    } else if (structureFindings.length > 0) {
      results.push({
        ruleName: 'RULE_PACKAGE_STRUCTURE',
        status: 'warning',
        description: 'Package structure issues detected',
        details: structureFindings.join('; '),
        findings: structureFindings
      });
    } else {
      results.push({
        ruleName: 'RULE_PACKAGE_STRUCTURE',
        status: 'pass',
        description: 'Skill package conforms to open SKILL.md hierarchy standards'
      });
    }

    const passedChecks = results.filter(r => r.status === 'pass').length;
    const warningChecks = results.filter(r => r.status === 'warning').length;
    const failedChecks = results.filter(r => r.status === 'fail').length;
    const overallStatus = failedChecks === 0 ? 'pass' : 'fail';

    const normalizedResults = results.map(r => ({
      id: r.ruleName,
      ...r
    }));

    return {
      overallStatus,
      passedChecks,
      warningChecks,
      totalChecks: 8,
      results: normalizedResults
    };
  }
}
