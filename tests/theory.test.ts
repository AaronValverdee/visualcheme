import { describe, it, expect } from 'vitest';
import { TheoryRepository } from '../src/core/theory/repository';
import { THEORY_CONCEPTS, getTheoryConcept, resolveWarningConceptId } from '../src/core/theory/concepts';
import { parseFrontmatter, parseTheoryDocument, resolveTheoryHref, renderInlineRichText } from '../src/core/theory/markdown_parser';
import { parseHashRoute, buildTheoryHash, buildSimulatorHash } from '../src/ui/router';
import { PipeUnit } from '../src/core/units/pipe/pipe_unit';

describe('Theory Repository & Markdown/KaTeX Engine', () => {
  it('loads all 12 markdown documents from docs/theory/ in curriculum order', () => {
    const docs = TheoryRepository.getAllDocs();
    expect(docs.length).toBeGreaterThanOrEqual(12);

    const slugs = docs.map((d) => d.slug);
    expect(slugs[0]).toBe('README');
    expect(slugs[1]).toBe('nomenclature');
    expect(slugs).toContain('fundamentals/01-thermophysical-properties');
    expect(slugs).toContain('fundamentals/02-conservation-and-second-law');
    expect(slugs).toContain('pipe-flow/README');
    expect(slugs).toContain('pipe-flow/01-flow-regimes-and-velocity-profiles');
    expect(slugs).toContain('pipe-flow/02-friction-and-moody-diagram');
    expect(slugs).toContain('pipe-flow/03-minor-losses-fittings-and-valves');
    expect(slugs).toContain('pipe-flow/04-grade-lines-and-elevation');
    expect(slugs).toContain('pipe-flow/05-centrifugal-pumps-and-npsh');
    expect(slugs).toContain('pipe-flow/06-validity-phase-change-and-presets');
    expect(slugs).toContain('pipe-flow/07-textbook-contrast-and-audit');

    // Fundamentals precede pipe-flow in sequential curriculum order
    const idxFund = slugs.indexOf('fundamentals/02-conservation-and-second-law');
    const idxPipe = slugs.indexOf('pipe-flow/01-flow-regimes-and-velocity-profiles');
    expect(idxFund).toBeLessThan(idxPipe);
  });

  it('renders every theory document cleanly with KaTeX math, callouts, citations, and zero leaked tokens', () => {
    for (const doc of TheoryRepository.getAllDocs()) {
      expect(doc.title.length).toBeGreaterThan(3);
      expect(doc.html).toBeTruthy();
      const html = doc.html!;

      // No internal math/code placeholder tokens leaked into output HTML
      expect(html).not.toContain('@@KATEX_');
      expect(html).not.toContain('@@CODE_SPAN_');
      expect(html).not.toContain('@@INLINE_MATH_');

      // No raw GitHub callout tags left unrendered
      expect(html).not.toMatch(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/);

      // Every page in docs/theory contains rendered KaTeX math
      expect(html).toContain('class="katex"');

      // All cross-links inside rendered pages resolve to existing documents
      const slugMatches = html.matchAll(/data-theory-slug="([^"]+)"/g);
      for (const m of slugMatches) {
        const linkedSlug = m[1];
        expect(TheoryRepository.getDoc(linkedSlug), `Broken crosslink "${linkedSlug}" in ${doc.slug}`).toBeDefined();
      }
    }
  });

  it('transforms display math inside blockquotes and callouts cleanly', () => {
    const doc = TheoryRepository.getDoc('fundamentals/02-conservation-and-second-law');
    expect(doc).toBeDefined();
    expect(doc!.html).toContain('theory-callout--note');
    expect(doc!.html).toContain('theory-callout--tip');
    expect(doc!.html).toContain('theory-math-display');
    expect(doc!.html).toContain('cite-ts');
    expect(doc!.html).toContain('cite-sl');
  });

  it('resolves relative .md links across directories accurately', () => {
    expect(resolveTheoryHref('README', 'pipe-flow/README.md')).toEqual({ slug: 'pipe-flow/README', anchor: undefined });
    expect(resolveTheoryHref('pipe-flow/README', '../fundamentals/01-thermophysical-properties.md')).toEqual({
      slug: 'fundamentals/01-thermophysical-properties',
      anchor: undefined
    });
    expect(resolveTheoryHref('pipe-flow/02-friction-and-moody-diagram', '04-grade-lines-and-elevation.md')).toEqual({
      slug: 'pipe-flow/04-grade-lines-and-elevation',
      anchor: undefined
    });
    expect(resolveTheoryHref('README', 'https://example.com')).toBeNull();
  });

  it('parses frontmatter arrays including primary_references', () => {
    const raw = `---\nid: test\ntitle: Demo\nprimary_references:\n  - "Ref A"\n  - "Ref B"\n---\n# Demo\n\nBody with $x^2$.`;
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter.id).toBe('test');
    expect(frontmatter.references).toEqual(['Ref A', 'Ref B']);
    const parsed = parseTheoryDocument('demo', raw);
    expect(parsed.html).toContain('katex');
    expect(body).toContain('Body');
  });

  it('renders rich inline text with math and citation tags for popovers', () => {
    const html = renderInlineRichText('Uses **[T&S]** Eq. (20.1) with $f_D = 8 f_{\\text{T\\&S}}$ and `friction.ts`.');
    expect(html).toContain('cite-ts');
    expect(html).toContain('class="katex"');
    expect(html).toContain('<code>friction.ts</code>');
  });
});

