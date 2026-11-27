import katex from 'katex';
import { marked, Renderer } from 'marked';
import { TheoryFrontmatter, TheoryHeading } from './types';

export interface ParsedTheoryMarkdown {
  frontmatter: TheoryFrontmatter;
  markdown: string;
  html: string;
  headings: TheoryHeading[];
  excerpt: string;
  leadEquation?: string;
  searchText: string;
}

/**
 * Render a LaTeX math string to HTML via KaTeX, never throwing on malformed input.
 */
export function renderLatex(tex: string, displayMode = false): string {
  try {
    return katex.renderToString(tex.trim(), {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
      trust: false
    });
  } catch {
    return escapeHtml(tex);
  }
}

/**
 * Render short inline text that may contain `$...$` LaTeX fragments and `**bold**` / `` `code` ``.
 * Used for hover-preview summaries and TOC labels.
 */
export function renderInlineRichText(text: string): string {
  const mathTokens: string[] = [];
  const protectedText = protectInlineMath(text, mathTokens);
  let html = escapeHtml(protectedText);
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = applyCitationBadges(html);
  html = html.replace(/@@INLINE_MATH_(\d+)@@/g, (_, idx) => {
    const tex = mathTokens[Number(idx)] ?? '';
    return renderLatex(tex, false);
  });
  return html;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Convert a markdown heading (which may contain `$...$` LaTeX or backticks) into a clean,
 * stable URL anchor slug.
 */
export function slugifyHeading(raw: string): string {
  const cleaned = decodeHtmlEntities(raw)
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\mathrm\{([^}]*)\}/g, '$1')
    .replace(/\\operatorname\{([^}]*)\}/g, '$1')
    .replace(/\\ne\b/g, 'ne')
    .replace(/\\le\b/g, 'le')
    .replace(/\\ge\b/g, 'ge')
    .replace(/\\varepsilon/g, 'epsilon')
    .replace(/\\Delta/g, 'delta')
    .replace(/\\eta\b/g, 'eta')
    .replace(/\\mu\b/g, 'mu')
    .replace(/\\rho\b/g, 'rho')
    .replace(/\\beta\b/g, 'beta')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[$`{}^*_~()[\]#']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[–—]/g, '-')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return cleaned || 'section';
}

/**
 * Parse YAML frontmatter block (`---\n...\n---`) from a theory markdown file.
 */
export function parseFrontmatter(raw: string): { frontmatter: TheoryFrontmatter; body: string } {
  const normalized = raw.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const fm: TheoryFrontmatter = {
    id: '',
    title: '',
    ui_elements: [],
    code_files: [],
    references: []
  };

  if (!match) {
    return { frontmatter: fm, body: normalized };
  }

  const yamlBlock = match[1];
  const body = match[2];
  let activeArrayKey: 'ui_elements' | 'code_files' | 'references' | null = null;

  for (const line of yamlBlock.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('- ') && activeArrayKey) {
      const val = stripQuotes(trimmed.slice(2).trim());
      if (val) fm[activeArrayKey].push(val);
      continue;
    }

    const kv = trimmed.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const value = stripQuotes(kv[2].trim());
    activeArrayKey = null;

    if (key === 'id') fm.id = value;
    else if (key === 'title') fm.title = value;
    else if (key === 'unit') fm.unit = value;
    else if (key === 'scope') fm.scope = value;
    else if (key === 'ui_elements') {
      activeArrayKey = 'ui_elements';
      if (value) fm.ui_elements.push(value);
    } else if (key === 'code_files') {
      activeArrayKey = 'code_files';
      if (value) fm.code_files.push(value);
    } else if (key === 'references' || key === 'primary_references') {
      activeArrayKey = 'references';
      if (value) fm.references.push(value);
    }
  }

  return { frontmatter: fm, body };
}

function stripQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1).replace(/\\"/g, '"');
  }
  return value;
}

/**
 * Resolve a relative `.md` link inside `docs/theory/` into a normalized doc slug and optional anchor.
 */
export function resolveTheoryHref(currentDocSlug: string, href: string): { slug: string; anchor?: string } | null {
  if (!href || /^(https?:|mailto:|#)/i.test(href)) return null;
  const [pathPart, hashPart] = href.split('#');
  if (!pathPart.endsWith('.md')) return null;

  const currentParts = currentDocSlug.split('/').slice(0, -1);
  const relParts = pathPart.split('/');
  const resolved: string[] = [...currentParts];

  for (const seg of relParts) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      resolved.pop();
    } else {
      resolved.push(seg);
    }
  }

  if (resolved.length === 0) return null;
  const last = resolved[resolved.length - 1].replace(/\.md$/i, '');
  resolved[resolved.length - 1] = last;
  return {
    slug: resolved.join('/'),
    anchor: hashPart ? slugifyHeading(decodeURIComponent(hashPart)) : undefined
  };
}

interface ExtractedMath {
  text: string;
  displayBlocks: string[];
  inlineBlocks: string[];
}

/**
 * Protect fenced code blocks, inline code spans, display `$$...$$` math, and inline `$...$` math
 * so that GFM markdown parsing never corrupts LaTeX underscores, asterisks, or pipe symbols.
 */
function extractMathSafe(markdown: string): ExtractedMath {
  const displayBlocks: string[] = [];
  const inlineBlocks: string[] = [];

  // Step 1: Split out fenced code blocks (```...```) so we never touch them.
  const segments = markdown.split(/(```[\s\S]*?```)/g);

  const processed = segments.map((seg, segIdx) => {
    if (segIdx % 2 === 1) return seg; // Inside fenced code block

    // Step 2: Temporarily shield inline code (`...`)
    const codeSpans: string[] = [];
    let s = seg.replace(/`[^`\n]+`/g, (m) => {
      const idx = codeSpans.push(m) - 1;
      return `@@CODE_SPAN_${idx}@@`;
    });

    // Step 3: Extract display math $$...$$ (supports multiline & blockquote-prefixed lines)
    s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, inner: string) => {
      // Strip leading `> ` inside multiline display math if nested in a blockquote
      const cleanedTex = inner.replace(/^\s*>\s?/gm, '').trim();
      const idx = displayBlocks.push(cleanedTex) - 1;
      return `@@KATEX_DISPLAY_${idx}@@`;
    });

    // Step 4: Extract inline math $...$
    s = protectInlineMath(s, inlineBlocks, '@@KATEX_INLINE_');

    // Restore inline code spans
    s = s.replace(/@@CODE_SPAN_(\d+)@@/g, (_, idx) => codeSpans[Number(idx)] ?? '');
    return s;
  });

  return {
    text: processed.join(''),
    displayBlocks,
    inlineBlocks
  };
}

