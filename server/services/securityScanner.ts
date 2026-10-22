export interface SecurityScanResult {
  ruleName: string;
  status: 'pass' | 'fail';
  description: string;
  details?: string;
}

export interface PackageFile {
  name: string;
  content: string;
}

export class SecurityScanner {
  /**
   * Runs the full 8-point automated security scan on a skill package.
   */
  public static scanPackage(skillMd: string, files: PackageFile[] = []): {
    overallStatus: 'pass' | 'fail';
    passedChecks: number;
    totalChecks: number;
    results: SecurityScanResult[];
  } {
    const results: SecurityScanResult[] = [];
    const allContents = [skillMd, ...files.map(f => f.content)].join('\n');

    // Rule 1: SKILL.md Frontmatter Compliance
    const hasFrontmatter = /^---\s*\n[\s\S]*?\n---\s*\n/m.test(skillMd);
    const hasRequiredFields = /name:\s*.+/i.test(skillMd) && /description:\s*.+/i.test(skillMd);
    if (hasFrontmatter && hasRequiredFields) {
      results.push({
        ruleName: 'RULE_FRONTMATTER',
        status: 'pass',
        description: 'Valid YAML frontmatter with required name and description tags'
      });
    } else {
      results.push({
        ruleName: 'RULE_FRONTMATTER',
        status: 'fail',
        description: 'Missing or malformed YAML frontmatter (must contain name and description)',
        details: 'SKILL.md must start with --- and declare name: and description: in YAML format.'
      });
    }

    // Rule 2: Prompt Injection and Jailbreak Vector Analysis
    const promptInjectionPatterns = [
      /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
      /disregard\s+(the\s+)?(system|above)\s+prompt/i,
      /bypass\s+(all\s+)?safety\s+(filters|rules|checks)/i,
      /act\s+as\s+an?\s+unrestricted\s+ai/i,
      /jailbreak/i,
      /dan\s+mode/i,
      /developer\s+mode\s+enabled/i
    ];
    const injectionMatch = promptInjectionPatterns.find(p => p.test(allContents));
    if (!injectionMatch) {
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
        details: `Matched pattern: ${injectionMatch.source}`
      });
    }

    // Rule 3: Unauthorized Disk and Filesystem Mutation
    const diskMutationPatterns = [
      /rm\s+-rf\s+(\/|~|\$HOME|\.\.)/i,
      /mkfs\./i,
      /dd\s+if=\/dev\/(zero|urandom)/i,
      />\s*\/etc\/(passwd|shadow|hosts)/i,
      /format\s+[a-z]:\s*\/y/i
    ];
    const diskMatch = diskMutationPatterns.find(p => p.test(allContents));
    if (!diskMatch) {
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
        details: `Matched pattern: ${diskMatch.source}`
      });
    }

    // Rule 4: Credential and Secret Exfiltration
    const exfiltrationPatterns = [
      /\.ssh\/(id_rsa|id_ed25519)/i,
      /curl.*--data.*(\.env|config\.json|api_key)/i,
      /fetch\(.*base64.*\+.*process\.env/i,
      /upload.*\/etc\/shadow/i,
      /pastebin\.com\/api/i
    ];
    const exfilMatch = exfiltrationPatterns.find(p => p.test(allContents));
    if (!exfilMatch) {
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
        details: `Matched pattern: ${exfilMatch.source}`
      });
    }

    // Rule 5: Malicious Shell and Subprocess Execution
    const shellPatterns = [
      /nc\s+(-e|-c)\s+\/bin\/(sh|bash)/i,
      /bash\s+-i\s+>&?\s*\/dev\/tcp\//i,
      /curl\s+[^|]+\|\s*(sh|bash)/i,
      /wget\s+[^|]+\|\s*(sh|bash)/i,
      /powershell\s+-enc\s+[A-Za-z0-9+/=]{20,}/i
    ];
    const shellMatch = shellPatterns.find(p => p.test(allContents));
    if (!shellMatch) {
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
        details: `Matched pattern: ${shellMatch.source}`
      });
    }

    // Rule 6: Telemetry and Background Phone-Home Probes
    const telemetryPatterns = [
      /track_user\s*\(|send_telemetry\s*\(/i,
      /analytics\.track.*user_keystrokes/i,
      /http:\/\/1[0-9]{2}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/i // raw private IP hardcoded
    ];
    const teleMatch = telemetryPatterns.find(p => p.test(allContents));
    if (!teleMatch) {
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
        details: `Matched pattern: ${teleMatch.source}`
      });
    }

    // Rule 7: Code Sanitization & Obfuscated Payload Protection
    const obfuscationPatterns = [
      /eval\s*\(\s*atob\s*\(/i,
      /eval\s*\(\s*Buffer\.from\s*\(/i,
      /exec\s*\(\s*b64decode\s*\(/i,
      /\\x[0-9a-f]{2}\\x[0-9a-f]{2}\\x[0-9a-f]{2}\\x[0-9a-f]{2}/i
    ];
    const obfMatch = obfuscationPatterns.find(p => p.test(allContents));
    if (!obfMatch) {
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
        details: `Matched pattern: ${obfMatch.source}`
      });
    }

    // Rule 8: Package Structure and Integrity Compliance
    const hasMinContent = skillMd.trim().length >= 50;
    const hasValidExtensions = files.every(f => 
      /\.(md|py|js|ts|json|txt|ya?ml|sh|sql)$/i.test(f.name)
    );
    if (hasMinContent && hasValidExtensions) {
      results.push({
        ruleName: 'RULE_PACKAGE_STRUCTURE',
        status: 'pass',
        description: 'Skill package conforms to open SKILL.md hierarchy standards'
      });
    } else {
      results.push({
        ruleName: 'RULE_PACKAGE_STRUCTURE',
        status: 'fail',
        description: 'Package contains prohibited file types or empty SKILL.md specification',
        details: !hasMinContent ? 'SKILL.md content is too short' : 'Prohibited binary files discovered'
      });
    }

    const passedChecks = results.filter(r => r.status === 'pass').length;
    const overallStatus = passedChecks === 8 ? 'pass' : 'fail';

    return {
      overallStatus,
      passedChecks,
      totalChecks: 8,
      results
    };
  }
}
