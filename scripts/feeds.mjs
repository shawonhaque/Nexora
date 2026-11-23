/**
 * Build-time feed fetcher.
 *
 * Browsers cannot read most news RSS feeds directly: the servers do not send
 * CORS headers. The build, however, runs in Node on GitHub Actions with open
 * network access, so the real feeds are fetched here and written to a JSON
 * snapshot that the site loads statically.
 *
 * Every item in the output is real: the title, link, source, and publication
 * date all come from the publisher's own feed. Nothing is generated.
 *
 * If a feed fails, it is reported and skipped — the previous snapshot for that
 * source is not invented, and the build continues with the sources that worked.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const OUT = join(process.cwd(), 'public', 'data', 'feeds.json');
const TIMEOUT_MS = 20000;
const MAX_ITEMS_PER_FEED = 20;
/** Anything older than this is dropped: publishers keep archives in their feeds. */
const MAX_AGE_DAYS = 14;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
const USER_AGENT = 'NexoraBot/1.0 (+https://github.com/shawonhaque/Nexora)';

/**
 * The feed registry. `category` maps to the site sections; `home` is the
 * publisher's homepage, shown as attribution.
 */
const FEEDS = [
  // ===================================================== ASIA
  // ---- Bangladesh (also powers the Bangladesh Special section) ----------
  { id: 'bd-dailystar', name: 'The Daily Star', home: 'https://www.thedailystar.net', category: 'breaking', continent: 'asia', country: 'Bangladesh', desk: 'national', url: 'https://www.thedailystar.net/frontpage/rss.xml' },
  { id: 'bd-dailystar-sport', name: 'The Daily Star', home: 'https://www.thedailystar.net/sports', category: 'sports', continent: 'asia', country: 'Bangladesh', desk: 'sports', url: 'https://www.thedailystar.net/sports/rss.xml' },
  { id: 'bd-dailystar-biz', name: 'The Daily Star', home: 'https://www.thedailystar.net/business', category: 'business', continent: 'asia', country: 'Bangladesh', desk: 'economy', url: 'https://www.thedailystar.net/business/rss.xml' },
  { id: 'bd-dailystar-tech', name: 'The Daily Star', home: 'https://www.thedailystar.net/tech-startup', category: 'technology', continent: 'asia', country: 'Bangladesh', desk: 'tech', url: 'https://www.thedailystar.net/tech-startup/rss.xml' },
  { id: 'bd-prothomalo', name: 'Prothom Alo', home: 'https://www.prothomalo.com', category: 'breaking', continent: 'asia', country: 'Bangladesh', desk: 'national', url: 'https://www.prothomalo.com/feed' },
  { id: 'bd-bdnews24', name: 'bdnews24', home: 'https://bdnews24.com', category: 'breaking', continent: 'asia', country: 'Bangladesh', desk: 'dhaka', url: 'https://bdnews24.com/?widgetName=rssfeed&widgetId=1150&getXmlFeed=true' },

  // ---- India ------------------------------------------------------------
  { id: 'in-toi', name: 'Times of India', home: 'https://timesofindia.indiatimes.com', category: 'world', continent: 'asia', country: 'India', url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms' },
  { id: 'in-hindu', name: 'The Hindu', home: 'https://www.thehindu.com', category: 'world', continent: 'asia', country: 'India', url: 'https://www.thehindu.com/news/feeder/default.rss' },
  { id: 'in-ndtv', name: 'NDTV', home: 'https://www.ndtv.com', category: 'breaking', continent: 'asia', country: 'India', url: 'https://feeds.feedburner.com/ndtvnews-top-stories' },

  // ---- Pakistan ---------------------------------------------------------
  { id: 'pk-dawn', name: 'Dawn', home: 'https://www.dawn.com', category: 'world', continent: 'asia', country: 'Pakistan', url: 'https://www.dawn.com/feeds/home' },
  { id: 'pk-tribune', name: 'The Express Tribune', home: 'https://tribune.com.pk', category: 'world', continent: 'asia', country: 'Pakistan', url: 'https://tribune.com.pk/feed/home' },
  { id: 'pk-thenews', name: 'The News International', home: 'https://www.thenews.com.pk', category: 'world', continent: 'asia', country: 'Pakistan', url: 'https://www.thenews.com.pk/rss/1/1' },

  // ---- China ------------------------------------------------------------
  { id: 'cn-scmp', name: 'South China Morning Post', home: 'https://www.scmp.com', category: 'world', continent: 'asia', country: 'China', url: 'https://www.scmp.com/rss/91/feed' },

  // ---- Japan ------------------------------------------------------------
  { id: 'jp-japantimes', name: 'The Japan Times', home: 'https://www.japantimes.co.jp', category: 'world', continent: 'asia', country: 'Japan', url: 'https://www.japantimes.co.jp/feed/' },
  { id: 'jp-nhk', name: 'NHK', home: 'https://www3.nhk.or.jp', category: 'breaking', continent: 'asia', country: 'Japan', url: 'https://www3.nhk.or.jp/rss/news/cat0.xml' },
  { id: 'jp-mainichi', name: 'Mainichi', home: 'https://mainichi.jp', category: 'world', continent: 'asia', country: 'Japan', url: 'https://mainichi.jp/rss/etc/mainichi-flash.rss' },

  // ---- Gulf: covers Saudi Arabia, whose own outlets publish no usable feed
  { id: 'gulf-thenational', name: 'The National', home: 'https://www.thenationalnews.com', category: 'world', continent: 'asia', country: 'United Arab Emirates', covers: ['Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Oman', 'Bahrain'], url: 'https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml' },
  { id: 'gulf-mem', name: 'Middle East Monitor', home: 'https://www.middleeastmonitor.com', category: 'politics', continent: 'asia', country: 'United Kingdom', covers: ['Saudi Arabia', 'Palestine', 'Israel', 'Egypt', 'United Arab Emirates'], url: 'https://www.middleeastmonitor.com/feed/' },

  // ===================================================== EUROPE
  { id: 'uk-bbc-europe', name: 'BBC News', home: 'https://www.bbc.com/news/world/europe', category: 'world', continent: 'europe', country: 'United Kingdom', url: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml' },
  { id: 'uk-guardian-europe', name: 'The Guardian', home: 'https://www.theguardian.com/world/europe-news', category: 'world', continent: 'europe', country: 'United Kingdom', url: 'https://www.theguardian.com/world/europe-news/rss' },
  { id: 'uk-bbc-politics', name: 'BBC News', home: 'https://www.bbc.com/news/politics', category: 'politics', continent: 'europe', country: 'United Kingdom', url: 'https://feeds.bbci.co.uk/news/politics/rss.xml' },
  { id: 'uk-guardian-politics', name: 'The Guardian', home: 'https://www.theguardian.com/politics', category: 'politics', continent: 'europe', country: 'United Kingdom', url: 'https://www.theguardian.com/politics/rss' },
  { id: 'uk-guardian-env', name: 'The Guardian', home: 'https://www.theguardian.com/environment', category: 'environment', continent: 'europe', country: 'United Kingdom', url: 'https://www.theguardian.com/environment/rss' },
  { id: 'uk-guardian-culture', name: 'The Guardian', home: 'https://www.theguardian.com/culture', category: 'entertainment', continent: 'europe', country: 'United Kingdom', url: 'https://www.theguardian.com/culture/rss' },
  { id: 'uk-guardian-sport', name: 'The Guardian', home: 'https://www.theguardian.com/sport', category: 'sports', continent: 'europe', country: 'United Kingdom', url: 'https://www.theguardian.com/sport/rss' },
  { id: 'uk-bbc-sport', name: 'BBC Sport', home: 'https://www.bbc.com/sport', category: 'sports', continent: 'europe', country: 'United Kingdom', url: 'https://feeds.bbci.co.uk/sport/rss.xml' },
  { id: 'uk-bbc-ent', name: 'BBC News', home: 'https://www.bbc.com/news/entertainment_and_arts', category: 'entertainment', continent: 'europe', country: 'United Kingdom', url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml' },
  { id: 'uk-bbc-health', name: 'BBC News', home: 'https://www.bbc.com/news/health', category: 'health', continent: 'europe', country: 'United Kingdom', url: 'https://feeds.bbci.co.uk/news/health/rss.xml' },
  { id: 'uk-bbc-tech', name: 'BBC News', home: 'https://www.bbc.com/news/technology', category: 'technology', continent: 'europe', country: 'United Kingdom', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
  { id: 'uk-bbc-business', name: 'BBC News', home: 'https://www.bbc.com/news/business', category: 'business', continent: 'europe', country: 'United Kingdom', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { id: 'uk-bbc-education', name: 'BBC News', home: 'https://www.bbc.com/news/education', category: 'education', continent: 'europe', country: 'United Kingdom', url: 'https://feeds.bbci.co.uk/news/education/rss.xml' },
  { id: 'uk-bbc-science', name: 'BBC News', home: 'https://www.bbc.com/news/science_and_environment', category: 'science', continent: 'europe', country: 'United Kingdom', url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml' },

  { id: 'de-dw', name: 'Deutsche Welle', home: 'https://www.dw.com', category: 'world', continent: 'europe', country: 'Germany', url: 'https://rss.dw.com/rdf/rss-en-eu' },
  { id: 'de-spiegel', name: 'Der Spiegel', home: 'https://www.spiegel.de/international', category: 'world', continent: 'europe', country: 'Germany', url: 'https://www.spiegel.de/international/index.rss' },

  { id: 'fr-france24', name: 'France 24', home: 'https://www.france24.com', category: 'world', continent: 'europe', country: 'France', url: 'https://www.france24.com/en/europe/rss' },

  { id: 'it-ansa', name: 'ANSA', home: 'https://www.ansa.it/english', category: 'world', continent: 'europe', country: 'Italy', url: 'https://www.ansa.it/english/english_rss.xml' },

  { id: 'ru-rt', name: 'RT', home: 'https://www.rt.com', category: 'world', continent: 'europe', country: 'Russia', url: 'https://www.rt.com/rss/news/' },
  { id: 'ru-moscowtimes', name: 'The Moscow Times', home: 'https://www.themoscowtimes.com', category: 'world', continent: 'europe', country: 'Russia', url: 'https://www.themoscowtimes.com/rss/news' },

  // ===================================================== AFRICA
  { id: 'af-allafrica', name: 'AllAfrica', home: 'https://allafrica.com', category: 'world', continent: 'africa', country: 'Africa', covers: ['Nigeria', 'Kenya', 'South Africa', 'Ghana', 'Egypt', 'Ethiopia'], url: 'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf' },
  { id: 'af-iol', name: 'IOL', home: 'https://iol.co.za', category: 'world', continent: 'africa', country: 'South Africa', url: 'https://iol.co.za/rss/' },
  { id: 'ng-punch', name: 'Punch', home: 'https://punchng.com', category: 'world', continent: 'africa', country: 'Nigeria', url: 'https://punchng.com/feed/' },
  { id: 'gh-joyonline', name: 'MyJoyOnline', home: 'https://www.myjoyonline.com', category: 'world', continent: 'africa', country: 'Ghana', url: 'https://www.myjoyonline.com/feed/' },
  { id: 'ke-capitalfm', name: 'Capital FM Kenya', home: 'https://www.capitalfm.co.ke', category: 'world', continent: 'africa', country: 'Kenya', url: 'https://www.capitalfm.co.ke/news/feed/' },
  { id: 'ke-kbc', name: 'KBC', home: 'https://www.kbc.co.ke', category: 'world', continent: 'africa', country: 'Kenya', url: 'https://www.kbc.co.ke/feed/' },
  { id: 'eg-egyptind', name: 'Egypt Independent', home: 'https://egyptindependent.com', category: 'world', continent: 'africa', country: 'Egypt', url: 'https://egyptindependent.com/feed/' },

  // ===================================================== NORTH AMERICA
  { id: 'us-npr', name: 'NPR', home: 'https://www.npr.org', category: 'world', continent: 'north-america', country: 'United States', url: 'https://feeds.npr.org/1001/rss.xml' },
  { id: 'us-npr-politics', name: 'NPR', home: 'https://www.npr.org/sections/politics/', category: 'politics', continent: 'north-america', country: 'United States', url: 'https://feeds.npr.org/1014/rss.xml' },
  { id: 'us-npr-health', name: 'NPR', home: 'https://www.npr.org/sections/health/', category: 'health', continent: 'north-america', country: 'United States', url: 'https://feeds.npr.org/1128/rss.xml' },
  { id: 'us-npr-education', name: 'NPR', home: 'https://www.npr.org/sections/education/', category: 'education', continent: 'north-america', country: 'United States', url: 'https://feeds.npr.org/1013/rss.xml' },
  { id: 'us-npr-business', name: 'NPR', home: 'https://www.npr.org/sections/business/', category: 'business', continent: 'north-america', country: 'United States', url: 'https://feeds.npr.org/1006/rss.xml' },
  { id: 'us-npr-science', name: 'NPR', home: 'https://www.npr.org/sections/science/', category: 'science', continent: 'north-america', country: 'United States', url: 'https://feeds.npr.org/1007/rss.xml' },
  { id: 'us-npr-tech', name: 'NPR', home: 'https://www.npr.org/sections/technology/', category: 'technology', continent: 'north-america', country: 'United States', url: 'https://feeds.npr.org/1019/rss.xml' },
  { id: 'us-nyt-americas', name: 'The New York Times', home: 'https://www.nytimes.com/section/world/americas', category: 'world', continent: 'north-america', country: 'United States', covers: ['United States', 'Canada', 'Mexico'], url: 'https://rss.nytimes.com/services/xml/rss/nyt/Americas.xml' },
  { id: 'us-variety', name: 'Variety', home: 'https://variety.com', category: 'entertainment', continent: 'north-america', country: 'United States', url: 'https://variety.com/feed/' },
  { id: 'us-spacecom', name: 'Space.com', home: 'https://www.space.com', category: 'space', continent: 'north-america', country: 'United States', url: 'https://www.space.com/feeds/all' },
  { id: 'us-nasa', name: 'NASA', home: 'https://www.nasa.gov', category: 'space', continent: 'north-america', country: 'United States', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss' },
  { id: 'ca-globalnews', name: 'Global News', home: 'https://globalnews.ca', category: 'world', continent: 'north-america', country: 'Canada', url: 'https://globalnews.ca/feed/' },
  { id: 'mx-mexnews', name: 'Mexico News Daily', home: 'https://mexiconewsdaily.com', category: 'world', continent: 'north-america', country: 'Mexico', url: 'https://mexiconewsdaily.com/feed/' },

  // ===================================================== SOUTH AMERICA
  { id: 'br-riotimes', name: 'Rio Times', home: 'https://www.riotimesonline.com', category: 'world', continent: 'south-america', country: 'Brazil', url: 'https://www.riotimesonline.com/feed/' },
  { id: 'ar-batimes', name: 'Buenos Aires Times', home: 'https://www.batimes.com.ar', category: 'world', continent: 'south-america', country: 'Argentina', url: 'https://www.batimes.com.ar/feed' },
  { id: 'ar-clarin', name: 'Clarín', home: 'https://www.clarin.com', category: 'world', continent: 'south-america', country: 'Argentina', url: 'https://www.clarin.com/rss/mundo/' },
  { id: 'co-colombiareports', name: 'Colombia Reports', home: 'https://colombiareports.com', category: 'world', continent: 'south-america', country: 'Colombia', url: 'https://colombiareports.com/feed/' },
  { id: 'cl-cooperativa', name: 'Cooperativa', home: 'https://www.cooperativa.cl', category: 'world', continent: 'south-america', country: 'Chile', url: 'https://www.cooperativa.cl/noticias/site/tax/port/all/rss____1.xml' },
  { id: 'pe-rpp', name: 'RPP', home: 'https://rpp.pe', category: 'world', continent: 'south-america', country: 'Peru', url: 'https://rpp.pe/feed' },

  // ===================================================== OCEANIA
  { id: 'au-abc', name: 'ABC News', home: 'https://www.abc.net.au/news', category: 'world', continent: 'oceania', country: 'Australia', url: 'https://www.abc.net.au/news/feed/51120/rss.xml' },
  { id: 'au-smh', name: 'The Sydney Morning Herald', home: 'https://www.smh.com.au', category: 'world', continent: 'oceania', country: 'Australia', url: 'https://www.smh.com.au/rss/feed.xml' },
  { id: 'au-guardian-au', name: 'The Guardian Australia', home: 'https://www.theguardian.com/au', category: 'world', continent: 'oceania', country: 'Australia', url: 'https://www.theguardian.com/au/rss' },
  { id: 'nz-stuff', name: 'Stuff', home: 'https://www.stuff.co.nz', category: 'world', continent: 'oceania', country: 'New Zealand', url: 'https://www.stuff.co.nz/rss' },
  { id: 'nz-rnz', name: 'RNZ', home: 'https://www.rnz.co.nz', category: 'world', continent: 'oceania', country: 'New Zealand', url: 'https://www.rnz.co.nz/rss/national.xml' },

  // ===================================================== ANTARCTICA
  // Research and logistics reporting from the national programmes that work there.
  { id: 'aq-antarctic-div', name: 'Australian Antarctic Division', home: 'https://www.antarctica.gov.au', category: 'science', continent: 'antarctica', country: 'Antarctica', url: 'https://www.antarctica.gov.au/news/rss/' },
  { id: 'aq-bas', name: 'British Antarctic Survey', home: 'https://www.bas.ac.uk', category: 'science', continent: 'antarctica', country: 'Antarctica', url: 'https://www.bas.ac.uk/news/feed/' },
  { id: 'aq-ale', name: 'Antarctic Logistics & Expeditions', home: 'https://antarctic-logistics.com', category: 'science', continent: 'antarctica', country: 'Antarctica', url: 'https://antarctic-logistics.com/feed/' },

  // ===================================================== GLOBAL TOPICS
  { id: 'global-bbc-top', name: 'BBC News', home: 'https://www.bbc.com/news', category: 'breaking', continent: 'europe', country: 'United Kingdom', covers: ['United Kingdom', 'World'], url: 'https://feeds.bbci.co.uk/news/rss.xml' },
  { id: 'global-guardian-world', name: 'The Guardian', home: 'https://www.theguardian.com/world', category: 'breaking', continent: 'europe', country: 'United Kingdom', covers: ['United Kingdom', 'World'], url: 'https://www.theguardian.com/world/rss' },
  { id: 'global-aljazeera', name: 'Al Jazeera', home: 'https://www.aljazeera.com', category: 'breaking', continent: 'asia', country: 'Qatar', covers: ['Qatar', 'World'], url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { id: 'global-ars', name: 'Ars Technica', home: 'https://arstechnica.com', category: 'technology', continent: 'north-america', country: 'United States', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { id: 'global-techcrunch', name: 'TechCrunch', home: 'https://techcrunch.com', category: 'technology', continent: 'north-america', country: 'United States', url: 'https://techcrunch.com/feed/' },
  { id: 'global-guardian-tech', name: 'The Guardian', home: 'https://www.theguardian.com/uk/technology', category: 'technology', continent: 'europe', country: 'United Kingdom', url: 'https://www.theguardian.com/uk/technology/rss' },
  { id: 'global-mit-tr', name: 'MIT Technology Review', home: 'https://www.technologyreview.com', category: 'ai', continent: 'north-america', country: 'United States', url: 'https://www.technologyreview.com/feed/' },
  { id: 'global-marktechpost', name: 'MarkTechPost', home: 'https://www.marktechpost.com', category: 'ai', continent: 'north-america', country: 'United States', url: 'https://www.marktechpost.com/feed/' },
  { id: 'global-nature', name: 'Nature', home: 'https://www.nature.com', category: 'science', continent: 'europe', country: 'United Kingdom', url: 'https://www.nature.com/nature.rss' },
  { id: 'global-sciencedaily', name: 'ScienceDaily', home: 'https://www.sciencedaily.com', category: 'science', continent: 'north-america', country: 'United States', url: 'https://www.sciencedaily.com/rss/top/science.xml' },
  { id: 'global-guardian-science', name: 'The Guardian', home: 'https://www.theguardian.com/science', category: 'science', continent: 'europe', country: 'United Kingdom', url: 'https://www.theguardian.com/science/rss' },
  { id: 'global-guardian-education', name: 'The Guardian', home: 'https://www.theguardian.com/education', category: 'education', continent: 'europe', country: 'United Kingdom', url: 'https://www.theguardian.com/education/rss' },
  { id: 'global-insidehighered', name: 'Inside Higher Ed', home: 'https://www.insidehighered.com', category: 'education', continent: 'north-america', country: 'United States', url: 'https://www.insidehighered.com/rss.xml' },
  { id: 'global-guardian-business', name: 'The Guardian', home: 'https://www.theguardian.com/uk/business', category: 'business', continent: 'europe', country: 'United Kingdom', url: 'https://www.theguardian.com/uk/business/rss' },
  { id: 'global-who', name: 'World Health Organization', home: 'https://www.who.int', category: 'health', continent: 'europe', country: 'Switzerland', covers: ['World'], url: 'https://www.who.int/rss-feeds/news-english.xml' },
  { id: 'global-cricinfo', name: 'ESPNcricinfo', home: 'https://www.espncricinfo.com', category: 'sports', continent: 'oceania', country: 'Australia', covers: ['Australia', 'Bangladesh', 'India', 'Pakistan', 'United Kingdom', 'World'], url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml' },

  // ===================================================== COUNTRY DESKS
  // One publisher per country, so every nation with a reachable feed has a
  // desk of its own. Each URL was fetched and parsed when it was added; a
  // feed that later stops answering is reported and skipped like any other.
  // Countries still absent are ones whose outlets publish no public feed
  // we can read, and the UI says so rather than inventing coverage.

  // ---- More of Asia ----------------------------------------
  { id: 'kr-yonhap', name: 'Yonhap', home: 'https://en.yna.co.kr', category: 'world', continent: 'asia', country: 'South Korea', url: 'https://en.yna.co.kr/RSS/news.xml' },
  { id: 'kr-koreaherald', name: 'The Korea Herald', home: 'https://www.koreaherald.com', category: 'world', continent: 'asia', country: 'South Korea', url: 'https://www.koreaherald.com/rss/newsAll' },
  { id: 'id-antara', name: 'ANTARA', home: 'https://en.antaranews.com', category: 'world', continent: 'asia', country: 'Indonesia', url: 'https://en.antaranews.com/rss/news.xml' },
  { id: 'th-bangkokpost', name: 'Bangkok Post', home: 'https://www.bangkokpost.com', category: 'world', continent: 'asia', country: 'Thailand', url: 'https://www.bangkokpost.com/rss/data/topstories.xml' },
  { id: 'vn-vnexpress', name: 'VnExpress International', home: 'https://e.vnexpress.net', category: 'world', continent: 'asia', country: 'Vietnam', url: 'https://e.vnexpress.net/rss/news.rss' },
  { id: 'ph-inquirer', name: 'Philippine Daily Inquirer', home: 'https://www.inquirer.net', category: 'world', continent: 'asia', country: 'Philippines', url: 'https://www.inquirer.net/fullfeed' },
  { id: 'ph-rappler', name: 'Rappler', home: 'https://www.rappler.com', category: 'world', continent: 'asia', country: 'Philippines', url: 'https://www.rappler.com/feed/' },
  { id: 'my-freemalaysiatoday', name: 'Free Malaysia Today', home: 'https://www.freemalaysiatoday.com', category: 'world', continent: 'asia', country: 'Malaysia', url: 'https://www.freemalaysiatoday.com/feed/' },
  { id: 'sg-straitstimes', name: 'The Straits Times', home: 'https://www.straitstimes.com', category: 'world', continent: 'asia', country: 'Singapore', url: 'https://www.straitstimes.com/news/world/rss.xml' },
  { id: 'sg-cnainsider', name: 'CNA', home: 'https://www.channelnewsasia.com', category: 'world', continent: 'asia', country: 'Singapore', url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml' },
  { id: 'np-kathmandupost', name: 'The Kathmandu Post', home: 'https://kathmandupost.com', category: 'world', continent: 'asia', country: 'Nepal', url: 'https://kathmandupost.com/rss' },
  { id: 'mm-irrawaddy', name: 'The Irrawaddy', home: 'https://www.irrawaddy.com', category: 'world', continent: 'asia', country: 'Myanmar', url: 'https://www.irrawaddy.com/feed' },
  { id: 'mm-mmtimes', name: 'Myanmar Now', home: 'https://myanmar-now.org', category: 'world', continent: 'asia', country: 'Myanmar', url: 'https://myanmar-now.org/en/feed/' },
  { id: 'kz-astanatimes', name: 'The Astana Times', home: 'https://astanatimes.com', category: 'world', continent: 'asia', country: 'Kazakhstan', url: 'https://astanatimes.com/feed/' },
  { id: 'uz-uza', name: 'UzA', home: 'https://uza.uz', category: 'world', continent: 'asia', country: 'Uzbekistan', url: 'https://uza.uz/en/rss' },
  { id: 'il-jpost', name: 'The Jerusalem Post', home: 'https://www.jpost.com', category: 'world', continent: 'asia', country: 'Israel', url: 'https://www.jpost.com/rss/rssfeedsfrontpage.aspx' },
  { id: 'jo-roya', name: 'Roya News', home: 'https://en.royanews.tv', category: 'world', continent: 'asia', country: 'Jordan', url: 'https://en.royanews.tv/rss' },
  { id: 'sa-arabnews', name: 'Arab News', home: 'https://www.arabnews.com', category: 'world', continent: 'asia', country: 'Saudi Arabia', url: 'https://www.arabnews.com/rss.xml' },
  { id: 'tw-taipeitimes', name: 'Taipei Times', home: 'https://www.taipeitimes.com', category: 'world', continent: 'asia', country: 'Taiwan', url: 'https://www.taipeitimes.com/xml/index.rss' },
  { id: 'ge-civil', name: 'Civil.ge', home: 'https://civil.ge', category: 'world', continent: 'asia', country: 'Georgia', url: 'https://civil.ge/feed/' },
  { id: 'bt-thebhutanese', name: 'The Bhutanese', home: 'https://thebhutanese.bt', category: 'world', continent: 'asia', country: 'Bhutan', url: 'https://thebhutanese.bt/feed/' },
  { id: 'mn-montsame2', name: 'Montsame', home: 'https://montsame.mn', category: 'world', continent: 'asia', country: 'Mongolia', url: 'https://montsame.mn/en/rss.xml' },

  // ---- More of Europe --------------------------------------
  { id: 'es-elpais', name: 'El País', home: 'https://english.elpais.com', category: 'world', continent: 'europe', country: 'Spain', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/english.elpais.com/portada' },
  { id: 'nl-dutchnews', name: 'DutchNews', home: 'https://www.dutchnews.nl', category: 'world', continent: 'europe', country: 'Netherlands', url: 'https://www.dutchnews.nl/feed/' },
  { id: 'se-thelocal', name: 'The Local Sweden', home: 'https://www.thelocal.se', category: 'world', continent: 'europe', country: 'Sweden', url: 'https://www.thelocal.se/feeds/rss.php' },
  { id: 'at-thelocal', name: 'The Local Austria', home: 'https://www.thelocal.at', category: 'world', continent: 'europe', country: 'Austria', url: 'https://www.thelocal.at/feeds/rss.php' },
  { id: 'dk-cphpost', name: 'The Copenhagen Post', home: 'https://cphpost.dk', category: 'world', continent: 'europe', country: 'Denmark', url: 'https://cphpost.dk/feed/' },
  { id: 'ee-err', name: 'ERR News', home: 'https://news.err.ee', category: 'world', continent: 'europe', country: 'Estonia', url: 'https://news.err.ee/rss' },
  { id: 'lv-lsm', name: 'LSM', home: 'https://eng.lsm.lv', category: 'world', continent: 'europe', country: 'Latvia', url: 'https://eng.lsm.lv/rss/' },
  { id: 'ie-irishtimes', name: 'The Irish Times', home: 'https://www.irishtimes.com', category: 'world', continent: 'europe', country: 'Ireland', url: 'https://www.irishtimes.com/arc/outboundfeeds/rss/' },
  { id: 'ie-rte', name: 'RTÉ', home: 'https://www.rte.ie', category: 'world', continent: 'europe', country: 'Ireland', url: 'https://www.rte.ie/feeds/rss/?index=/news/' },
  { id: 'pt-portugalnews', name: 'Portugal News', home: 'https://www.theportugalnews.com', category: 'world', continent: 'europe', country: 'Portugal', url: 'https://www.theportugalnews.com/rss' },
  { id: 'ro-romania-insider', name: 'Romania Insider', home: 'https://www.romania-insider.com', category: 'world', continent: 'europe', country: 'Romania', url: 'https://www.romania-insider.com/feed' },
  { id: 'bg-sofia', name: 'The Sofia Globe', home: 'https://sofiaglobe.com', category: 'world', continent: 'europe', country: 'Bulgaria', url: 'https://sofiaglobe.com/feed/' },
  { id: 'hr-croatiaweek', name: 'Croatia Week', home: 'https://www.croatiaweek.com', category: 'world', continent: 'europe', country: 'Croatia', url: 'https://www.croatiaweek.com/feed/' },
  { id: 'ua-kyivpost', name: 'Kyiv Post', home: 'https://www.kyivpost.com', category: 'world', continent: 'europe', country: 'Ukraine', url: 'https://www.kyivpost.com/feed' },
  { id: 'cy-cyprusmail', name: 'Cyprus Mail', home: 'https://cyprus-mail.com', category: 'world', continent: 'europe', country: 'Cyprus', url: 'https://cyprus-mail.com/feed/' },
  { id: 'lu-luxtimes', name: 'Luxembourg Times', home: 'https://www.luxtimes.lu', category: 'world', continent: 'europe', country: 'Luxembourg', url: 'https://www.luxtimes.lu/rss' },
  { id: 'mt-timesofmalta', name: 'Times of Malta', home: 'https://timesofmalta.com', category: 'world', continent: 'europe', country: 'Malta', url: 'https://timesofmalta.com/rss' },
  { id: 'hu-hungarytoday', name: 'Hungary Today', home: 'https://hungarytoday.hu', category: 'world', continent: 'europe', country: 'Hungary', url: 'https://hungarytoday.hu/feed/' },
  { id: 'al-tiranatimes', name: 'Tirana Times', home: 'https://www.tiranatimes.com', category: 'world', continent: 'europe', country: 'Albania', url: 'https://www.tiranatimes.com/feed/' },
  { id: 'fi-yle2', name: 'Yle News', home: 'https://yle.fi', category: 'world', continent: 'europe', country: 'Finland', url: 'https://feeds.yle.fi/uutiset/v1/recent.rss?publisherIds=YLE_NEWS' },
  { id: 'is-iceland2', name: 'Iceland Review', home: 'https://www.icelandreview.com', category: 'world', continent: 'europe', country: 'Iceland', url: 'https://www.icelandreview.com/feed/' },
  { id: 'pl-poland2', name: 'Notes from Poland', home: 'https://notesfrompoland.com', category: 'world', continent: 'europe', country: 'Poland', url: 'https://notesfrompoland.com/feed/' },
  { id: 'rs-b92b', name: 'N1 Serbia', home: 'https://n1info.rs', category: 'world', continent: 'europe', country: 'Serbia', url: 'https://n1info.rs/feed/' },
  { id: 'cz-prague2', name: 'Prague Morning', home: 'https://praguemorning.cz', category: 'world', continent: 'europe', country: 'Czechia', url: 'https://praguemorning.cz/feed/' },
  { id: 'md-moldova2', name: 'Moldova.org', home: 'https://www.moldova.org', category: 'world', continent: 'europe', country: 'Moldova', url: 'https://www.moldova.org/feed/' },

  // ---- More of Africa --------------------------------------
  { id: 'ma-northafricapost', name: 'The North Africa Post', home: 'https://northafricapost.com', category: 'world', continent: 'africa', country: 'Morocco', url: 'https://northafricapost.com/feed/' },
  { id: 'tn-businessnews', name: 'African Manager', home: 'https://africanmanager.com', category: 'world', continent: 'africa', country: 'Tunisia', url: 'https://africanmanager.com/feed/' },
  { id: 'et-ethiopianmonitor', name: 'The Ethiopian Monitor', home: 'https://ethiopianmonitor.com', category: 'world', continent: 'africa', country: 'Ethiopia', url: 'https://ethiopianmonitor.com/feed/' },
  { id: 'zm-lusakatimes', name: 'Lusaka Times', home: 'https://www.lusakatimes.com', category: 'world', continent: 'africa', country: 'Zambia', url: 'https://www.lusakatimes.com/feed/' },
  { id: 'zw-newsday', name: 'NewsDay Zimbabwe', home: 'https://www.newsday.co.zw', category: 'world', continent: 'africa', country: 'Zimbabwe', url: 'https://www.newsday.co.zw/feed/' },
  { id: 'mw-nation', name: 'The Nation Malawi', home: 'https://mwnation.com', category: 'world', continent: 'africa', country: 'Malawi', url: 'https://mwnation.com/feed/' },
  { id: 'mu-defimedia', name: 'Defi Media', home: 'https://defimedia.info', category: 'world', continent: 'africa', country: 'Mauritius', url: 'https://defimedia.info/rss.xml' },
  { id: 'mg-midi', name: 'Midi Madagasikara', home: 'https://midi-madagasikara.mg', category: 'world', continent: 'africa', country: 'Madagascar', url: 'https://midi-madagasikara.mg/feed/' },
  { id: 'cd-actualite', name: 'Actualite.cd', home: 'https://actualite.cd', category: 'world', continent: 'africa', country: 'DR Congo', url: 'https://actualite.cd/feed' },
  { id: 'cm-actucameroun', name: 'Actu Cameroun', home: 'https://actucameroun.com', category: 'world', continent: 'africa', country: 'Cameroon', url: 'https://actucameroun.com/feed/' },
  { id: 'sn-senegal7', name: 'Senegal7', home: 'https://senegal7.com', category: 'world', continent: 'africa', country: 'Senegal', url: 'https://senegal7.com/feed/' },
  { id: 'ml-afribone', name: 'Afribone', home: 'https://www.afribone.com', category: 'world', continent: 'africa', country: 'Mali', url: 'https://www.afribone.com/feed/' },
  { id: 'ne-lesahel', name: 'Le Sahel', home: 'https://www.lesahel.org', category: 'world', continent: 'africa', country: 'Niger', url: 'https://www.lesahel.org/feed/' },
  { id: 'td-tchadinfos', name: 'Tchad Infos', home: 'https://tchadinfos.com', category: 'world', continent: 'africa', country: 'Chad', url: 'https://tchadinfos.com/feed/' },
  { id: 'bf-lefaso', name: 'Lefaso.net', home: 'https://lefaso.net', category: 'world', continent: 'africa', country: 'Burkina Faso', url: 'https://lefaso.net/spip.php?page=backend' },
  { id: 'bj-beninweb', name: 'Benin Web TV', home: 'https://beninwebtv.com', category: 'world', continent: 'africa', country: 'Benin', url: 'https://beninwebtv.com/feed/' },
  { id: 'gn-africaguinee', name: 'Africa Guinee', home: 'https://www.africaguinee.com', category: 'world', continent: 'africa', country: 'Guinea', url: 'https://www.africaguinee.com/feed/' },
  { id: 'lr-frontpageafrica', name: 'FrontPage Africa', home: 'https://frontpageafricaonline.com', category: 'world', continent: 'africa', country: 'Liberia', url: 'https://frontpageafricaonline.com/feed/' },
  { id: 'sr-dewarenog', name: 'De Ware Tijd', home: 'https://dwtonline.com', category: 'world', continent: 'south-america', country: 'Suriname', url: 'https://dwtonline.com/feed/' },
  { id: 'na-namibian2', name: 'The Namibian', home: 'https://www.namibian.com.na', category: 'world', continent: 'africa', country: 'Namibia', url: 'https://www.namibian.com.na/feed/' },

  // ---- More of North America -------------------------------
  { id: 'us-cbs', name: 'CBS News', home: 'https://www.cbsnews.com', category: 'world', continent: 'north-america', country: 'United States', url: 'https://www.cbsnews.com/latest/rss/main' },
  { id: 'us-latimes', name: 'Los Angeles Times', home: 'https://www.latimes.com', category: 'world', continent: 'north-america', country: 'United States', url: 'https://www.latimes.com/local/rss2.0.xml' },
  { id: 'gt-prensalibre', name: 'Prensa Libre', home: 'https://www.prensalibre.com', category: 'world', continent: 'north-america', country: 'Guatemala', url: 'https://www.prensalibre.com/feed/' },
  { id: 'cr-ticotimes', name: 'The Tico Times', home: 'https://ticotimes.net', category: 'world', continent: 'north-america', country: 'Costa Rica', url: 'https://ticotimes.net/feed' },
  { id: 'cu-14ymedio', name: '14ymedio', home: 'https://www.14ymedio.com', category: 'world', continent: 'north-america', country: 'Cuba', url: 'https://www.14ymedio.com/rss' },
  { id: 'jm-jamaicaobserver', name: 'Jamaica Observer', home: 'https://www.jamaicaobserver.com', category: 'world', continent: 'north-america', country: 'Jamaica', url: 'https://www.jamaicaobserver.com/feed/' },
  { id: 'ht-haitiantimes', name: 'The Haitian Times', home: 'https://haitiantimes.com', category: 'world', continent: 'north-america', country: 'Haiti', url: 'https://haitiantimes.com/feed/' },
  { id: 'hn-proceso', name: 'Proceso Digital', home: 'https://proceso.hn', category: 'world', continent: 'north-america', country: 'Honduras', url: 'https://proceso.hn/feed/' },
  { id: 'ni-confidencial', name: 'Confidencial', home: 'https://confidencial.digital', category: 'world', continent: 'north-america', country: 'Nicaragua', url: 'https://confidencial.digital/feed/' },
  { id: 'do-elnacional', name: 'El Nacional', home: 'https://elnacional.com.do', category: 'world', continent: 'north-america', country: 'Dominican Republic', url: 'https://elnacional.com.do/feed/' },

  // ---- More of South America -------------------------------
  { id: 've-elnacional', name: 'El Nacional', home: 'https://www.elnacional.com', category: 'world', continent: 'south-america', country: 'Venezuela', url: 'https://www.elnacional.com/feed/' },
  { id: 'ec-ecuadortimes', name: 'Ecuador Times', home: 'https://www.ecuadortimes.net', category: 'world', continent: 'south-america', country: 'Ecuador', url: 'https://www.ecuadortimes.net/feed/' },
  { id: 'uy-elpais', name: 'El País Uruguay', home: 'https://www.elpais.com.uy', category: 'world', continent: 'south-america', country: 'Uruguay', url: 'https://www.elpais.com.uy/rss' },
  { id: 'gy-kaieteur', name: 'Kaieteur News', home: 'https://www.kaieteurnewsonline.com', category: 'world', continent: 'south-america', country: 'Guyana', url: 'https://www.kaieteurnewsonline.com/feed/' },
  { id: 'bo-eldeber2', name: 'El Deber', home: 'https://eldeber.com.bo', category: 'world', continent: 'south-america', country: 'Bolivia', url: 'https://eldeber.com.bo/feed/' },

  // ---- More of Oceania -------------------------------------
  { id: 'fj-fbc', name: 'FBC News', home: 'https://www.fbcnews.com.fj', category: 'world', continent: 'oceania', country: 'Fiji', url: 'https://www.fbcnews.com.fj/feed/' },
  { id: 'pg-postcourier', name: 'Post-Courier', home: 'https://www.postcourier.com.pg', category: 'world', continent: 'oceania', country: 'Papua New Guinea', url: 'https://www.postcourier.com.pg/feed/' },
  { id: 'to-matangitonga', name: 'Matangi Tonga', home: 'https://matangitonga.to', category: 'world', continent: 'oceania', country: 'Tonga', url: 'https://matangitonga.to/rss.xml' },
  { id: 'nc-rnz', name: 'RNZ Pacific', home: 'https://www.rnz.co.nz', category: 'world', continent: 'oceania', country: 'New Zealand', url: 'https://www.rnz.co.nz/rss/pacific.xml' },
];

// ---------------------------------------------------------------- utilities

function decodeEntities(input) {
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    mdash: '—', ndash: '–', hellip: '…', rsquo: '\u2019', lsquo: '\u2018',
    ldquo: '\u201C', rdquo: '\u201D', middot: '·', bull: '•', times: '×',
    copy: '©', reg: '®', deg: '°', eacute: 'é', pound: '£', euro: '€',
  };
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match);
}

function safeCodePoint(code) {
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/**
 * Removes markup and collapses whitespace, leaving plain readable text.
 *
 * Publishers encode markup inconsistently: some send real tags, others send
 * entity-escaped tags (`&lt;p&gt;`). Decoding after stripping would leave those
 * escaped tags visible as literal text, so the sequence is strip, decode,
 * strip again, decode again.
 */
function toPlainText(html) {
  const strip = (value) =>
    value
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/p>/gi, ' ')
      .replace(/<[^>]+>/g, '');

  const text = decodeEntities(strip(decodeEntities(strip(String(html ?? '')))));
  return text.replace(/\s+/g, ' ').trim();
}

/** Reads the text of the first matching tag, CDATA included. */
function tagText(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!match) return '';
  const raw = match[1].trim();
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return cdata ? cdata[1].trim() : raw;
}

function attrValue(xml, tag, attr) {
  const match = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, 'i'));
  return match ? match[1] : '';
}

function splitEntries(xml) {
  const items = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  if (items.length) return items;
  return [...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)].map((m) => m[1]);
}

/**
 * Some publishers put their masthead in the feed instead of a photo. Those are
 * wide, transparent wordmarks, and cropping one into a 16:9 card frame cuts
 * the middle out of the name ("PUNCH" renders as "UNCI"). Reject them by URL
 * and let the card fall back to its text-only shape.
 */
const LOGO_URL = /(?:^|[/_-])(?:logo|wordmark|masthead|favicon|site-?icon|brandmark|placeholder|default-image)(?:[/_.-]|$)/i;

function isLogoUrl(url) {
  try {
    const { pathname } = new URL(url);
    return LOGO_URL.test(pathname);
  } catch {
    return false;
  }
}

function extractImage(entry, description) {
  const media = attrValue(entry, 'media:content', 'url') || attrValue(entry, 'media:thumbnail', 'url');
  if (media) return isLogoUrl(media) ? '' : media;
  const enclosure = entry.match(/<enclosure[^>]*\stype=["']image\/[^"']+["'][^>]*>/i);
  if (enclosure) {
    const url = enclosure[0].match(/\surl=["']([^"']+)["']/i);
    if (url) return isLogoUrl(url[1]) ? '' : url[1];
  }
  const img = String(description ?? '').match(/<img[^>]*\ssrc=["']([^"']+)["']/i);
  if (!img) return '';
  return isLogoUrl(img[1]) ? '' : img[1];
}

function parseDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

/** Stable id so the same article keeps its identity across rebuilds. */
function makeId(sourceId, link, title) {
  const basis = link || title;
  let hash = 0;
  for (let i = 0; i < basis.length; i += 1) {
    hash = (hash * 31 + basis.charCodeAt(i)) | 0;
  }
  return `${sourceId}-${(hash >>> 0).toString(36)}`;
}

function parseFeed(xml, source) {
  const entries = splitEntries(xml);
  const out = [];
  for (const entry of entries.slice(0, MAX_ITEMS_PER_FEED)) {
    const title = toPlainText(tagText(entry, 'title'));
    if (!title) continue;

    const link =
      tagText(entry, 'link') ||
      attrValue(entry, 'link', 'href') ||
      tagText(entry, 'guid');

    const rawDescription =
      tagText(entry, 'description') ||
      tagText(entry, 'summary') ||
      tagText(entry, 'content') ||
      tagText(entry, 'content:encoded');

    const summary = toPlainText(rawDescription).slice(0, 420);

    const published =
      tagText(entry, 'pubDate') ||
      tagText(entry, 'published') ||
      tagText(entry, 'updated') ||
      tagText(entry, 'dc:date');

    out.push({
      id: makeId(source.id, link, title),
      title,
      link: link.trim(),
      summary,
      image: extractImage(entry, rawDescription),
      publishedAt: parseDate(published),
      category: source.category,
      source: source.name,
      sourceId: source.id,
      sourceHome: source.home,
      continent: source.continent,
      country: source.country,
      ...(source.desk ? { desk: source.desk } : {}),
      ...(source.covers ? { covers: source.covers } : {}),
    });
  }
  return out;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': USER_AGENT, accept: 'application/rss+xml, application/xml, text/xml, */*' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

// -------------------------------------------------------------------- main

async function loadPrevious() {
  if (!existsSync(OUT)) return null;
  try {
    return JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const previous = await loadPrevious();
  const items = [];
  const sources = [];
  const failures = [];

  const results = await Promise.allSettled(
    FEEDS.map(async (source) => {
      const xml = await fetchWithTimeout(source.url);
      const parsed = parseFeed(xml, source);
      if (!parsed.length) throw new Error('no entries found');
      return { source, parsed };
    })
  );

  results.forEach((result, index) => {
    const source = FEEDS[index];
    if (result.status === 'fulfilled') {
      sources.push({
        id: source.id,
        name: source.name,
        home: source.home,
        category: source.category,
        count: result.value.parsed.length,
        continent: source.continent,
        country: source.country,
        ...(source.desk ? { desk: source.desk } : {}),
        ...(source.covers ? { covers: source.covers } : {}),
      });
      items.push(...result.value.parsed);
    } else {
      failures.push({ id: source.id, reason: String(result.reason?.message ?? result.reason) });
    }
  });

  // De-duplicate by id, keeping the first occurrence.
  const seen = new Set();
  const unique = items.filter((item) => {
    if (!item.link || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  // The same article often arrives from two feeds of one publisher (a section
  // feed and a homepage feed), which produces different ids for one URL. The
  // URL, minus its query string and fragment, is what actually identifies it.
  const byLink = new Map();
  for (const item of unique) {
    const key = item.link.split('#')[0].split('?')[0].replace(/\/$/, '').toLowerCase();
    if (!byLink.has(key)) byLink.set(key, item);
  }
  const deduped = [...byLink.values()];

  deduped.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));

  // Some publishers keep years-old items in their feed (archives, evergreen
  // pages), and a few stamp entries in the future. A news snapshot that mixes
  // a story from today with one from 2020 is misleading, so anything older than
  // the window is dropped, and a future stamp is clamped to now: the article is
  // published, so we do not claim it was published later. Undated items are
  // kept — they are still current news, and the UI shows them without a time.
  const now = Date.now();
  const FUTURE_SLACK_MS = 60 * 60 * 1000;
  const fresh = [];
  for (const item of deduped) {
    if (!item.publishedAt) {
      fresh.push(item);
      continue;
    }
    const time = Date.parse(item.publishedAt);
    if (Number.isNaN(time)) {
      fresh.push(item);
      continue;
    }
    if (time < now - MAX_AGE_MS || time > now + FUTURE_SLACK_MS) continue;
    fresh.push(time > now ? { ...item, publishedAt: new Date(now).toISOString() } : item);
  }
  const staleCount = deduped.length - fresh.length;

  const snapshot = {
    generatedAt: new Date().toISOString(),
    itemCount: fresh.length,
    sourceCount: sources.length,
    sources,
    failures,
    items: fresh,
  };

  if (!fresh.length) {
    if (previous?.items?.length) {
      console.warn('feeds: every source failed; keeping the previous snapshot untouched.');
      return;
    }
    console.error('feeds: no items fetched and no previous snapshot exists.');
    process.exitCode = 1;
    return;
  }

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(snapshot));

  console.log(
    `feeds: wrote ${fresh.length} items from ${sources.length}/${FEEDS.length} sources` +
      (staleCount ? ` (dropped ${staleCount} outside the ${MAX_AGE_DAYS}-day window).` : '.')
  );
  if (failures.length) {
    console.warn(`feeds: ${failures.length} source(s) unavailable: ${failures.map((f) => f.id).join(', ')}`);
  }
}

main().catch((error) => {
  console.error('feeds: unexpected failure —', error);
  process.exitCode = 1;
});
