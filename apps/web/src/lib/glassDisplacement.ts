type GlassDisplacementOptions = {
  selector?: string;
  filterId?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultRadius?: number;
};

const DEFAULTS: Required<GlassDisplacementOptions> = {
  selector:
    '.agendo-glass--displacement, .day-form-panel, .day-checkin-modal, .completion-sheet, .confirm-sheet, .plan-exit-modal, .plan-existing-blocks-modal, .sheet-panel',
  filterId: 'agendo-glass-filter',
  defaultWidth: 240,
  defaultHeight: 80,
  defaultRadius: 28,
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const parseRadius = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const first = value.split(' ')[0];
  const parsed = Number.parseFloat(first);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildDisplacementSvg = (width: number, height: number, radius: number) => {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const safeRadius = clamp(Math.round(radius), 0, Math.min(safeWidth, safeHeight) / 2);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${safeWidth} ${safeHeight}">
      <defs>
        <linearGradient id="agendo-r" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stop-color="black"/>
          <stop offset="100%" stop-color="red"/>
        </linearGradient>
        <linearGradient id="agendo-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="black"/>
          <stop offset="100%" stop-color="blue"/>
        </linearGradient>
      </defs>
      <rect width="${safeWidth}" height="${safeHeight}" fill="black"/>
      <rect width="${safeWidth}" height="${safeHeight}" rx="${safeRadius}" fill="url(#agendo-r)"/>
      <rect width="${safeWidth}" height="${safeHeight}" rx="${safeRadius}" fill="url(#agendo-b)" style="mix-blend-mode:difference"/>
    </svg>
  `.trim();

  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml,${encoded}`;
};

const getMaxGlassSize = (elements: Element[], fallbackRadius: number) => {
  let maxWidth = 0;
  let maxHeight = 0;
  let maxRadius = fallbackRadius;

  elements.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    const rect = el.getBoundingClientRect();
    maxWidth = Math.max(maxWidth, rect.width);
    maxHeight = Math.max(maxHeight, rect.height);
    const radius = parseRadius(window.getComputedStyle(el).borderRadius, fallbackRadius);
    maxRadius = Math.max(maxRadius, radius);
  });

  return {
    width: maxWidth || DEFAULTS.defaultWidth,
    height: maxHeight || DEFAULTS.defaultHeight,
    radius: maxRadius || fallbackRadius,
  };
};

export const injectGlassDisplacementMap = (options: GlassDisplacementOptions = {}) => {
  if (typeof document === 'undefined') return;
  const { selector, filterId, defaultRadius } = { ...DEFAULTS, ...options };
  const feImage = document.querySelector(`#${filterId} feImage`);
  if (!feImage) return;

  const elements = Array.from(document.querySelectorAll(selector));
  const { width, height, radius } = getMaxGlassSize(elements, defaultRadius);
  const dataUri = buildDisplacementSvg(width, height, radius);
  feImage.setAttribute('href', dataUri);
};

export const setupGlassDisplacement = (options: GlassDisplacementOptions = {}) => {
  if (typeof window === 'undefined') return () => {};
  const opts = { ...DEFAULTS, ...options };

  let frame: number | null = null;
  const refresh = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      injectGlassDisplacementMap(opts);
      frame = null;
    });
  };

  refresh();

  const handleResize = () => refresh();
  window.addEventListener('resize', handleResize);

  let observer: ResizeObserver | null = null;
  let mutationObserver: MutationObserver | null = null;
  if ('ResizeObserver' in window) {
    observer = new ResizeObserver(() => refresh());
    document.querySelectorAll(opts.selector).forEach((el) => observer?.observe(el));
  }

  if ('MutationObserver' in window) {
    mutationObserver = new MutationObserver(() => {
      if (observer) {
        document.querySelectorAll(opts.selector).forEach((el) => observer?.observe(el));
      }
      refresh();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  return () => {
    window.removeEventListener('resize', handleResize);
    if (observer) observer.disconnect();
    if (mutationObserver) mutationObserver.disconnect();
    if (frame !== null) cancelAnimationFrame(frame);
  };
};
