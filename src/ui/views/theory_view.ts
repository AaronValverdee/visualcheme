import { PRESET_LABELS } from '../../core/theory/concepts';
import { escapeHtml, renderInlineRichText, renderLatex } from '../../core/theory/markdown_parser';
import { TheoryRepository } from '../../core/theory/repository';
import { TheoryDoc } from '../../core/theory/types';
import { buildTheoryHash } from '../router';

export interface TheoryViewCallbacks {
  onReturnToSimulator: () => void;
  onNavigateTheory: (slug: string, anchor?: string) => void;
  onLoadPreset: (presetId: string) => void;
  getActiveUnitName: () => string;
}

/**
 * Full-page Theoretical Foundations reader view.
 * Renders `docs/theory/` Markdown + KaTeX pages with curriculum navigation, live search,
 * interactive textbook citation badges, sticky On-This-Page outline, and simulator preset launchers.
 */
export class TheoryView {
  private container: HTMLElement;
  private callbacks: TheoryViewCallbacks;
  private currentSlug: string | null = null;
  private searchQuery = '';
  private tocObserver: IntersectionObserver | null = null;
  private sidebarOpenMobile = false;

  constructor(containerId: string, callbacks: TheoryViewCallbacks) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;
    this.callbacks = callbacks;
    this.buildShell();
  }

  private buildShell(): void {
    this.container.innerHTML = `
      <div class="theory-shell">
        <aside class="theory-sidebar" id="theory-sidebar" aria-label="Theory navigation">
          <div class="theory-sidebar-top">
            <button type="button" class="theory-back-btn" id="theory-back-btn">
              ← Back to <span id="theory-back-unit">Pipe Flow</span>
            </button>
            <div class="theory-search-box">
              <input
                type="search"
                id="theory-search-input"
                class="theory-search-input"
                placeholder="Search equations, symbols, topics…"
                aria-label="Search theory pages"
                autocomplete="off"
              />
            </div>
          </div>
          <div class="theory-search-results" id="theory-search-results" hidden></div>
          <nav class="theory-nav-tree" id="theory-nav-tree"></nav>
        </aside>

        <article class="theory-main" id="theory-main">
          <div class="theory-mobile-bar">
            <button type="button" class="btn-icon" id="theory-mobile-menu">Contents</button>
            <button type="button" class="btn-icon" id="theory-mobile-back">← Simulator</button>
          </div>
          <div class="theory-breadcrumb" id="theory-breadcrumb"></div>
          <header class="theory-doc-header" id="theory-doc-header"></header>
          <div class="theory-hub-grid" id="theory-hub-grid" hidden></div>
          <div class="theory-prose" id="theory-prose"></div>
          <nav class="theory-prev-next" id="theory-prev-next" aria-label="Chapter navigation"></nav>
        </article>

        <aside class="theory-toc-rail" id="theory-toc-rail" aria-label="On this page">
          <div class="theory-rail-block" id="theory-toc-block">
            <div class="theory-rail-title">On this page</div>
            <ul class="theory-toc-list" id="theory-toc-list"></ul>
          </div>
          <div class="theory-rail-block" id="theory-meta-block"></div>
        </aside>
      </div>
    `;

    this.bindShellEvents();
    this.renderNavTree();
  }

  private bindShellEvents(): void {
    const backBtn = this.container.querySelector('#theory-back-btn');
    backBtn?.addEventListener('click', () => this.callbacks.onReturnToSimulator());

    const mobileBack = this.container.querySelector('#theory-mobile-back');
    mobileBack?.addEventListener('click', () => this.callbacks.onReturnToSimulator());

    const mobileMenu = this.container.querySelector('#theory-mobile-menu');
    mobileMenu?.addEventListener('click', () => {
      this.sidebarOpenMobile = !this.sidebarOpenMobile;
      this.container.querySelector('#theory-sidebar')?.classList.toggle('open-mobile', this.sidebarOpenMobile);
    });

    const searchInput = this.container.querySelector<HTMLInputElement>('#theory-search-input');
    searchInput?.addEventListener('input', () => {
      this.searchQuery = searchInput.value;
      this.renderSearchResults();
    });

    // Delegated clicks for links, presets, TOC anchors, and hub cards inside the theory view
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const presetBtn = target.closest<HTMLElement>('[data-load-preset]');
      if (presetBtn && presetBtn.dataset.loadPreset) {
        e.preventDefault();
        this.callbacks.onLoadPreset(presetBtn.dataset.loadPreset);
        return;
      }

      const navLink = target.closest<HTMLAnchorElement>('a[href^="#/theory"]');
      if (navLink) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        const slug = navLink.dataset.theorySlug || this.extractSlugFromHref(navLink.getAttribute('href') || '');
        const anchor = navLink.dataset.theoryAnchor || this.extractAnchorFromHref(navLink.getAttribute('href') || '');
        this.sidebarOpenMobile = false;
        this.container.querySelector('#theory-sidebar')?.classList.remove('open-mobile');
        this.callbacks.onNavigateTheory(slug, anchor);
      }
    });
  }

  private extractSlugFromHref(href: string): string {
    const stripped = href.replace(/^#\/theory\/?/, '');
    const hashIdx = stripped.indexOf('#');
    return (hashIdx >= 0 ? stripped.slice(0, hashIdx) : stripped) || 'README';
  }

  private extractAnchorFromHref(href: string): string | undefined {
    const stripped = href.replace(/^#\/theory\/?/, '');
    const hashIdx = stripped.indexOf('#');
    return hashIdx >= 0 ? stripped.slice(hashIdx + 1) : undefined;
  }

  private renderNavTree(): void {
    const navTree = this.container.querySelector('#theory-nav-tree');
    if (!navTree) return;

    const groups = TheoryRepository.getNavGroups();
    navTree.innerHTML = groups
      .map((group) => {
        const items = group.docs
          .map((doc) => {
            const active = doc.slug === this.currentSlug ? ' active' : '';
            const href = buildTheoryHash(doc.slug);
            return `
              <li>
                <a href="${escapeHtml(href)}" class="theory-nav-item${active}" data-theory-slug="${escapeHtml(doc.slug)}">
                  ${escapeHtml(doc.shortTitle)}
                </a>
              </li>
            `;
          })
          .join('');

        return `
          <div class="theory-nav-group">
            <div class="theory-nav-group-title">${escapeHtml(group.label)}</div>
            <ul class="theory-nav-list">${items}</ul>
          </div>
        `;
      })
      .join('');
  }

  private renderSearchResults(): void {
    const resultsEl = this.container.querySelector<HTMLElement>('#theory-search-results');
    const navTree = this.container.querySelector<HTMLElement>('#theory-nav-tree');
    if (!resultsEl || !navTree) return;

    const q = this.searchQuery.trim();
    if (!q) {
      resultsEl.hidden = true;
      navTree.hidden = false;
      return;
    }

    const hits = TheoryRepository.search(q, 12);
    resultsEl.hidden = false;
    navTree.hidden = true;

    if (hits.length === 0) {
      resultsEl.innerHTML = `<div class="theory-search-empty">No matching equations or topics for “${escapeHtml(q)}”.</div>`;
      return;
    }

    resultsEl.innerHTML = hits
      .map((hit) => {
        const anchor = hit.matchedHeading?.slug;
        const href = buildTheoryHash(hit.doc.slug, anchor);
        const anchorAttr = anchor ? ` data-theory-anchor="${escapeHtml(anchor)}"` : '';
        const headingSub = hit.matchedHeading
          ? `<div class="theory-search-heading">§ ${renderInlineRichText(hit.matchedHeading.text)}</div>`
          : '';
        return `
          <a href="${escapeHtml(href)}" class="theory-search-hit" data-theory-slug="${escapeHtml(hit.doc.slug)}"${anchorAttr}>
            <div class="theory-search-meta">${escapeHtml(hit.doc.sectionLabel)}</div>
            <div class="theory-search-title">${escapeHtml(hit.doc.shortTitle)}</div>
            ${headingSub}
            <div class="theory-search-snippet">${escapeHtml(hit.snippet)}</div>
          </a>
        `;
      })
      .join('');
  }

  public show(slug: string, anchor?: string): void {
    const doc = TheoryRepository.getDoc(slug) ?? TheoryRepository.getDoc('README');
    if (!doc) return;

    const unitSpan = this.container.querySelector('#theory-back-unit');
    if (unitSpan) unitSpan.textContent = this.callbacks.getActiveUnitName();

    const docChanged = this.currentSlug !== doc.slug;
    this.currentSlug = doc.slug;

    if (docChanged) {
      this.renderDocument(doc);
      this.updateActiveNav(doc.slug);
    }

    this.scrollToAnchor(anchor);
  }

  private updateActiveNav(slug: string): void {
    const links = this.container.querySelectorAll<HTMLAnchorElement>('.theory-nav-item');
    links.forEach((a) => {
      a.classList.toggle('active', a.dataset.theorySlug === slug);
    });
  }

  private renderDocument(doc: TheoryDoc): void {
    this.disconnectTocObserver();

    // 1. Breadcrumb
    const bc = this.container.querySelector('#theory-breadcrumb');
    if (bc) {
      const parts: string[] = [
        `<a href="#/theory" data-theory-slug="README">Theoretical Foundations</a>`
      ];
      if (doc.slug !== 'README') {
        if (doc.section !== 'overview') {
          const sectionIndex = TheoryRepository.getDoc(`${doc.section}/README`);
          if (sectionIndex && sectionIndex.slug !== doc.slug) {
            parts.push(
              `<a href="${escapeHtml(buildTheoryHash(sectionIndex.slug))}" data-theory-slug="${escapeHtml(sectionIndex.slug)}">${escapeHtml(doc.sectionLabel)}</a>`
            );
          } else {
            parts.push(`<span>${escapeHtml(doc.sectionLabel)}</span>`);
          }
        }
        parts.push(`<span class="current">${escapeHtml(doc.shortTitle)}</span>`);
      }
      bc.innerHTML = parts.join('<span class="theory-bc-sep">/</span>');
    }

    // 2. Document Header
    const header = this.container.querySelector('#theory-doc-header');
    if (header) {
      const scopeTag = doc.frontmatter.unit
        ? doc.frontmatter.unit === 'shared'
          ? 'Shared across all units'
          : `Unit: ${doc.frontmatter.unit.replace(/_/g, ' ')}`
        : doc.frontmatter.scope || doc.sectionLabel;

      const refsHtml =
        doc.frontmatter.references.length > 0
          ? `<div class="theory-refs-box">
               <div class="theory-refs-heading">Reference Texts &amp; Provenance</div>
               <ul class="theory-refs-list">
                 ${doc.frontmatter.references.map((r) => `<li>${formatReferenceLine(r)}</li>`).join('')}
               </ul>
             </div>`
          : '';

      const presets = extractPresetIds(doc.frontmatter.ui_elements);
      const presetsHtml =
        presets.length > 0
          ? `<div class="theory-presets-bar">
               <span class="theory-presets-label">Try in simulator:</span>
               ${presets
                 .map(
                   (pid) => `
                   <button type="button" class="theory-preset-chip" data-load-preset="${escapeHtml(pid)}">
                     ${escapeHtml(PRESET_LABELS[pid] ?? pid)} ↗
                   </button>`
                 )
                 .join('')}
             </div>`
          : '';

      header.innerHTML = `
        <div class="theory-doc-eyebrow">
          <span>${escapeHtml(doc.sectionLabel)}</span>
          <span class="theory-eyebrow-sep">·</span>
          <span>${escapeHtml(scopeTag)}</span>
        </div>
        <h1 class="theory-doc-title">${escapeHtml(doc.title)}</h1>
        ${refsHtml}
        ${presetsHtml}
      `;
    }

    // 3. Hub Card Grid (shown only on the root index README page)
    const hubGrid = this.container.querySelector<HTMLElement>('#theory-hub-grid');
    if (hubGrid) {
      if (doc.slug === 'README') {
        hubGrid.hidden = false;
        hubGrid.innerHTML = this.buildHubCards();
      } else {
        hubGrid.hidden = true;
        hubGrid.innerHTML = '';
      }
    }

    // 4. Article Body
    const prose = this.container.querySelector('#theory-prose');
    if (prose) {
      prose.innerHTML = doc.html || '';
    }

    // 5. Right Rail TOC
    const tocList = this.container.querySelector('#theory-toc-list');
    const tocBlock = this.container.querySelector<HTMLElement>('#theory-toc-block');
    if (tocList && tocBlock) {
      if (doc.headings.length === 0) {
        tocBlock.hidden = true;
        tocList.innerHTML = '';
      } else {
        tocBlock.hidden = false;
        tocList.innerHTML = doc.headings
          .map(
            (h) => `
            <li class="theory-toc-item level-${h.level}">
              <a href="${escapeHtml(buildTheoryHash(doc.slug, h.slug))}"
                 data-theory-slug="${escapeHtml(doc.slug)}"
                 data-theory-anchor="${escapeHtml(h.slug)}"
                 data-toc-target="${escapeHtml(h.slug)}">
                ${renderInlineRichText(h.text)}
              </a>
            </li>`
          )
          .join('');
      }
    }

    // 6. Right Rail Source & UI Metadata
    const metaBlock = this.container.querySelector('#theory-meta-block');
    if (metaBlock) {
      const codeHtml =
        doc.frontmatter.code_files.length > 0
          ? `<div class="theory-rail-subblock">
               <div class="theory-rail-title">Source implementation</div>
               <ul class="theory-code-list">
                 ${doc.frontmatter.code_files.map((f) => `<li><code>${escapeHtml(f)}</code></li>`).join('')}
               </ul>
             </div>`
          : '';

      const uiItems = doc.frontmatter.ui_elements.filter((u) => u !== 'all' && !u.startsWith('preset:'));
      const uiHtml =
        uiItems.length > 0
          ? `<div class="theory-rail-subblock">
               <div class="theory-rail-title">Linked UI elements</div>
               <div class="theory-chip-cloud">
                 ${uiItems.slice(0, 14).map((u) => `<span class="theory-ui-chip">${escapeHtml(u)}</span>`).join('')}
                 ${uiItems.length > 14 ? `<span class="theory-ui-chip muted">+${uiItems.length - 14} more</span>` : ''}
               </div>
             </div>`
          : '';

      metaBlock.innerHTML = `${uiHtml}${codeHtml}`;
    }

    // 7. Sequential Prev / Next footer
    const prevNext = this.container.querySelector('#theory-prev-next');
    if (prevNext) {
      const { prev, next } = TheoryRepository.getNeighbors(doc.slug);
      const prevHtml = prev
        ? `<a href="${escapeHtml(buildTheoryHash(prev.slug))}" class="theory-pager-card prev" data-theory-slug="${escapeHtml(prev.slug)}">
             <span class="theory-pager-dir">← Previous</span>
             <span class="theory-pager-title">${escapeHtml(prev.shortTitle)}</span>
           </a>`
        : '<span></span>';

      const nextHtml = next
        ? `<a href="${escapeHtml(buildTheoryHash(next.slug))}" class="theory-pager-card next" data-theory-slug="${escapeHtml(next.slug)}">
             <span class="theory-pager-dir">Next →</span>
             <span class="theory-pager-title">${escapeHtml(next.shortTitle)}</span>
           </a>`
        : '<span></span>';

      prevNext.innerHTML = `${prevHtml}${nextHtml}`;
    }

    this.setupTocScrollspy();
  }

  private buildHubCards(): string {
    const groups = TheoryRepository.getNavGroups();
    return groups
      .map((group) => {
        const docs = group.docs.filter((d) => d.slug !== 'README');
        if (docs.length === 0) return '';
        const cards = docs
          .map((d) => {
            const href = buildTheoryHash(d.slug);
            const eqPreview = d.leadEquation
              ? `<div class="theory-hub-eq">${renderLatex(d.leadEquation, false)}</div>`
              : '';
            return `
              <a href="${escapeHtml(href)}" class="theory-hub-card" data-theory-slug="${escapeHtml(d.slug)}">
                <div class="theory-hub-card-title">${escapeHtml(d.shortTitle)}</div>
                <p class="theory-hub-card-excerpt">${renderInlineRichText(truncateMathSafe(d.excerpt, 150))}</p>
                ${eqPreview}
              </a>
            `;
          })
          .join('');
        return `
          <section class="theory-hub-section">
            <h2 class="theory-hub-section-title">${escapeHtml(group.label)}</h2>
            <div class="theory-hub-cards">${cards}</div>
          </section>
        `;
      })
      .join('');
  }

  private scrollToAnchor(anchor?: string): void {
    if (!anchor) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    requestAnimationFrame(() => {
      const target = document.getElementById(anchor);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.classList.remove('theory-heading-flash');
        // Reflow to restart flash animation cleanly
        void target.offsetWidth;
        target.classList.add('theory-heading-flash');
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    });
  }

  private setupTocScrollspy(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    const headings = Array.from(this.container.querySelectorAll<HTMLElement>('#theory-prose .theory-heading[id]'));
    if (headings.length === 0) return;

    this.tocObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length === 0) return;
        const activeId = visible[0].target.id;
        this.container.querySelectorAll<HTMLElement>('[data-toc-target]').forEach((a) => {
          a.classList.toggle('active', a.dataset.tocTarget === activeId);
        });
      },
      { rootMargin: '-75px 0px -70% 0px', threshold: 0 }
    );

    for (const h of headings) this.tocObserver.observe(h);
  }

  private disconnectTocObserver(): void {
    if (this.tocObserver) {
      this.tocObserver.disconnect();
      this.tocObserver = null;
    }
  }
}

