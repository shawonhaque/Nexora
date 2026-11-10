import type { IconName } from '../news/ArticleCard';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  /** Match the route exactly rather than as a prefix. Used for the home link. */
  end?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * The single source of truth for navigation, used by the sidebar, the mobile
 * drawer and the footer. Every entry resolves to a real route.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Discover',
    items: [
      { to: '/', label: 'Home Dashboard', icon: 'chart', end: true },
      { to: '/explore', label: 'Explore', icon: 'compass' },
      { to: '/search', label: 'Intelligent Search', icon: 'search' },
    ],
  },
  {
    title: 'Live Feeds',
    items: [
      { to: '/world', label: 'World News', icon: 'globe' },
      { to: '/technology', label: 'Technology', icon: 'chip' },
      { to: '/ai', label: 'Artificial Intelligence', icon: 'brain' },
      { to: '/science', label: 'Science', icon: 'flask' },
      { to: '/education', label: 'Education', icon: 'book' },
      { to: '/business', label: 'Business', icon: 'trend' },
    ],
  },
  {
    title: 'My Library',
    items: [
      { to: '/library', label: 'Library', icon: 'bookmark' },
      { to: '/saved', label: 'Saved Articles', icon: 'bookmark' },
      { to: '/history', label: 'Reading History', icon: 'clock' },
    ],
  },
  {
    title: 'Knowledge Base',
    items: [
      { to: '/knowledge', label: 'Knowledge', icon: 'sparkle' },
      { to: '/learning', label: 'Learning', icon: 'chart' },
      { to: '/books', label: 'Books', icon: 'book' },
      { to: '/study', label: 'Study', icon: 'filter' },
      { to: '/writing', label: 'Writing', icon: 'external' },
      { to: '/ideas', label: 'Ideas', icon: 'plus' },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/profile', label: 'Profile', icon: 'user' },
      { to: '/settings', label: 'Settings', icon: 'settings' },
      { to: '/about', label: 'About Nexora', icon: 'shield' },
    ],
  },
];

/** Flat list, used by the footer and anywhere a single list is needed. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
