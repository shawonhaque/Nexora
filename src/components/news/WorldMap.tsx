import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../news/ArticleCard';
import { CONTINENTS, type ContinentId } from '../../lib/regions';
import type { ContinentStat } from '../../services/newsService';

/**
 * The interactive world map.
 *
 * The shapes are deliberately simplified outlines rather than a survey-grade
 * atlas: they exist to be clicked, and a hand-drawn silhouette is honest about
 * being a navigation aid. Each shape carries its own live article count from
 * the current snapshot, so the map is a data view, not decoration.
 */

interface Shape {
  id: ContinentId;
  /** SVG path in a 1000x500 viewBox. */
  path: string;
  /** Where to place the label. */
  label: { x: number; y: number };
}

const SHAPES: Shape[] = [
  {
    id: 'north-america',
    path: 'M60 40 L300 30 L320 70 L280 95 L300 130 L250 165 L235 205 L195 215 L170 190 L150 150 L110 130 L75 105 Z',
    label: { x: 175, y: 120 },
  },
  {
    id: 'south-america',
    path: 'M235 235 L290 225 L310 255 L295 320 L265 400 L240 440 L215 410 L210 350 L200 300 L215 260 Z',
    label: { x: 252, y: 330 },
  },
  {
    id: 'europe',
    path: 'M420 55 L520 45 L545 70 L530 100 L495 118 L460 108 L430 90 Z',
    label: { x: 483, y: 82 },
  },
  {
    id: 'africa',
    path: 'M430 135 L530 130 L555 170 L545 230 L510 300 L475 340 L450 310 L430 250 L415 190 Z',
    label: { x: 485, y: 235 },
  },
  {
    id: 'asia',
    path: 'M545 40 L800 35 L860 80 L845 130 L790 155 L740 200 L690 215 L640 190 L590 160 L555 120 L535 80 Z',
    label: { x: 690, y: 120 },
  },
  {
    id: 'oceania',
    path: 'M760 300 L850 295 L880 330 L855 370 L790 380 L750 350 Z',
    label: { x: 815, y: 338 },
  },
  {
    id: 'antarctica',
    path: 'M180 455 L400 440 L600 445 L820 460 L860 480 L600 492 L300 490 L150 475 Z',
    label: { x: 500, y: 472 },
  },
];

export function WorldMap({
  stats,
  active,
  onSelect,
}: {
  stats: ContinentStat[];
  active: ContinentId | null;
  onSelect: (id: ContinentId) => void;
}) {
  const [hovered, setHovered] = useState<ContinentId | null>(null);
  const counts = useMemo(
    () => Object.fromEntries(stats.map((stat) => [stat.id, stat.articles])) as Record<ContinentId, number>,
    [stats]
  );
  const focus = hovered ?? active;

  return (
    <div className="relative">
      <svg
        viewBox="0 0 1000 500"
        className="w-full"
        role="group"
        aria-label="Interactive world map. Choose a continent to open its live news."
      >
        <defs>
          <linearGradient id="map-active" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0.9" />
            <stop offset="100%" stopColor="rgb(var(--c-accent2))" stopOpacity="0.65" />
          </linearGradient>
        </defs>

        {SHAPES.map((shape) => {
          const isActive = focus === shape.id;
          const continent = CONTINENTS.find((item) => item.id === shape.id);
          return (
            <g key={shape.id}>
              <path
                d={shape.path}
                role="button"
                tabIndex={0}
                aria-label={`${continent?.name}: ${counts[shape.id] ?? 0} articles`}
                aria-pressed={active === shape.id}
                onClick={() => onSelect(shape.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(shape.id);
                  }
                }}
                onMouseEnter={() => setHovered(shape.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(shape.id)}
                onBlur={() => setHovered(null)}
                className="cursor-pointer outline-none transition-all duration-200"
                style={{
                  fill: isActive ? 'url(#map-active)' : 'currentColor',
                  fillOpacity: isActive ? 0.9 : 0.12,
                  stroke: isActive ? 'rgb(var(--c-accent))' : 'currentColor',
                  strokeOpacity: isActive ? 0.9 : 0.28,
                  strokeWidth: isActive ? 2 : 1.2,
                }}
              />
              <text
                x={shape.label.x}
                y={shape.label.y}
                textAnchor="middle"
                className="pointer-events-none select-none"
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  fill: isActive ? '#fff' : 'currentColor',
                  opacity: isActive ? 1 : 0.55,
                }}
              >
                {continent?.short}
              </text>
              <text
                x={shape.label.x}
                y={shape.label.y + 17}
                textAnchor="middle"
                className="pointer-events-none select-none font-mono"
                style={{ fontSize: 11, fill: isActive ? '#fff' : 'currentColor', opacity: isActive ? 0.9 : 0.4 }}
              >
                {counts[shape.id] ?? 0}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mt-2 text-center text-xs text-muted">
        Outlines are simplified for navigation. Counts are live articles in the current snapshot.
      </p>
    </div>
  );
}

/** The continent picker used under the map and on narrow screens. */
export function ContinentGrid({ stats }: { stats: ContinentStat[] }) {
  return (
    <div className="grid border-t border-line sm:grid-cols-2 lg:grid-cols-3">
      {CONTINENTS.map((continent) => {
        const stat = stats.find((entry) => entry.id === continent.id);
        return (
          <Link
            key={continent.id}
            to={`/continent/${continent.id}`}
            className="group flex flex-col gap-2 border-b border-line px-1 py-4 transition-colors hover:text-accent sm:odd:border-r sm:odd:pr-5 sm:even:pl-5 lg:[&:nth-child(3n+1)]:pr-5 lg:[&:nth-child(3n+2)]:px-5 lg:[&:nth-child(3n)]:pl-5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex items-baseline gap-2.5 font-serif text-[1.1rem] text-heading transition-colors group-hover:text-accent">
                <span aria-hidden="true" className="text-sm opacity-60">{continent.glyph}</span>
                {continent.name}
              </span>
              <span className="tabular font-mono text-xs text-muted">{stat?.articles ?? 0}</span>
            </div>
            <p className="text-xs leading-relaxed text-muted">{continent.blurb}</p>
            <p className="mt-auto flex items-center gap-1 pt-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-accent">
              Open feed <Icon name="arrow-right" className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </p>
          </Link>
        );
      })}
    </div>
  );
}