function protectInlineMath(input: string, store: string[], prefix = '@@INLINE_MATH_'): string {
  let out = '';
  let i = 0;
  while (i < input.length) {
    if (input[i] === '\\' && input[i + 1] === '$') {
      out += '\\$';
      i += 2;
      continue;
    }
    if (input[i] === '$' && input[i + 1] !== '$' && input[i + 1] !== ' ' && input[i + 1] !== '\t' && input[i + 1] !== '\n') {
      let j = i + 1;
      let found = -1;
      while (j < input.length) {
        if (input[j] === '\n' && input[j + 1] === '\n') break;
        if (input[j] === '\\') {
          j += 2;
          continue;
        }
        if (input[j] === '$' && input[j - 1] !== ' ' && input[j - 1] !== '\t') {
          // Ensure closing `$` is not immediately followed by a digit (currency guard)
          const next = input[j + 1];
          if (!next || !/[0-9]/.test(next)) {
            found = j;
            break;
          }
        }
        j++;
      }
      if (found > i + 1) {
        const tex = input.slice(i + 1, found).trim();
        const idx = store.push(tex) - 1;
        out += `${prefix}${idx}@@`;
        i = found + 1;
        continue;
      }
    }
    out += input[i];
    i++;
  }
  return out;
}

function applyCitationBadges(html: string): string {
  return html
    .replace(
      /<strong>\[T&amp;S\]<\/strong>/g,
      '<span class="cite-tag cite-ts" title="Towler &amp; Sinnott (2013), Chemical Engineering Design, 2nd ed.">T&amp;S</span>'
    )
    .replace(
      /<strong>\[S&amp;L\]<\/strong>/g,
      '<span class="cite-tag cite-sl" title="Seider, Lewin, Seader, Widagdo, Gani &amp; Ng (2017), Product and Process Design Principles, 4th ed.">S&amp;L</span>'
    )
    .replace(
      /<strong>\[EXT\]<\/strong>/g,
      '<span class="cite-tag cite-ext" title="Classical Fluid Mechanics, DIPPR 801 / ChemSep &amp; Numerical Analysis">EXT</span>'
    );
}

