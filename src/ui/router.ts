export type AppRoute =
  | { kind: 'simulator'; unitId: string }
  | { kind: 'theory'; slug: string; anchor?: string };

export function parseHashRoute(hash: string): AppRoute {
  const raw = hash.replace(/^#/, '');
  if (!raw || raw === '/' || raw === '/simulator') {
    return { kind: 'simulator', unitId: 'pipe_flow' };
  }

  const unitMatch = raw.match(/^\/unit\/([^#/?]+)/);
  if (unitMatch) {
    return { kind: 'simulator', unitId: decodeURIComponent(unitMatch[1]) };
  }

  if (raw === '/theory' || raw === '/theory/') {
    return { kind: 'theory', slug: 'README' };
  }

  if (raw.startsWith('/theory/')) {
    const rest = raw.slice('/theory/'.length);
    const hashIdx = rest.indexOf('#');
    const rawSlug = hashIdx >= 0 ? rest.slice(0, hashIdx) : rest;
    const rawAnchor = hashIdx >= 0 ? rest.slice(hashIdx + 1) : undefined;
    const slug = decodeURIComponent(rawSlug).replace(/^\/+|\/+$/g, '') || 'README';
    const anchor = rawAnchor ? decodeURIComponent(rawAnchor) : undefined;
    return { kind: 'theory', slug, anchor };
  }

  return { kind: 'simulator', unitId: 'pipe_flow' };
}

export function buildTheoryHash(slug: string, anchor?: string): string {
  const cleanSlug = slug.replace(/^\/+|\/+$/g, '') || 'README';
  if (cleanSlug === 'README' && !anchor) return '#/theory';
  return anchor ? `#/theory/${cleanSlug}#${anchor}` : `#/theory/${cleanSlug}`;
}

export function buildSimulatorHash(unitId = 'pipe_flow'): string {
  return unitId === 'pipe_flow' ? '#/' : `#/unit/${encodeURIComponent(unitId)}`;
}

export class AppRouter {
  private onChange: (route: AppRoute) => void;

  constructor(onChange: (route: AppRoute) => void) {
    this.onChange = onChange;
    window.addEventListener('hashchange', () => {
      this.onChange(this.getCurrentRoute());
    });
  }

  public getCurrentRoute(): AppRoute {
    return parseHashRoute(window.location.hash);
  }

  public start(): void {
    this.onChange(this.getCurrentRoute());
  }

  public navigateToSimulator(unitId = 'pipe_flow'): void {
    const target = buildSimulatorHash(unitId);
    if (window.location.hash === target || (target === '#/' && window.location.hash === '')) {
      this.onChange({ kind: 'simulator', unitId });
      return;
    }
    window.location.hash = target;
  }

  public navigateToTheory(slug: string, anchor?: string): void {
    const target = buildTheoryHash(slug, anchor);
    if (window.location.hash === target) {
      // Force re-scroll to anchor even if already on the exact same hash
      this.onChange({ kind: 'theory', slug, anchor });
      return;
    }
    window.location.hash = target;
  }
}
