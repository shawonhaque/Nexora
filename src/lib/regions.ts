/**
 * The geographic layer.
 *
 * Every article carries one continent and one country, assigned from the
 * publisher's own feed at build time. Nothing here is guessed at render time:
 * the continent is a property of the source, so a BBC Europe story is Europe
 * because it came from BBC's Europe feed, not because a keyword matched.
 *
 * Antarctica has no general-interest newspaper, so its "news" is the research
 * and logistics reporting published by the national programmes that work
 * there — that is what actually happens on the continent.
 */

export type ContinentId =
  | 'asia'
  | 'europe'
  | 'africa'
  | 'north-america'
  | 'south-america'
  | 'oceania'
  | 'antarctica';

export interface Continent {
  id: ContinentId;
  name: string;
  /** Short label for chips and tabs. */
  short: string;
  blurb: string;
  /** Countries with a dedicated feed in this continent, in display order. */
  countries: string[];
  /** Emoji used as a lightweight visual marker. */
  glyph: string;
}

export const CONTINENTS: Continent[] = [
  {
    id: 'asia',
    name: 'Asia',
    short: 'Asia',
    blurb: 'Bangladesh, India, China, Japan, Korea, Southeast Asia and the Gulf, from their own newsrooms.',
    countries: [
      'Bangladesh', 'India', 'Pakistan', 'China', 'Japan', 'South Korea', 'Taiwan', 'Mongolia',
      'Indonesia', 'Malaysia', 'Singapore', 'Thailand', 'Vietnam', 'Philippines', 'Myanmar',
      'Nepal', 'Bhutan', 'Sri Lanka', 'Kazakhstan', 'Uzbekistan', 'Georgia', 'Israel', 'Jordan',
      'Saudi Arabia', 'United Arab Emirates', 'Qatar',
    ],
    glyph: '🌏',
  },
  {
    id: 'europe',
    name: 'Europe',
    short: 'Europe',
    blurb: 'From Ireland to the Urals, each country reported by its own press.',
    countries: [
      'United Kingdom', 'Ireland', 'France', 'Germany', 'Italy', 'Spain', 'Portugal', 'Netherlands',
      'Belgium', 'Luxembourg', 'Switzerland', 'Austria', 'Denmark', 'Sweden', 'Finland', 'Iceland',
      'Estonia', 'Latvia', 'Poland', 'Czechia', 'Hungary', 'Romania', 'Bulgaria', 'Croatia',
      'Serbia', 'Albania', 'Malta', 'Cyprus', 'Ukraine', 'Moldova', 'Russia',
    ],
    glyph: '🌍',
  },
  {
    id: 'africa',
    name: 'Africa',
    short: 'Africa',
    blurb: 'From the Maghreb to the Cape, reported by African newsrooms themselves.',
    countries: [
      'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Ethiopia', 'Egypt', 'Morocco', 'Tunisia',
      'Senegal', 'Mali', 'Guinea', 'Liberia', 'Burkina Faso', 'Benin', 'Niger', 'Chad',
      'Cameroon', 'DR Congo', 'Tanzania', 'Zambia', 'Zimbabwe', 'Malawi', 'Namibia',
      'Madagascar', 'Mauritius',
    ],
    glyph: '🌍',
  },
  {
    id: 'north-america',
    name: 'North America',
    short: 'N. America',
    blurb: 'The US and Canada, plus Central America and the Caribbean.',
    countries: [
      'United States', 'Canada', 'Mexico', 'Guatemala', 'Honduras', 'Costa Rica', 'Nicaragua',
      'Cuba', 'Haiti', 'Dominican Republic', 'Jamaica',
    ],
    glyph: '🌎',
  },
  {
    id: 'south-america',
    name: 'South America',
    short: 'S. America',
    blurb: 'Every mainland country on the continent, in its own coverage.',
    countries: [
      'Brazil', 'Argentina', 'Colombia', 'Chile', 'Peru', 'Venezuela', 'Ecuador', 'Bolivia',
      'Paraguay', 'Uruguay', 'Guyana', 'Suriname',
    ],
    glyph: '🌎',
  },
  {
    id: 'oceania',
    name: 'Oceania',
    short: 'Oceania',
    blurb: 'Australia, New Zealand and the island states of the Pacific.',
    countries: ['Australia', 'New Zealand', 'Papua New Guinea', 'Fiji', 'Tonga'],
    glyph: '🌏',
  },
  {
    id: 'antarctica',
    name: 'Antarctica',
    short: 'Antarctica',
    blurb: 'Research, ice and logistics reporting from the national Antarctic programmes.',
    countries: ['Antarctica'],
    glyph: '🧊',
  },
];

export const CONTINENT_META: Record<ContinentId, Continent> = Object.fromEntries(
  CONTINENTS.map((continent) => [continent.id, continent])
) as Record<ContinentId, Continent>;

export const CONTINENT_IDS = CONTINENTS.map((continent) => continent.id);

/** The Bangladesh section is a first-class part of the site, not a country page. */
export const BANGLADESH_SECTION = {
  id: 'bangladesh' as const,
  name: 'Bangladesh',
  blurb: 'Politics, Dhaka, education and jobs, cricket, the economy, expatriates and weather.',
  glyph: '🇧🇩',
};

/**
 * Bangladesh's editorial desks. Each maps to a `desk` value written into the
 * snapshot at build time, so the section can be filtered without guessing
 * from headline keywords.
 */
export type BangladeshDesk =
  | 'national'
  | 'dhaka'
  | 'education-jobs'
  | 'sports'
  | 'economy'
  | 'tech'
  | 'expatriates'
  | 'weather';

export const BANGLADESH_DESKS: { id: BangladeshDesk; label: string; blurb: string }[] = [
  { id: 'national', label: 'National & politics', blurb: 'Parliament, parties, policy and the national agenda.' },
  { id: 'dhaka', label: 'Dhaka & divisions', blurb: 'The capital and the divisional cities.' },
  { id: 'education-jobs', label: 'Education & jobs', blurb: 'Schools, universities, BCS and public-service recruitment.' },
  { id: 'sports', label: 'Cricket & football', blurb: 'The national teams and the domestic game.' },
  { id: 'economy', label: 'Economy & business', blurb: 'Markets, garments, remittances and trade.' },
  { id: 'tech', label: 'Tech & startups', blurb: 'Local startups, telecoms and the technology trade.' },
  { id: 'expatriates', label: 'Probashi', blurb: 'Bangladeshis abroad — migration, remittance and diaspora life.' },
  { id: 'weather', label: 'Weather & disasters', blurb: 'Cyclones, flooding, heat and the warnings that precede them.' },
];
