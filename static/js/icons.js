import { ArrowRight, BookOpen, Box, Check, Copy, ExternalLink, Globe2, Info, RotateCcw, TriangleAlert, UserRound, X, Phone, Eye, FlaskConical } from 'lucide';

const inner = icon => icon[2].map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([key, value]) => `${key}="${value}"`).join(' ')}/>`).join('');
export const mark = '<path d="M4 18V5c3.7-1.4 6.4.2 8 3 1.6-2.8 4.3-4.4 8-3v13c-3.7-1.4-6.4.2-8 3-1.6-2.8-4.3-4.4-8-3Z"/><path d="M12 8v13"/>';
export const ICON = Object.fromEntries(Object.entries({ arrowRight: ArrowRight, book: BookOpen, cube: Box, check: Check, copy: Copy, link: ExternalLink, globe: Globe2, info: Info, retry: RotateCcw, warning: TriangleAlert, user: UserRound, close: X, phone: Phone, eye: Eye, lab: FlaskConical }).map(([key, value]) => [key, inner(value)]));
ICON.pulse = mark;
export const svg = (content, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${content}</svg>`;

export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(node => { node.innerHTML = svg(ICON[node.dataset.icon] || ICON.info); });
}
