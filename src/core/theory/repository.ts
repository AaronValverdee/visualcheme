import { parseTheoryDocument } from './markdown_parser';
import { TheoryDoc, TheoryNavGroup, TheorySearchHit } from './types';

const SECTION_META: Record<string, { label: string; priority: number }> = {
  overview: { label: 'Overview & Reference', priority: 0 },
  fundamentals: { label: 'Shared Fundamentals', priority: 1 },
  'pipe-flow': { label: 'Pipe Flow', priority: 2 },
  'heat-exchangers': { label: 'Heat Exchangers', priority: 3 },
  'phase-separators': { label: 'Phase Separators', priority: 4 },
  distillation: { label: 'Distillation Columns', priority: 5 },
  reactors: { label: 'Reactors & Mixers', priority: 6 },
  'exergy-and-pinch': { label: 'Exergy & Pinch', priority: 7 }
};

const SHORT_TITLE_OVERRIDES: Record<string, string> = {
  README: 'Theoretical Foundations',
  nomenclature: 'Nomenclature & Conventions',
  'fundamentals/01-thermophysical-properties': '01 · Thermophysical Properties',
  'fundamentals/02-conservation-and-second-law': '02 · Conservation & Second Law',
  'pipe-flow/README': 'UI-to-Theory Map',
  'pipe-flow/01-flow-regimes-and-velocity-profiles': '01 · Flow Regimes & Velocity',
  'pipe-flow/02-friction-and-moody-diagram': '02 · Friction & Moody Chart',
  'pipe-flow/03-minor-losses-fittings-and-valves': '03 · Minor Losses & Valves',
  'pipe-flow/04-grade-lines-and-elevation': '04 · Grade Lines & Elevation',
  'pipe-flow/05-centrifugal-pumps-and-npsh': '05 · Centrifugal Pumps & NPSH',
  'pipe-flow/06-validity-phase-change-and-presets': '06 · Validity, Flashing & Presets',
  'pipe-flow/07-textbook-contrast-and-audit': '07 · Textbook Contrast & Audit'
};