describe('Concept Registry & Complete Pipe Flow UI Traceability', () => {
  it('verifies every curated concept points to an existing doc and exact heading anchor', () => {
    const errors: string[] = [];
    for (const [id, concept] of Object.entries(THEORY_CONCEPTS)) {
      const doc = TheoryRepository.getDoc(concept.docSlug);
      if (!doc) {
        errors.push(`Concept "${id}" references missing doc "${concept.docSlug}"`);
        continue;
      }
      if (concept.anchor) {
        const headingSlugs = doc.headings.map((h) => h.slug);
        if (!headingSlugs.includes(concept.anchor)) {
          errors.push(`Concept "${id}" anchor "${concept.anchor}" not in "${concept.docSlug}" (have: ${headingSlugs.join(', ')})`);
        }
      }
    }
    expect(errors).toEqual([]);
  });

  it('covers 100% of PipeUnit parameters, categories, properties, KPIs, and warnings', () => {
    const pipe = new PipeUnit();

    for (const p of pipe.getParameters()) {
      expect(getTheoryConcept(`param:${p.id}`), `Missing concept for param:${p.id}`).toBeDefined();
      if (p.category) {
        expect(getTheoryConcept(`cat:${p.category}`), `Missing concept for cat:${p.category}`).toBeDefined();
      }
    }

    for (const prop of pipe.getAvailableProperties()) {
      expect(getTheoryConcept(`pill:${prop.key}`), `Missing concept for pill:${prop.key}`).toBeDefined();
    }

    // Run simulation with both fittings and pump enabled to verify every KPI card ID
    const res = pipe.calculate({
      fluid: 'Water',
      velocity: 2.0,
      diameter_mm: 50,
      length_m: 60,
      n_elbow_90: 2,
      pump_enabled: true,
      drive_mode: 'operating_point',
      h_shutoff_m: 45,
      q_max_m3h: 30,
      q_bep_m3h: 15,
      eta_bep: 0.72,
      npshr_m: 2.5
    });
    for (const m of res.metrics) {
      expect(getTheoryConcept(`kpi:${m.id}`), `Missing concept for kpi:${m.id}`).toBeDefined();
    }

    // Warning classifier covers all diagnostic families
    const sampleWarnings = [
      'Inlet temperature is below the freezing point of Benzene',
      'it would boil, not flow as a liquid.',
      'the liquid would flash.',
      'Valve cavitation likely: outlet margin above vapor pressure',
      'the pump cavitates.',
      'NPSH margin is 0.25 m.',
      'Shutoff head is 12.0 m and the static head is 40.3 m.',
      'A real pump would run out beyond this curve.',
      'Velocity 3.50 m/s is above the liquid discharge band',
      'Transitional flow (2300 ≤ Re < 4000)',
      'Laminar entrance length L_e ≈ 0.05·Re·D',
      'Elevation rise limited to ±L',
      'Flow is the pump–system intersection',
      'Liquid viscosity correlation extrapolated outside [273, 373] K'
    ];
    for (const msg of sampleWarnings) {
      const cid = resolveWarningConceptId(msg);
      expect(getTheoryConcept(cid), `Unresolved warning concept "${cid}" for "${msg}"`).toBeDefined();
    }
  });
});

describe('Theory Search & Hash Router', () => {
  it('ranks relevant documents for engineering queries', () => {
    const colebrookHits = TheoryRepository.search('Colebrook');
    expect(colebrookHits.length).toBeGreaterThan(0);
    expect(colebrookHits[0].doc.slug).toBe('pipe-flow/02-friction-and-moody-diagram');

    const npshHits = TheoryRepository.search('NPSH cavitation');
    expect(npshHits.length).toBeGreaterThan(0);
    expect(npshHits[0].doc.slug).toBe('pipe-flow/05-centrifugal-pumps-and-npsh');

    const jtHits = TheoryRepository.search('Joule');
    expect(jtHits.some((h) => h.doc.slug === 'fundamentals/02-conservation-and-second-law')).toBe(true);
  });

  it('parses and builds simulator and theory hash routes cleanly', () => {
    expect(parseHashRoute('')).toEqual({ kind: 'simulator', unitId: 'pipe_flow' });
    expect(parseHashRoute('#/')).toEqual({ kind: 'simulator', unitId: 'pipe_flow' });
    expect(parseHashRoute('#/unit/pipe_flow')).toEqual({ kind: 'simulator', unitId: 'pipe_flow' });
    expect(parseHashRoute('#/theory')).toEqual({ kind: 'theory', slug: 'README' });
    expect(parseHashRoute('#/theory/nomenclature')).toEqual({ kind: 'theory', slug: 'nomenclature', anchor: undefined });
    expect(parseHashRoute('#/theory/pipe-flow/02-friction-and-moody-diagram#3-turbulent-friction-factor-correlations-frictionmodel')).toEqual({
      kind: 'theory',
      slug: 'pipe-flow/02-friction-and-moody-diagram',
      anchor: '3-turbulent-friction-factor-correlations-frictionmodel'
    });

    expect(buildTheoryHash('README')).toBe('#/theory');
    expect(buildTheoryHash('pipe-flow/05-centrifugal-pumps-and-npsh', '52-npsha-governing-equation')).toBe(
      '#/theory/pipe-flow/05-centrifugal-pumps-and-npsh#52-npsha-governing-equation'
    );
    expect(buildSimulatorHash('pipe_flow')).toBe('#/');
  });
});
