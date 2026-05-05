/**
 * audit-unused-assets.ts
 *
 * Phase 0 asset audit toolchain — Visual Audit Plan.
 * Walks public/ for assets, cross-references against src/**\/*.{ts,tsx,json},
 * pipeline/**\/*.{py,json}, and CSS files to classify each asset as:
 *   - confirmed-used
 *   - dynamically-constructed
 *   - definitely-unreferenced
 *
 * Output:
 *   audit/unused-assets.json  — machine-readable classification
 *   public/ASSETS.md          — human-readable asset register
 *
 * Usage:
 *   npx tsx scripts/audit-unused-assets.ts
 *   npx tsx scripts/audit-unused-assets.ts --ci   # exits 1 if definitely-unreferenced is non-empty
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AssetEntry {
  relativePath: string; // relative to project root, e.g. "public/audio/sfx/phaserUp1.ogg"
  filename: string;     // basename only, e.g. "phaserUp1.ogg"
  ext: string;          // e.g. ".ogg"
  type: 'audio' | 'font' | 'image' | 'manifest' | 'other';
}

interface Reference {
  file: string;        // source file containing the reference
  snippet: string;     // the matched string
}

type AssetStatus = 'confirmed-used' | 'dynamically-constructed' | 'definitely-unreferenced';

interface ClassifiedAsset {
  relativePath: string;
  filename: string;
  type: AssetEntry['type'];
  status: AssetStatus;
  usedBy: string[];     // list of source files that reference it
  notes: string;
}

interface AuditResult {
  auditDate: string;
  summary: {
    totalAssets: number;
    confirmedUsed: number;
    dynamicallyConstructed: number;
    definitelyUnreferenced: number;
  };
  confirmedUsed: ClassifiedAsset[];
  dynamicallyConstructed: ClassifiedAsset[];
  definitelyUnreferenced: ClassifiedAsset[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PROJECT_ROOT = path.resolve(path.dirname(process.argv[1] ?? ''), '..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const AUDIT_DIR = path.join(PROJECT_ROOT, 'audit');

// Files/dirs in public/ that are not really "assets" for audit purposes
const PUBLIC_SKIP_DIRS = new Set(['curriculum']); // read separately
const PUBLIC_SKIP_FILES = new Set(['ASSETS.md', 'registerSW.js', '.gitkeep', 'README.md']);

// Extensions considered binary/data assets worth auditing
const ASSET_EXTENSIONS = new Set([
  '.ogg', '.mp3', '.wav', '.aac',         // audio
  '.woff', '.woff2', '.ttf', '.otf',       // fonts
  '.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.ico', // images
  '.json',                                 // manifests / data (if in public)
  '.txt',                                  // license files
]);

// When a basename matches a pattern with numeric suffix (e.g. "phaserUp1"),
// there's likely a dynamic template like `phaserUp${n}`. We detect these by
// looking for template-string stems in source code.
const DYNAMIC_STEM_PATTERN = /^([a-zA-Z]+)(\d+)$/;

// ── Helpers ───────────────────────────────────────────────────────────────────

function walkDir(dir: string, predicate: (p: string) => boolean): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full, predicate));
    } else if (entry.isFile() && predicate(full)) {
      results.push(full);
    }
  }
  return results;
}

function classifyAssetType(ext: string): AssetEntry['type'] {
  if (['.ogg', '.mp3', '.wav', '.aac'].includes(ext)) return 'audio';
  if (['.woff', '.woff2', '.ttf', '.otf'].includes(ext)) return 'font';
  if (['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.ico'].includes(ext)) return 'image';
  if (ext === '.json') return 'manifest';
  return 'other';
}

/** Read a file safely, returning '' on error. */
function readFileSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

