export interface TheoryFrontmatter {
  id: string;
  title: string;
  unit?: string;
  scope?: string;
  ui_elements: string[];
  code_files: string[];
  references: string[];
}

export interface TheoryHeading {
  level: number;
  text: string;
  slug: string;
}

export interface TheoryDoc {
  /** Normalized route slug, e.g. 'README', 'nomenclature', 'fundamentals/01-thermophysical-properties', 'pipe-flow/02-friction-and-moody-diagram'. */
  slug: string;
  /** Original relative path inside docs/theory/, e.g. 'pipe-flow/02-friction-and-moody-diagram.md'. */
  filePath: string;
  /** Curriculum section key, e.g. 'overview' | 'fundamentals' | 'pipe-flow' | future unit folders. */
  section: string;
  /** Human-readable section label, e.g. 'Pipe Flow', 'Shared Fundamentals'. */
  sectionLabel: string;
  /** Short navigation label for sidebar trees and breadcrumbs. */
  shortTitle: string;
  /** Full document title from frontmatter or H1. */
  title: string;
  /** Concise plain-text lead excerpt extracted for Wikipedia-style cross-link previews and search snippets. */
  excerpt: string;
  /** First prominent display equation (raw LaTeX) extracted from the document, if any. */
  leadEquation?: string;
  frontmatter: TheoryFrontmatter;
  /** Raw markdown body without YAML frontmatter. */
  markdown: string;
  /** Rendered HTML (lazy-computed and cached). */
  html?: string;
  /** Headings extracted for TOC and anchor verification. */
  headings: TheoryHeading[];
  /** Searchable plain-text corpus (lowercase). */
  searchText: string;
  /** Sequential curriculum order (lower comes first). */
  order: number;
}

export interface TheoryNavGroup {
  key: string;
  label: string;
  docs: TheoryDoc[];
}

export interface TheoryConcept {
  /** Stable identifier matching UI elements, e.g. 'pill:pressure', 'param:friction_model', 'kpi:npsh', 'chart:moody-diagram'. */
  id: string;
  /** Short eyebrow label shown above title in hover preview, e.g. 'Pipe Flow · Friction'. */
  eyebrow: string;
  /** Display title inside the Wikipedia-style preview card. */
  title: string;
  /** Optional KaTeX LaTeX expression rendered prominently inside the preview card. */
  equation?: string;
  /** Concise textbook-grounded explanation (1–3 sentences, may contain inline $...$ LaTeX). */
  summary: string;
  /** Short provenance string(s), e.g. '[T&S] Ch. 20.4.1 Eq. (20.1) · [S&L] Ch. 12.3'. */
  citation: string;
  /** Target document slug in TheoryRepository. */
  docSlug: string;
  /** Optional heading anchor inside the target document (without leading '#'). */
  anchor?: string;
  /** Optional preset ID to offer a one-click "Try in simulator" jump. */
  presetId?: string;
}

export interface TheorySearchHit {
  doc: TheoryDoc;
  matchedHeading?: TheoryHeading;
  snippet: string;
  score: number;
}
