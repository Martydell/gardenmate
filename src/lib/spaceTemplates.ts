export type TemplateId =
  | 'plain-room'
  | 'kitchen'
  | 'conservatory'
  | 'garden-bed'
  | 'decking'
  | 'mixed';

export interface SpaceTemplate {
  id: TemplateId;
  label: string;
  category: 'indoor' | 'outdoor';
  svg: string;
}

const VIEW_BOX = '0 0 800 600';

function horizontalLines(count: number, spacing: number, startY: number, color: string) {
  return Array.from({ length: count }, (_, i) => {
    const y = startY + i * spacing;
    return `<line x1="20" y1="${y}" x2="780" y2="${y}" stroke="${color}" stroke-width="2" />`;
  }).join('');
}

function gridLines(color: string) {
  const verticals = Array.from(
    { length: 9 },
    (_, i) => `<line x1="${100 * i + 20}" y1="20" x2="${100 * i + 20}" y2="580" stroke="${color}" stroke-width="2" />`,
  ).join('');
  const horizontals = Array.from(
    { length: 7 },
    (_, i) => `<line x1="20" y1="${100 * i + 20}" x2="780" y2="${100 * i + 20}" stroke="${color}" stroke-width="2" />`,
  ).join('');
  return verticals + horizontals;
}

export const SPACE_TEMPLATES: SpaceTemplate[] = [
  {
    id: 'plain-room',
    label: 'Plain Room',
    category: 'indoor',
    svg: `<svg viewBox="${VIEW_BOX}" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#e5e5e5" />
      <rect x="20" y="20" width="760" height="560" fill="#d4d4d4" stroke="#a3a3a3" stroke-width="6" />
    </svg>`,
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    category: 'indoor',
    svg: `<svg viewBox="${VIEW_BOX}" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#f5f0e8" />
      <rect x="20" y="20" width="760" height="560" fill="#ede4d3" stroke="#c4b8a0" stroke-width="6" />
      <rect x="20" y="20" width="760" height="70" fill="#8d6e63" />
      <rect x="20" y="20" width="70" height="560" fill="#8d6e63" />
      <rect x="350" y="300" width="180" height="90" fill="#a1887f" stroke="#6d4c41" stroke-width="3" />
    </svg>`,
  },
  {
    id: 'conservatory',
    label: 'Conservatory',
    category: 'indoor',
    svg: `<svg viewBox="${VIEW_BOX}" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#eaf6f6" />
      <rect x="20" y="20" width="760" height="560" fill="#dff2f2" stroke="#8fc7c7" stroke-width="6" />
      ${gridLines('#b6e0e0')}
    </svg>`,
  },
  {
    id: 'garden-bed',
    label: 'Garden Bed',
    category: 'outdoor',
    svg: `<svg viewBox="${VIEW_BOX}" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#c8e6c9" />
      <rect x="40" y="40" width="720" height="520" rx="16" fill="#81c784" stroke="#4c8c4a" stroke-width="6" />
    </svg>`,
  },
  {
    id: 'decking',
    label: 'Decking',
    category: 'outdoor',
    svg: `<svg viewBox="${VIEW_BOX}" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#a1887f" />
      ${horizontalLines(11, 50, 40, '#6d4c41')}
    </svg>`,
  },
  {
    id: 'mixed',
    label: 'Mixed',
    category: 'outdoor',
    svg: `<svg viewBox="${VIEW_BOX}" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#e5e5e5" />
      <rect x="0" y="0" width="420" height="600" fill="#81c784" />
      <rect x="420" y="0" width="220" height="600" fill="#a1887f" />
      ${horizontalLines(11, 50, 30, '#6d4c41').replace(/x1="20"/g, 'x1="420"').replace(/x2="780"/g, 'x2="640"')}
      <rect x="640" y="0" width="160" height="600" fill="#b0bec5" />
    </svg>`,
  },
];

export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function getTemplate(id: TemplateId): SpaceTemplate | undefined {
  return SPACE_TEMPLATES.find((template) => template.id === id);
}
