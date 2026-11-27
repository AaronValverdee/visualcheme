import { getTheoryConcept, PRESET_LABELS } from '../../core/theory/concepts';
import { escapeHtml, renderInlineRichText, renderLatex } from '../../core/theory/markdown_parser';
import { TheoryRepository } from '../../core/theory/repository';

const OPEN_DELAY_MS = 260;
const CLOSE_DELAY_MS = 220;
const VIEWPORT_PAD = 12;

export interface TheoryPopoverCallbacks {
  onNavigateTheory: (slug: string, anchor?: string) => void;
  onLoadPreset?: (presetId: string) => void;
}

interface ResolvedPreview {
  eyebrow: string;
  title: string;
  equation?: string;
  summary: string;
  citation?: string;
  docSlug: string;
  anchor?: string;
  docTitle: string;
  presetId?: string;
}

/**
 * Wikipedia-style hover preview controller for every technical term, control, KPI, chart,
 * diagnostic, and theory cross-link in Visualcheme.
 *
 * Uses event delegation on `document` so dynamic 60 FPS re-renders of HUD/controls never
 * leak listeners or leave orphaned popovers.
 */
export class TheoryPopover {
  private el: HTMLElement;
  private activeTrigger: HTMLElement | null = null;
  private activePreview: ResolvedPreview | null = null;
  private openTimer: number | null = null;
  private closeTimer: number | null = null;
  private callbacks: TheoryPopoverCallbacks;

  constructor(callbacks: TheoryPopoverCallbacks) {
    this.callbacks = callbacks;

    this.el = document.createElement('div');
    this.el.className = 'theory-popover';
    this.el.setAttribute('role', 'tooltip');
    this.el.setAttribute('aria-hidden', 'true');
    this.el.hidden = true;
    document.body.appendChild(this.el);

    this.bindEvents();
  }