const CALLOUT_LABELS: Record<string, { cls: string; label: string }> = {
  NOTE: { cls: 'note', label: 'Note' },
  TIP: { cls: 'tip', label: 'Insight' },
  IMPORTANT: { cls: 'important', label: 'Important' },
  WARNING: { cls: 'warning', label: 'Caution' },
  CAUTION: { cls: 'caution', label: 'Caution' }
};

function transformCallouts(html: string): string {
  return html.replace(
    /<blockquote>\s*<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:<br\s*\/?>|\n)?([\s\S]*?)<\/blockquote>/gi,
    (_, rawType: string, inner: string) => {
      const meta = CALLOUT_LABELS[rawType.toUpperCase()] ?? CALLOUT_LABELS.NOTE;
      return `<aside class="theory-callout theory-callout--${meta.cls}"><div class="theory-callout-label">${meta.label}</div><div class="theory-callout-body"><p>${inner}</div></aside>`;
    }
  );
}

/**
 * Extract a concise plain-text lead paragraph (first substantive non-heading, non-table paragraph)
 * for Wikipedia-style cross-link previews and search snippets.
 */
function extractExcerpt(markdown: string): string {
  const blocks = markdown.split(/\n{2,}/);
  for (const rawBlock of blocks) {
    const b = rawBlock.trim();
    if (!b) continue;
    if (b.startsWith('#') || b.startsWith('---') || b.startsWith('|') || b.startsWith('```') || b.startsWith('$$')) {
      continue;
    }
    if (b.startsWith('> [!')) continue;
    const cleaned = b
      .replace(/^>\s*/gm, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\*\*\[(T&S|S&L|EXT)\]\*\*/g, '@@CITE_$1@@')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/@@CITE_(T&S|S&L|EXT)@@/g, '**[$1]**')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length >= 35) {
      return cleaned.length > 260 ? `${cleaned.slice(0, 257).trimEnd()}…` : cleaned;
    }
  }
  return '';
}