function formatReferenceLine(ref: string): string {
  const escaped = escapeHtml(ref);
  return escaped
    .replace(
      /^\[T&amp;S\]/,
      '<span class="cite-tag cite-ts" title="Towler &amp; Sinnott (2013), Chemical Engineering Design, 2nd ed.">T&amp;S</span>'
    )
    .replace(
      /^\[S&amp;L\]/,
      '<span class="cite-tag cite-sl" title="Seider, Lewin, Seader, Widagdo, Gani &amp; Ng (2017), Product and Process Design Principles, 4th ed.">S&amp;L</span>'
    )
    .replace(
      /^\[EXT\]/,
      '<span class="cite-tag cite-ext" title="Classical Fluid Mechanics, DIPPR 801 / ChemSep &amp; Numerical Analysis">EXT</span>'
    );
}

function extractPresetIds(uiElements: string[]): string[] {
  const ids: string[] = [];
  for (const item of uiElements) {
    if (item.startsWith('preset:')) {
      ids.push(item.slice('preset:'.length).trim());
    }
  }
  return ids;
}

/** Truncate rich inline text without slicing through an open `$...$` LaTeX span. */
function truncateMathSafe(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  let cut = maxLen;
  let inMath = false;
  let lastSafe = 0;
  for (let i = 0; i < text.length && i <= maxLen + 25; i++) {
    if (text[i] === '$' && text[i - 1] !== '\\') {
      inMath = !inMath;
    }
    if (!inMath && i <= maxLen && /\s/.test(text[i])) {
      lastSafe = i;
    }
    if (!inMath && i >= maxLen) {
      cut = lastSafe > 40 ? lastSafe : i;
      break;
    }
  }
  const sliced = text.slice(0, cut).trimEnd().replace(/[,;:]$/, '');
  return `${sliced}…`;
}
