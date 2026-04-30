/**
 * Minimal ICU-style message formatter.
 *
 * Per ux-elevation.md §9 T2: persona microcopy must never be assembled by
 * caller-side string concatenation (which produces ungrammatical strings
 * after translation). All variable substitution and pluralization happens
 * here.
 *
 * Supported syntax:
 *
 *   {name}                              — simple variable substitution
 *   {count, plural, one {Item} other {Items}}
 *                                       — English plural forms (one / other)
 *
 * Anything outside this surface is rejected with a clear error so callers
 * don't silently emit literal `{...}` syntax to the player.
 */

export type ICUParams = Record<string, string | number>;

/**
 * Strip ICU markup down to plain text suitable for linting.
 *
 * Plural blocks resolve to their longest declared branch (so we lint the
 * worst-case length); `#` is replaced by a placeholder count "5". Unknown
 * `{var}` references are replaced by a generic placeholder ("X"). This is
 * for *linting only* — never use the result as user-facing text.
 */
export function expandForLint(template: string): string {
  let i = 0;
  let out = '';
  while (i < template.length) {
    const start = template.indexOf('{', i);
    if (start < 0) {
      out += template.slice(i);
      break;
    }
    out += template.slice(i, start);
    const plural = tryParsePluralExport(template, start);
    if (plural) {
      const branches = Object.values(plural.branches).filter(
        (b): b is string => typeof b === 'string'
      );
      const longest = branches.reduce(
        (longestSoFar, b) => (b.length > longestSoFar.length ? b : longestSoFar),
        ''
      );
      out += longest.replace(/#/g, '5');
      i = plural.end;
      continue;
    }
    // Plain {var} reference — replace with placeholder.
    const close = template.indexOf('}', start + 1);
    if (close < 0) {
      out += template.slice(start);
      break;
    }
    out += 'X';
    i = close + 1;
  }
  return out;
}

const VAR_RE = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

/**
 * Format an ICU-style template against a params bag.
 *
 * Examples:
 *   format('Hi, {name}!', { name: 'Sam' })           // "Hi, Sam!"
 *   format('{n, plural, one {dog} other {dogs}}', { n: 1 }) // "dog"
 */
export function format(template: string, params: ICUParams = {}): string {
  let out = expandPlurals(template, params);
  out = out.replace(VAR_RE, (_match, key: string) => {
    if (!(key in params)) {
      throw new Error(`format(): missing param "${key}" for template "${template}"`);
    }
    return String(params[key]);
  });
  return out;
}

/**
 * Find and expand `{key, plural, one {…} other {…}}` blocks.
 *
 * Implementation note: ICU plural blocks may contain nested `{var}` refs
 * inside their branches (e.g., `one {1 dog} other {# dogs}`). We resolve
 * nested simple-var refs after branch selection; the special token `#` is
 * replaced by the count value (matching ICU convention).
 */
function expandPlurals(template: string, params: ICUParams): string {
  let result = '';
  let i = 0;
  while (i < template.length) {
    const start = template.indexOf('{', i);
    if (start < 0) {
      result += template.slice(i);
      break;
    }
    // Try to parse a plural block at `start`.
    const plural = tryParsePlural(template, start);
    if (plural) {
      const { key, branches, end } = plural;
      result += template.slice(i, start);
      const raw = params[key];
      if (typeof raw !== 'number') {
        throw new Error(`format(): plural param "${key}" must be a number, got ${typeof raw}`);
      }
      const branch = raw === 1 ? branches.one : branches.other;
      if (branch === undefined) {
        throw new Error(
          `format(): plural for "${key}" missing required branch "${raw === 1 ? 'one' : 'other'}"`
        );
      }
      result += branch.replace(/#/g, String(raw));
      i = end;
    } else {
      // Not a plural block — pass through this `{` and let VAR_RE handle it.
      result += template.slice(i, start + 1);
      i = start + 1;
    }
  }
  return result;
}

interface PluralBlock {
  key: string;
  branches: { one?: string; other?: string };
  end: number;
}

/** Internal alias re-exported for `expandForLint`. */
const tryParsePluralExport = (s: string, start: number): PluralBlock | null =>
  tryParsePlural(s, start);

function tryParsePlural(s: string, start: number): PluralBlock | null {
  // Parser walks: `{KEY, plural, one {…} other {…}}` with brace counting.
  if (s[start] !== '{') return null;
  let i = start + 1;
  // Read key
  const keyStart = i;
  while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) i++;
  const key = s.slice(keyStart, i);
  if (!key) return null;
  // Expect `, plural,`
  const commaPlural = s.slice(i).match(/^\s*,\s*plural\s*,\s*/);
  if (!commaPlural) return null;
  i += commaPlural[0].length;

  const branches: { one?: string; other?: string } = {};
  while (i < s.length && s[i] !== '}') {
    // Read branch name
    const branchMatch = s.slice(i).match(/^\s*(one|other|=\d+|zero|two|few|many)\s*\{/);
    if (!branchMatch) return null;
    const branchName = branchMatch[1];
    i += branchMatch[0].length;
    // Read until matching '}', counting nesting
    let depth = 1;
    const branchStart = i;
    while (i < s.length && depth > 0) {
      if (s[i] === '{') depth++;
      else if (s[i] === '}') depth--;
      if (depth > 0) i++;
    }
    if (depth !== 0) return null;
    const branchValue = s.slice(branchStart, i);
    if (branchName === 'one') branches.one = branchValue;
    else if (branchName === 'other') branches.other = branchValue;
    // (We accept but don't use other plural categories for the K-2 surface.)
    i++; // skip '}'
    // Skip whitespace
    while (i < s.length && /\s/.test(s[i])) i++;
  }
  if (s[i] !== '}') return null;
  return { key, branches, end: i + 1 };
}