function titleCaseKebab(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function deriveShortTitle(slug: string, fullTitle: string): string {
  if (SHORT_TITLE_OVERRIDES[slug]) return SHORT_TITLE_OVERRIDES[slug];
  const base = slug.split('/').pop() || slug;
  const numMatch = base.match(/^(\d+)-(.+)$/);
  if (numMatch) {
    return `${numMatch[1]} · ${titleCaseKebab(numMatch[2])}`;
  }
  return fullTitle.length > 36 ? `${fullTitle.slice(0, 34).trimEnd()}…` : fullTitle;
}

function docOrderInSection(slug: string): number {
  const base = slug.split('/').pop() || slug;
  if (base === 'README') return 0;
  if (base === 'nomenclature') return 1;
  const m = base.match(/^(\d+)-/);
  if (m) return 10 + Number(m[1]);
  return 100;
}

const rawTheoryFiles = import.meta.glob('../../../docs/theory/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

export class TheoryRepository {
  private static docs: TheoryDoc[] = [];
  private static bySlug: Map<string, TheoryDoc> = new Map();
  private static byId: Map<string, TheoryDoc> = new Map();
  private static byUiElement: Map<string, TheoryDoc[]> = new Map();
  private static initialized = false;

  private static ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;

    const entries: TheoryDoc[] = [];

    for (const [rawPath, content] of Object.entries(rawTheoryFiles)) {
      const idx = rawPath.indexOf('docs/theory/');
      const relPath = idx >= 0 ? rawPath.slice(idx + 'docs/theory/'.length) : rawPath;
      const slug = relPath.replace(/\.md$/i, '');
      const parts = slug.split('/');
      const section = parts.length > 1 ? parts[0] : 'overview';
      const secMeta = SECTION_META[section] ?? { label: titleCaseKebab(section), priority: 10 };

      const parsed = parseTheoryDocument(slug, content);
      const title = parsed.frontmatter.title || titleCaseKebab(parts[parts.length - 1]);
      const order = secMeta.priority * 1000 + docOrderInSection(slug);

      const doc: TheoryDoc = {
        slug,
        filePath: relPath,
        section,
        sectionLabel: secMeta.label,
        shortTitle: deriveShortTitle(slug, title),
        title,
        excerpt: parsed.excerpt,
        leadEquation: parsed.leadEquation,
        frontmatter: parsed.frontmatter,
        markdown: parsed.markdown,
        html: parsed.html,
        headings: parsed.headings,
        searchText: parsed.searchText,
        order
      };

      entries.push(doc);
    }

    entries.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
    this.docs = entries;

    for (const doc of entries) {
      this.bySlug.set(doc.slug, doc);
      if (doc.frontmatter.id) {
        this.byId.set(doc.frontmatter.id, doc);
      }
      for (const el of doc.frontmatter.ui_elements) {
        const key = el.trim().toLowerCase();
        if (!key || key === 'all') continue;
        const list = this.byUiElement.get(key) ?? [];
        list.push(doc);
        this.byUiElement.set(key, list);
      }
    }
  }

  public static getAllDocs(): TheoryDoc[] {
    this.ensureInitialized();
    return this.docs;
  }

  public static getDoc(slugOrId: string): TheoryDoc | undefined {
    this.ensureInitialized();
    const cleaned = slugOrId.replace(/^\/+|\/+$/g, '').replace(/\.md$/i, '');
    if (!cleaned || cleaned === 'index') return this.bySlug.get('README');
    return this.bySlug.get(cleaned) ?? this.byId.get(cleaned);
  }

  public static getNavGroups(): TheoryNavGroup[] {
    this.ensureInitialized();
    const groups = new Map<string, TheoryNavGroup>();
    for (const doc of this.docs) {
      let g = groups.get(doc.section);
      if (!g) {
        g = { key: doc.section, label: doc.sectionLabel, docs: [] };
        groups.set(doc.section, g);
      }
      g.docs.push(doc);
    }
    return Array.from(groups.values());
  }

  public static getNeighbors(slug: string): { prev: TheoryDoc | null; next: TheoryDoc | null } {
    this.ensureInitialized();
    const idx = this.docs.findIndex((d) => d.slug === slug);
    if (idx < 0) return { prev: null, next: null };
    return {
      prev: idx > 0 ? this.docs[idx - 1] : null,
      next: idx < this.docs.length - 1 ? this.docs[idx + 1] : null
    };
  }

  public static findByUiElement(elementId: string): TheoryDoc | undefined {
    this.ensureInitialized();
    return this.byUiElement.get(elementId.trim().toLowerCase())?.[0];
  }

  public static search(rawQuery: string, limit = 12): TheorySearchHit[] {
    this.ensureInitialized();
    const query = rawQuery.trim().toLowerCase();
    if (!query) return [];

    const tokens = query.split(/\s+/).filter(Boolean);
    const hits: TheorySearchHit[] = [];

    for (const doc of this.docs) {
      let score = 0;
      const titleLower = doc.title.toLowerCase();
      const shortLower = doc.shortTitle.toLowerCase();

      if (titleLower.includes(query)) score += 30;
      if (shortLower.includes(query)) score += 20;

      let matchedHeading = doc.headings.find((h) => h.text.toLowerCase().includes(query));
      if (matchedHeading) score += 18;

      let allMatch = true;
      for (const tok of tokens) {
        let tokScore = 0;
        if (titleLower.includes(tok)) tokScore += 10;
        if (doc.frontmatter.ui_elements.some((u) => u.toLowerCase().includes(tok))) tokScore += 8;
        const headingHit = doc.headings.find((h) => h.text.toLowerCase().includes(tok));
        if (headingHit) {
          tokScore += 7;
          if (!matchedHeading) matchedHeading = headingHit;
        }
        if (doc.frontmatter.references.some((r) => r.toLowerCase().includes(tok))) tokScore += 4;
        if (doc.searchText.includes(tok)) tokScore += 2;

        if (tokScore === 0) {
          allMatch = false;
          break;
        }
        score += tokScore;
      }

      if (!allMatch || score === 0) continue;

      const snippet = buildSnippet(doc.markdown, tokens[0], doc.excerpt);
      hits.push({ doc, matchedHeading, snippet, score });
    }

    hits.sort((a, b) => b.score - a.score || a.doc.order - b.doc.order);
    return hits.slice(0, limit);
  }
}

function buildSnippet(markdown: string, token: string, fallback: string): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`#>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const idx = plain.toLowerCase().indexOf(token);
  if (idx < 0) return fallback;
  const start = Math.max(0, idx - 60);
  const end = Math.min(plain.length, idx + 120);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < plain.length ? '…' : '';
  return `${prefix}${plain.slice(start, end).trim()}${suffix}`;
}