  private bindEvents(): void {
    document.addEventListener('pointerover', (e) => {
      if (e.pointerType === 'touch') return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (this.el.contains(target)) {
        this.clearCloseTimer();
        return;
      }

      const trigger = target.closest<HTMLElement>('[data-theory-concept], [data-theory-slug]');
      if (!trigger) return;
      if (trigger === this.activeTrigger && !this.el.hidden) {
        this.clearCloseTimer();
        return;
      }
      this.scheduleOpen(trigger);
    });

    document.addEventListener('pointerout', (e) => {
      if (e.pointerType === 'touch') return;
      const target = e.target as HTMLElement | null;
      const related = e.relatedTarget as HTMLElement | null;
      if (!target) return;

      const leftPopover = this.el.contains(target) && (!related || !this.el.contains(related));
      const trigger = target.closest<HTMLElement>('[data-theory-concept], [data-theory-slug]');
      const leftTrigger = Boolean(trigger) && (!related || !trigger!.contains(related));

      if (!leftPopover && !leftTrigger) return;
      if (related && (this.el.contains(related) || related.closest('[data-theory-concept], [data-theory-slug]') === this.activeTrigger)) {
        return;
      }

      this.clearOpenTimer();
      this.scheduleClose();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });

    window.addEventListener('scroll', () => {
      if (!this.el.hidden) this.hide();
    }, true);

    window.addEventListener('resize', () => {
      if (!this.el.hidden) this.hide();
    });

    // Clicking links inside the popover navigates and dismisses cleanly
    this.el.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const presetBtn = target.closest<HTMLElement>('[data-popover-preset]');
      if (presetBtn && presetBtn.dataset.popoverPreset) {
        e.preventDefault();
        this.hide();
        this.callbacks.onLoadPreset?.(presetBtn.dataset.popoverPreset);
        return;
      }

      const openLink = target.closest<HTMLAnchorElement>('[data-popover-open]');
      if (openLink && this.activePreview) {
        // Allow Ctrl/Cmd/Shift-click to open in a new tab naturally
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
          this.hide();
          return;
        }
        e.preventDefault();
        const { docSlug, anchor } = this.activePreview;
        this.hide();
        this.callbacks.onNavigateTheory(docSlug, anchor);
      }
    });

    // Dismiss popover immediately if user clicks any theory trigger
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (this.el.contains(target)) return;
      if (target.closest('[data-theory-concept], [data-theory-slug]')) {
        this.hide();
      }
    });
  }

  private resolveTrigger(trigger: HTMLElement): ResolvedPreview | null {
    const conceptId = trigger.dataset.theoryConcept;
    if (conceptId) {
      const concept = getTheoryConcept(conceptId);
      if (!concept) return null;
      const doc = TheoryRepository.getDoc(concept.docSlug);
      return {
        eyebrow: concept.eyebrow,
        title: concept.title,
        equation: concept.equation,
        summary: concept.summary,
        citation: concept.citation,
        docSlug: concept.docSlug,
        anchor: concept.anchor,
        docTitle: doc?.shortTitle ?? doc?.title ?? concept.docSlug,
        presetId: concept.presetId
      };
    }

    const slug = trigger.dataset.theorySlug;
    if (slug) {
      const doc = TheoryRepository.getDoc(slug);
      if (!doc) return null;
      const anchor = trigger.dataset.theoryAnchor;
      const matchedHeading = anchor ? doc.headings.find((h) => h.slug === anchor) : undefined;
      return {
        eyebrow: doc.sectionLabel,
        title: matchedHeading ? matchedHeading.text : doc.title,
        equation: doc.leadEquation,
        summary: doc.excerpt || doc.title,
        citation: doc.frontmatter.references[0],
        docSlug: doc.slug,
        anchor,
        docTitle: doc.shortTitle
      };
    }

    return null;
  }

  private scheduleOpen(trigger: HTMLElement): void {
    this.clearCloseTimer();
    this.clearOpenTimer();
    this.openTimer = window.setTimeout(() => {
      if (!document.body.contains(trigger)) return;
      const preview = this.resolveTrigger(trigger);
      if (!preview) return;
      this.activeTrigger = trigger;
      this.activePreview = preview;
      this.renderAndPosition(trigger, preview);
    }, OPEN_DELAY_MS);
  }

  private scheduleClose(): void {
    this.clearCloseTimer();
    this.closeTimer = window.setTimeout(() => {
      this.hide();
    }, CLOSE_DELAY_MS);
  }

  private clearOpenTimer(): void {
    if (this.openTimer !== null) {
      window.clearTimeout(this.openTimer);
      this.openTimer = null;
    }
  }

  private clearCloseTimer(): void {
    if (this.closeTimer !== null) {
      window.clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  public hide(): void {
    this.clearOpenTimer();
    this.clearCloseTimer();
    this.el.classList.remove('visible');
    this.el.setAttribute('aria-hidden', 'true');
    this.el.hidden = true;
    this.activeTrigger = null;
    this.activePreview = null;
  }

  private renderAndPosition(trigger: HTMLElement, preview: ResolvedPreview): void {
    const href = preview.anchor ? `#/theory/${preview.docSlug}#${preview.anchor}` : `#/theory/${preview.docSlug}`;
    const eqHtml = preview.equation
      ? `<div class="theory-popover-eq">${renderLatex(preview.equation, true)}</div>`
      : '';
    const citeHtml = preview.citation
      ? `<div class="theory-popover-cite">${renderInlineRichText(preview.citation)}</div>`
      : '';
    const presetHtml =
      preview.presetId && this.callbacks.onLoadPreset && PRESET_LABELS[preview.presetId]
        ? `<button type="button" class="theory-popover-preset" data-popover-preset="${escapeHtml(preview.presetId)}">Load preset</button>`
        : '';

    this.el.innerHTML = `
      <div class="theory-popover-eyebrow">${escapeHtml(preview.eyebrow)}</div>
      <div class="theory-popover-title">
        <a href="${escapeHtml(href)}" data-popover-open="true">${renderInlineRichText(preview.title)}</a>
      </div>
      ${eqHtml}
      <p class="theory-popover-summary">${renderInlineRichText(preview.summary)}</p>
      ${citeHtml}
      <div class="theory-popover-footer">
        <a href="${escapeHtml(href)}" class="theory-popover-read" data-popover-open="true">
          Read full page: <span>${escapeHtml(preview.docTitle)}</span> →
        </a>
        ${presetHtml}
      </div>
    `;

    // Measure off-screen before positioning
    this.el.hidden = false;
    this.el.style.left = '0px';
    this.el.style.top = '0px';
    this.el.classList.remove('placed-above', 'placed-below');

    const rect = trigger.getBoundingClientRect();
    const popRect = this.el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 10;

    // Prefer below unless tight on space at bottom
    const spaceBelow = vh - rect.bottom - VIEWPORT_PAD;
    const spaceAbove = rect.top - VIEWPORT_PAD;
    const placeAbove = spaceBelow < popRect.height + gap && spaceAbove > spaceBelow;

    let top = placeAbove ? rect.top - popRect.height - gap : rect.bottom + gap;
    top = Math.max(VIEWPORT_PAD, Math.min(vh - popRect.height - VIEWPORT_PAD, top));

    const anchorCenterX = rect.left + rect.width / 2;
    let left = anchorCenterX - popRect.width / 2;
    left = Math.max(VIEWPORT_PAD, Math.min(vw - popRect.width - VIEWPORT_PAD, left));

    const arrowX = Math.max(18, Math.min(popRect.width - 18, anchorCenterX - left));

    this.el.style.left = `${Math.round(left)}px`;
    this.el.style.top = `${Math.round(top)}px`;
    this.el.style.setProperty('--arrow-x', `${Math.round(arrowX)}px`);
    this.el.classList.add(placeAbove ? 'placed-above' : 'placed-below');
    this.el.setAttribute('aria-hidden', 'false');

    requestAnimationFrame(() => {
      if (this.activeTrigger === trigger) {
        this.el.classList.add('visible');
      }
    });
  }
}