function buildSearchText(title: string, frontmatter: TheoryFrontmatter, markdown: string): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`#>|]/g, ' ')
    .replace(/\s+/g, ' ');
  return [
    title,
    frontmatter.id,
    frontmatter.ui_elements.join(' '),
    frontmatter.references.join(' '),
    plain
  ]
    .join(' ')
    .toLowerCase();
}

/**
 * Parse and render a full theory markdown document from `docs/theory/` into HTML + TOC + metadata.
 */
export function parseTheoryDocument(docSlug: string, rawMarkdown: string): ParsedTheoryMarkdown {
  const { frontmatter, body } = parseFrontmatter(rawMarkdown);
  const { text: protectedMd, displayBlocks, inlineBlocks } = extractMathSafe(body);

  const headings: TheoryHeading[] = [];
  const usedSlugs = new Map<string, number>();

  const restoreInlineRaw = (str: string) =>
    str
      .replace(/@@KATEX_INLINE_(\d+)@@/g, (_, idx) => `$${inlineBlocks[Number(idx)] ?? ''}$`)
      .replace(/@@KATEX_DISPLAY_(\d+)@@/g, (_, idx) => `$$${displayBlocks[Number(idx)] ?? ''}$$`);

  const renderer = new Renderer();

  renderer.heading = function ({ tokens, depth }) {
    const renderedInner = this.parser.parseInline(tokens);
    // Recover clean raw text with inline math intact for TOC display and stable slug generation
    const rawWithMath = decodeHtmlEntities(restoreInlineRaw(renderedInner.replace(/<[^>]+>/g, '')));
    const baseSlug = slugifyHeading(rawWithMath);
    const count = usedSlugs.get(baseSlug) ?? 0;
    usedSlugs.set(baseSlug, count + 1);
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;

    if (depth >= 2 && depth <= 3) {
      headings.push({
        level: depth,
        text: rawWithMath.trim(),
        slug
      });
    }

    if (depth === 1) {
      // Document header renders the title separately; suppress duplicate raw H1 inside article body.
      return '';
    }

    return `<h${depth} id="${slug}" class="theory-heading theory-h${depth}"><a class="theory-anchor-link" href="#/theory/${docSlug}#${slug}" aria-label="Link to section">#</a>${renderedInner}</h${depth}>\n`;
  };

  renderer.link = function ({ href, title, tokens }) {
    const label = this.parser.parseInline(tokens);
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    const resolved = resolveTheoryHref(docSlug, href || '');
    if (resolved) {
      const hashTarget = resolved.anchor ? `#/theory/${resolved.slug}#${resolved.anchor}` : `#/theory/${resolved.slug}`;
      const anchorData = resolved.anchor ? ` data-theory-anchor="${escapeHtml(resolved.anchor)}"` : '';
      return `<a href="${hashTarget}" class="theory-crosslink" data-theory-slug="${escapeHtml(resolved.slug)}"${anchorData}${titleAttr}>${label}</a>`;
    }
    const safeHref = escapeHtml(href || '#');
    const external = /^https?:\/\//i.test(href || '') ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${safeHref}" class="theory-ext-link"${titleAttr}${external}>${label}</a>`;
  };

  renderer.table = function (token) {
    const defaultHtml = Renderer.prototype.table.call(this, token);
    return `<div class="theory-table-wrap">${defaultHtml}</div>\n`;
  };

  let html = marked.parse(protectedMd, {
    renderer,
    gfm: true,
    breaks: false
  }) as string;

  html = transformCallouts(html);
  html = applyCitationBadges(html);

  // Restore display math blocks; unwrap `<p>` when a paragraph holds solely a display equation.
  html = html.replace(/<p>\s*@@KATEX_DISPLAY_(\d+)@@\s*<\/p>/g, (_, idx) => {
    const tex = displayBlocks[Number(idx)] ?? '';
    return `<div class="theory-math-display">${renderLatex(tex, true)}</div>\n`;
  });
  html = html.replace(/@@KATEX_DISPLAY_(\d+)@@/g, (_, idx) => {
    const tex = displayBlocks[Number(idx)] ?? '';
    return `<div class="theory-math-display">${renderLatex(tex, true)}</div>`;
  });

  // Restore inline math spans
  html = html.replace(/@@KATEX_INLINE_(\d+)@@/g, (_, idx) => {
    const tex = inlineBlocks[Number(idx)] ?? '';
    return `<span class="theory-math-inline">${renderLatex(tex, false)}</span>`;
  });

  const excerpt = extractExcerpt(body);
  const leadEquation = displayBlocks.find((eq) => eq.length <= 220) ?? displayBlocks[0];
  const title = frontmatter.title || docSlug;
  const searchText = buildSearchText(title, frontmatter, body);

  return {
    frontmatter,
    markdown: body,
    html,
    headings,
    excerpt,
    leadEquation,
    searchText
  };
}
