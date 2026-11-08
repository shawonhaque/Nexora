export interface NavItem {
  to: string;
  label: string;
  /** Match the route exactly rather than as a prefix. Used for the home link. */
  end?: boolean;
}

/** Primary navigation, shared by the header and the footer. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/news', label: 'News' },
  { to: '/books', label: 'Books' },
  { to: '/study', label: 'Study' },
  { to: '/knowledge', label: 'Knowledge' },
  { to: '/writing', label: 'Writing' },
  { to: '/ideas', label: 'Ideas' },
  { to: '/learning', label: 'Learning' },
  { to: '/bookmarks', label: 'Bookmarks' },
];