/** Extract all string literals from source text (single, double, and template). */
function extractStringLiterals(src: string): string[] {
  const results: string[] = [];

  // Single-quoted strings
  for (const m of src.matchAll(/'([^'\n\\]|\\.)*'/g)) {
    results.push(m[0].slice(1, -1));
  }
  // Double-quoted strings
  for (const m of src.matchAll(/"([^"\n\\]|\\.)*"/g)) {
    results.push(m[0].slice(1, -1));
  }
  // Template literals — capture the raw template text (without evaluating ${})
  for (const m of src.matchAll(/`([^`\\]|\\.)*`/g)) {
    results.push(m[0].slice(1, -1));
  }

  return results;
}

/** From template literal content, extract the static stem portion before any ${. */
function extractTemplateStem(template: string): string | null {
  const idx = template.indexOf('${');
  if (idx === -1) return null;
  return template.slice(0, idx);
}

// ── Step 1: Collect assets from public/ ───────────────────────────────────────

function collectPublicAssets(): AssetEntry[] {
  if (!fs.existsSync(PUBLIC_DIR)) {
    console.warn('[audit] public/ directory does not exist — no assets to audit.');
    return [];
  }

  const assets: AssetEntry[] = [];
  const topLevelEntries = fs.readdirSync(PUBLIC_DIR, { withFileTypes: true });

  for (const entry of topLevelEntries) {
    if (entry.isDirectory() && PUBLIC_SKIP_DIRS.has(entry.name)) continue;

    const fullPath = path.join(PUBLIC_DIR, entry.name);
    if (entry.isDirectory()) {
      const files = walkDir(fullPath, (f) => !PUBLIC_SKIP_FILES.has(path.basename(f)));
      for (const f of files) {
        const ext = path.extname(f).toLowerCase();
        const relativePath = path.relative(PROJECT_ROOT, f).replace(/\\/g, '/');
        assets.push({
          relativePath,
          filename: path.basename(f),
          ext,
          type: classifyAssetType(ext),
        });
      }
    } else if (entry.isFile() && !PUBLIC_SKIP_FILES.has(entry.name)) {
      const ext = path.extname(entry.name).toLowerCase();
      const relativePath = path.relative(PROJECT_ROOT, fullPath).replace(/\\/g, '/');
      assets.push({
        relativePath,
        filename: entry.name,
        ext,
        type: classifyAssetType(ext),
      });
    }
  }

  return assets;
}

// ── Step 2: Collect references from source files ──────────────────────────────

interface SourceRefs {
  /** All literal filenames (basename) found in source */
  literalFilenames: Set<string>;
  /** All literal path substrings found */
  literalPaths: Set<string>;
  /** Template stems found — e.g. "phaserUp" from `phaserUp${n}.ogg` */
  templateStems: Set<string>;
  /** Map from filename/path to the source files that reference it */
  refMap: Map<string, string[]>;
}

function collectSourceReferences(sourceFiles: string[]): SourceRefs {
  const literalFilenames = new Set<string>();
  const literalPaths = new Set<string>();
  const templateStems = new Set<string>();
  const refMap = new Map<string, string[]>();

  function addRef(key: string, sourceFile: string): void {
    const existing = refMap.get(key) ?? [];
    if (!existing.includes(sourceFile)) existing.push(sourceFile);
    refMap.set(key, existing);
  }

  for (const filePath of sourceFiles) {
    const src = readFileSafe(filePath);
    const relFile = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
    const literals = extractStringLiterals(src);

    for (const lit of literals) {
      // Check for template stems (text before ${)
      const stem = extractTemplateStem(lit);
      if (stem && stem.length > 2) {
        // Remove trailing non-alphanum to get clean stem
        const cleanStem = stem.replace(/[^a-zA-Z0-9]+$/, '');
        if (cleanStem.length > 2) {
          templateStems.add(cleanStem);
          addRef(cleanStem, relFile);
        }
      }

      // Check if it looks like a filename with a known asset extension
      const basename = path.basename(lit);
      const ext = path.extname(basename).toLowerCase();
      if (ASSET_EXTENSIONS.has(ext)) {
        literalFilenames.add(basename);
        addRef(basename, relFile);
        // Also store path portions
        if (lit.includes('/')) {
          literalPaths.add(lit);
          addRef(lit, relFile);
        }
      }

      // Store any path-like strings that contain slash + asset-relevant directory names
      if (
        (lit.includes('/audio/') || lit.includes('/fonts/') || lit.includes('/icons/') ||
          lit.includes('/screenshots/')) &&
        lit.length > 3
      ) {
        literalPaths.add(lit);
        addRef(lit, relFile);
      }
    }
  }

  return { literalFilenames, literalPaths, templateStems, refMap };
}

// ── Step 3: Scan CSS files for font/asset references ─────────────────────────

function collectCSSReferences(): Map<string, string[]> {
  const cssMap = new Map<string, string[]>();
  const cssFiles = walkDir(path.join(PROJECT_ROOT, 'src'), (f) => f.endsWith('.css'));

  for (const cssFile of cssFiles) {
    const src = readFileSafe(cssFile);
    const relFile = path.relative(PROJECT_ROOT, cssFile).replace(/\\/g, '/');
    // Match url('...') or url("...")
    for (const m of src.matchAll(/url\(['"]?([^'")\s]+)['"]?\)/g)) {
      const ref = m[1] ?? '';
      const basename = path.basename(ref);
      const existing = cssMap.get(basename) ?? [];
      if (!existing.includes(relFile)) existing.push(relFile);
      cssMap.set(basename, existing);
    }
  }
  return cssMap;
}

// ── Step 4: Scan index.html for asset references ──────────────────────────────

function collectHtmlReferences(): Map<string, string[]> {
  const htmlMap = new Map<string, string[]>();
  const htmlFiles = [
    path.join(PROJECT_ROOT, 'index.html'),
    ...walkDir(PUBLIC_DIR, (f) => f.endsWith('.html')),
  ];

  for (const htmlFile of htmlFiles) {
    if (!fs.existsSync(htmlFile)) continue;
    const src = readFileSafe(htmlFile);
    const relFile = path.relative(PROJECT_ROOT, htmlFile).replace(/\\/g, '/');
    // Match href="..." and src="..." and content="..."
    for (const m of src.matchAll(/(?:href|src|content)="([^"]+)"/g)) {
      const ref = m[1] ?? '';
      const basename = path.basename(ref);
      const ext = path.extname(basename).toLowerCase();
      if (ASSET_EXTENSIONS.has(ext) || ext === '.js' || ext === '.json') {
        const existing = htmlMap.get(basename) ?? [];
        if (!existing.includes(relFile)) existing.push(relFile);
        htmlMap.set(basename, existing);
      }
    }
  }
  return htmlMap;
}

// ── Step 5: Scan vite.config for asset patterns ───────────────────────────────

function collectViteConfigReferences(): Map<string, string[]> {
  const viteMap = new Map<string, string[]>();
  const viteConfig = path.join(PROJECT_ROOT, 'vite.config.ts');
  if (!fs.existsSync(viteConfig)) return viteMap;

  const src = readFileSafe(viteConfig);
  const relFile = 'vite.config.ts';
  // Glob patterns like 'icons/*.png' or 'screenshots/*.png'
  for (const m of src.matchAll(/'([^']*\*[^']*)'/g)) {
    const pattern = m[1] ?? '';
    // Extract directory stem
    const dir = pattern.split('/')[0] ?? '';
    if (dir) {
      const existing = viteMap.get(dir) ?? [];
      if (!existing.includes(relFile)) existing.push(relFile);
      viteMap.set(dir, existing);
    }
  }
  return viteMap;
}

// ── Step 6: Classify assets ───────────────────────────────────────────────────

function classifyAssets(
  assets: AssetEntry[],
  sourceRefs: SourceRefs,
  cssRefs: Map<string, string[]>,
  htmlRefs: Map<string, string[]>,
  viteRefs: Map<string, string[]>
): ClassifiedAsset[] {
  const classified: ClassifiedAsset[] = [];

  for (const asset of assets) {
    const basename = asset.filename;
    const noExt = path.basename(basename, asset.ext);
    const usedBy: string[] = [];
    let status: AssetStatus = 'definitely-unreferenced';
    let notes = '';

    // Check direct filename reference in source
    const srcRefs = sourceRefs.refMap.get(basename) ?? [];
    if (srcRefs.length > 0) {
      usedBy.push(...srcRefs);
      status = 'confirmed-used';
    }

    // Check CSS references
    const cssFileRefs = cssRefs.get(basename) ?? [];
    if (cssFileRefs.length > 0) {
      usedBy.push(...cssFileRefs.filter((f) => !usedBy.includes(f)));
      status = 'confirmed-used';
    }

    // Check HTML references
    const htmlFileRefs = htmlRefs.get(basename) ?? [];
    if (htmlFileRefs.length > 0) {
      usedBy.push(...htmlFileRefs.filter((f) => !usedBy.includes(f)));
      status = 'confirmed-used';
    }

    // Check path-level references
    for (const [pathRef, pathRefFiles] of sourceRefs.refMap) {
      if (pathRef.includes(basename) || asset.relativePath.includes(pathRef)) {
        for (const f of pathRefFiles) {
          if (!usedBy.includes(f)) usedBy.push(f);
        }
        status = 'confirmed-used';
      }
    }

    // Check vite config glob patterns (icons/*.png → icons dir)
    if (status === 'definitely-unreferenced') {
      const publicSubdir = asset.relativePath.split('/')[1] ?? ''; // e.g. "icons"
      const viteGlobRefs = viteRefs.get(publicSubdir) ?? [];
      if (viteGlobRefs.length > 0) {
        usedBy.push(...viteGlobRefs.filter((f) => !usedBy.includes(f)));
        status = 'confirmed-used';
        notes = 'Referenced via vite.config.ts glob pattern (PWA includeAssets)';
      }
    }

    // Check dynamic template stems
    if (status === 'definitely-unreferenced') {
      const stemMatch = DYNAMIC_STEM_PATTERN.exec(noExt);
      if (stemMatch) {
        const stem = stemMatch[1] ?? '';
        for (const templateStem of sourceRefs.templateStems) {
          if (stem.toLowerCase().startsWith(templateStem.toLowerCase()) ||
            templateStem.toLowerCase().startsWith(stem.toLowerCase())) {
            const stemRefs = sourceRefs.refMap.get(templateStem) ?? [];
            usedBy.push(...stemRefs.filter((f) => !usedBy.includes(f)));
            status = 'dynamically-constructed';
            notes = `Stem "${stem}" matches template pattern "${templateStem}" — may be selected dynamically`;
            break;
          }
        }
      }
    }

    // Check if it's a numeric-suffix variant of a known literal (e.g. phaserUp2 when phaserUp1 is used)
    if (status === 'definitely-unreferenced') {
      const stemMatch = DYNAMIC_STEM_PATTERN.exec(noExt);
      if (stemMatch) {
        const stem = stemMatch[1] ?? '';
        // Check if any literal starts with the same stem
        for (const lit of sourceRefs.literalFilenames) {
          const litNoExt = path.basename(lit, path.extname(lit));
          const litStem = DYNAMIC_STEM_PATTERN.exec(litNoExt)?.[1] ?? litNoExt;
          if (litStem === stem) {
            status = 'dynamically-constructed';
            notes = `Numeric-suffix variant of "${lit}" which is directly referenced — may be a pool sibling`;
            break;
          }
        }
      }
    }

    // License and README files are "confirmed-used" (informational, kept with assets)
    if (asset.ext === '.txt' || asset.filename === 'README.md' || asset.filename === '.gitkeep') {
      status = 'confirmed-used';
      notes = 'Informational/license file kept alongside assets';
      usedBy.push('(license/documentation)');
    }

    classified.push({
      relativePath: asset.relativePath,
      filename: basename,
      type: asset.type,
      status,
      usedBy,
      notes,
    });
  }

  return classified;
}

// ── Step 7: Write audit/unused-assets.json ────────────────────────────────────

function writeAuditJson(result: AuditResult): void {
  if (!fs.existsSync(AUDIT_DIR)) {
    fs.mkdirSync(AUDIT_DIR, { recursive: true });
  }
  const outPath = path.join(AUDIT_DIR, 'unused-assets.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf-8');
  console.log(`[audit] Wrote ${outPath}`);
}

// ── Step 8: Write public/ASSETS.md ────────────────────────────────────────────

function writeAssetsMd(classified: ClassifiedAsset[]): void {
  const lines: string[] = [
    '# Asset Register — public/',
    '',
    'Auto-generated by `npm run audit:assets`. Do not edit manually.',
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    '',
    '## Summary',
    '',
  ];

  const confirmed = classified.filter((c) => c.status === 'confirmed-used');
  const dynamic = classified.filter((c) => c.status === 'dynamically-constructed');
  const orphaned = classified.filter((c) => c.status === 'definitely-unreferenced');

  lines.push(`| Status | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| confirmed-used | ${confirmed.length} |`);
  lines.push(`| dynamically-constructed | ${dynamic.length} |`);
  lines.push(`| definitely-unreferenced | ${orphaned.length} |`);
  lines.push(`| **Total** | **${classified.length}** |`);
  lines.push('');

  const typeOrder: AssetEntry['type'][] = ['audio', 'font', 'image', 'manifest', 'other'];
  const typeLabels: Record<AssetEntry['type'], string> = {
    audio: 'Audio',
    font: 'Fonts',
    image: 'Images / Icons',
    manifest: 'Manifests',
    other: 'Other',
  };

  for (const assetType of typeOrder) {
    const group = classified.filter((c) => c.type === assetType);
    if (group.length === 0) continue;

    lines.push(`## ${typeLabels[assetType]}`);
    lines.push('');
    lines.push('| Filename | Used by | Status | Notes |');
    lines.push('|----------|---------|--------|-------|');

    for (const asset of group.sort((a, b) => a.filename.localeCompare(b.filename))) {
      const usedBy = asset.usedBy.length > 0 ? asset.usedBy.join(', ') : '—';
      lines.push(
        `| \`${asset.filename}\` | ${usedBy} | ${asset.status} | ${asset.notes || '—'} |`
      );
    }
    lines.push('');
  }

  const mdPath = path.join(PUBLIC_DIR, 'ASSETS.md');
  fs.writeFileSync(mdPath, lines.join('\n'), 'utf-8');
  console.log(`[audit] Wrote ${mdPath}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main(): void {
  const ciMode = process.argv.includes('--ci');
  console.log('[audit] Starting asset audit…');

  // 1. Collect assets from public/
  const assets = collectPublicAssets();
  console.log(`[audit] Found ${assets.length} assets in public/`);

  if (assets.length === 0) {
    console.log('[audit] No assets found — nothing to audit.');
    const emptyResult: AuditResult = {
      auditDate: new Date().toISOString().slice(0, 10),
      summary: { totalAssets: 0, confirmedUsed: 0, dynamicallyConstructed: 0, definitelyUnreferenced: 0 },
      confirmedUsed: [],
      dynamicallyConstructed: [],
      definitelyUnreferenced: [],
    };
    writeAuditJson(emptyResult);
    writeAssetsMd([]);
    process.exit(0);
  }

  // 2. Collect source files (exclude worktrees, dist, node_modules, _legacy, _archive)
  const SCAN_EXCLUDES = ['.claude', 'node_modules', 'dist', '_legacy', '_archive'];
  const shouldScanFile = (f: string): boolean =>
    !SCAN_EXCLUDES.some((ex) => f.replace(/\\/g, '/').includes(`/${ex}/`));

  const srcFiles = [
    ...walkDir(path.join(PROJECT_ROOT, 'src'), (f) =>
      shouldScanFile(f) && (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.json'))
    ),
    ...walkDir(path.join(PROJECT_ROOT, 'pipeline'), (f) =>
      shouldScanFile(f) && (f.endsWith('.py') || f.endsWith('.json'))
    ),
    // Curriculum bundles explicitly
    path.join(PROJECT_ROOT, 'public', 'curriculum', 'v1.json'),
    path.join(PROJECT_ROOT, 'src', 'curriculum', 'bundle.json'),
  ].filter((f) => fs.existsSync(f));

  console.log(`[audit] Scanning ${srcFiles.length} source files…`);

  // 3. Collect references
  const sourceRefs = collectSourceReferences(srcFiles);
  const cssRefs = collectCSSReferences();
  const htmlRefs = collectHtmlReferences();
  const viteRefs = collectViteConfigReferences();

  console.log(
    `[audit] Found ${sourceRefs.literalFilenames.size} literal filenames, ` +
    `${sourceRefs.templateStems.size} template stems`
  );

  // 4. Classify
  const classified = classifyAssets(assets, sourceRefs, cssRefs, htmlRefs, viteRefs);

  const confirmed = classified.filter((c) => c.status === 'confirmed-used');
  const dynamic = classified.filter((c) => c.status === 'dynamically-constructed');
  const orphaned = classified.filter((c) => c.status === 'definitely-unreferenced');

  console.log(
    `[audit] Results: ${confirmed.length} confirmed-used, ` +
    `${dynamic.length} dynamically-constructed, ` +
    `${orphaned.length} definitely-unreferenced`
  );

  if (orphaned.length > 0) {
    console.log('[audit] Definitely-unreferenced assets:');
    for (const a of orphaned) {
      console.log(`  - ${a.relativePath}`);
    }
  }

  // 5. Build result
  const result: AuditResult = {
    auditDate: new Date().toISOString().slice(0, 10),
    summary: {
      totalAssets: classified.length,
      confirmedUsed: confirmed.length,
      dynamicallyConstructed: dynamic.length,
      definitelyUnreferenced: orphaned.length,
    },
    confirmedUsed: confirmed,
    dynamicallyConstructed: dynamic,
    definitelyUnreferenced: orphaned,
  };

  // 6. Write outputs
  writeAuditJson(result);
  writeAssetsMd(classified);

  // 7. CI gate
  if (ciMode && orphaned.length > 0) {
    console.error(
      `[audit] CI mode: ${orphaned.length} definitely-unreferenced asset(s) found. Exiting 1.`
    );
    process.exit(1);
  }

  console.log('[audit] Done.');
}

main();
