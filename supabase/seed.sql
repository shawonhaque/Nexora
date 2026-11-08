-- ============================================================================
-- NEXORA — starter content
--
-- Real rows in the database, not client-side placeholders. Everything here is
-- published content that the public site reads through the API and that the
-- admin dashboard can edit or delete.
--
-- Run with:  supabase db reset      (applies migrations, then this file)
-- Or paste into the Supabase SQL editor on a hosted project.
--
-- This runs as the database owner, which bypasses RLS. That is intentional:
-- seeding is an operator action, not a client action. Every row is still
-- subject to RLS for anyone reading through the API afterwards.
--
-- The content is ordinary technical writing. It is not a claim about any
-- person's employment, clients or results, and it can be replaced wholesale
-- from the admin dashboard.
-- ============================================================================

-- Idempotent: clear the starter rows so re-running does not duplicate them.
delete from public.posts where slug in (
  'understanding-react-rendering',
  'closures-in-javascript',
  'why-core-web-vitals-matter',
  'accessible-forms-by-default',
  'reading-list-2026',
  'how-i-learn-a-new-framework',
  'why-teams-build-component-libraries',
  'the-case-for-boring-technology',
  'notes-on-building-a-knowledge-platform'
);
delete from public.books where slug in (
  'you-dont-know-js-scope-and-closures',
  'refactoring-ui',
  'designing-data-intensive-applications'
);
delete from public.subjects where slug in ('javascript', 'react', 'web-performance');
delete from public.study_resources where slug in (
  'javascript-async-patterns-cheatsheet',
  'css-layout-reference'
);
delete from public.ideas where title in (
  'A search that understands intent',
  'Offline-first reading'
);
delete from public.categories where slug in ('news', 'books', 'study', 'knowledge', 'writing', 'ideas', 'learning');

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
insert into public.categories (name, slug, description, section) values
  ('News',       'news',      'Timely reporting across the topics that matter.', 'news'),
  ('Books',      'books',     'Reading lists, reviews and library notes.',        'books'),
  ('Study',      'study',     'Notes, guides and exam preparation material.',     'study'),
  ('Knowledge',  'knowledge', 'Explanations that connect ideas across fields.',   'knowledge'),
  ('My Writing', 'writing',   'Essays, reflections and longer-form work.',        'writing'),
  ('Ideas',      'ideas',     'Short notes and half-formed thoughts.',            'ideas'),
  ('Learning',   'learning',  'Guides on learning how to learn.',                 'learning');

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------
insert into public.posts
  (title, slug, subtitle, excerpt, content, category_id, section, tags,
   is_featured, is_editors_pick, reading_time, published_at, status, seo_title, seo_description)
values
(
  'Understanding React''s Rendering Model',
  'understanding-react-rendering',
  'Why components re-render, and how to stop guessing',
  'A component re-renders when its state changes, when its parent re-renders, or when a context it reads changes. Understanding those three triggers removes most of the guesswork from performance work.',
  E'## The three triggers\n\nA React component re-renders for exactly three reasons:\n\n1. **Its own state changed.** A `useState` setter was called with a value that is not `Object.is`-equal to the previous one.\n2. **Its parent re-rendered.** Unless the component is wrapped in `React.memo` and its props are equal, a parent render cascades into child renders.\n3. **A context it subscribes to changed.** `useContext` subscribes the component to that context, and any new context value re-renders every consumer.\n\n## Re-rendering is not the same as repainting\n\nA re-render is React calling your function to produce a new element tree. That is usually cheap. The browser only repaints when the resulting DOM actually differs. Most "slowness" attributed to re-rendering is really work happening *inside* the render, such as sorting a large array on every pass.\n\n## Measure before you memoise\n\n`useMemo` and `useCallback` are not free: they allocate and compare dependencies on every render. Reach for them when you have measured a problem, not by default. The React DevTools Profiler shows which components rendered and how long each took.\n\n## Moving state down\n\nThe most effective fix is often structural. If a piece of state is only used by one subtree, move it into that subtree so the rest of the tree stops re-rendering when it changes.',
  (select id from public.categories where slug = 'knowledge'),
  'knowledge',
  array['react', 'performance', 'frontend'],
  true, true, 6,
  now() - interval '2 days', 'published',
  'Understanding React''s Rendering Model',
  'Why React components re-render, the three triggers, and how to measure before optimising.'
),
(
  'Closures in JavaScript, Explained Properly',
  'closures-in-javascript',
  'The concept behind half of JavaScript''s surprising behaviour',
  'A closure is a function together with the scope it was defined in. Once that clicks, event handlers, module patterns and the classic loop problem all stop being surprising.',
  E'## Definition\n\nA closure is a function bundled with the environment it was created in. The function keeps a live reference to that environment, not a copy of it, so it sees later changes to those variables.\n\n## The loop problem\n\n```js\nfor (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i)); // 3, 3, 3\n}\n```\n\n`var` is function-scoped, so all three callbacks close over the *same* `i`, which is `3` by the time they run. Changing `var` to `let` gives each iteration its own binding, and the output becomes `0, 1, 2`.\n\n## Where you already use them\n\n- Event handlers remembering the state at the time they were attached\n- Module patterns that keep private variables out of the global scope\n- Partial application and currying\n\n## The memory caveat\n\nBecause a closure keeps its environment alive, a long-lived closure can hold onto more than you expect. Detach listeners you no longer need.',
  (select id from public.categories where slug = 'knowledge'),
  'knowledge',
  array['javascript', 'fundamentals'],
  true, false, 5,
  now() - interval '5 days', 'published',
  'JavaScript Closures, Explained',
  'What a closure is, the classic loop problem, and where closures appear in everyday code.'
),
(
  'Why Core Web Vitals Matter for Real Users',
  'why-core-web-vitals-matter',
  'Performance metrics that map to things people actually feel',
  'LCP, INP and CLS are not arbitrary numbers. Each one measures something a visitor notices: how long the page takes to look ready, how quickly it responds, and whether it jumps around while loading.',
  E'## The three metrics\n\n- **LCP (Largest Contentful Paint)** — when the main content becomes visible. Aim for under 2.5 seconds.\n- **INP (Interaction to Next Paint)** — how quickly the page responds to a tap or click. Aim for under 200 milliseconds.\n- **CLS (Cumulative Layout Shift)** — how much the layout moves unexpectedly. Aim for under 0.1.\n\n## Fixing CLS is usually the easiest win\n\nMost layout shift comes from images and embeds without reserved space. Set `width` and `height` on images so the browser can reserve the right box before the file arrives.\n\n## Fixing LCP\n\nUsually one large image or font is the culprit. Serve modern formats, size images to their display size, and preconnect to font origins.\n\n## Field data beats lab data\n\nLighthouse runs on your machine with your connection. The Chrome UX Report aggregates real visits. Optimise for the field data.',
  (select id from public.categories where slug = 'knowledge'),
  'knowledge',
  array['performance', 'web-vitals', 'seo'],
  false, true, 5,
  now() - interval '9 days', 'published',
  'Core Web Vitals Explained',
  'What LCP, INP and CLS measure, why they matter to visitors, and how to improve each one.'
),
(
  'Accessible Forms by Default',
  'accessible-forms-by-default',
  'Small markup decisions that make forms usable by everyone',
  'Labels tied to inputs, errors announced to screen readers, and focus that goes where the user expects. None of it is extra work if you do it from the start.',
  E'## Label every control\n\nA `<label>` with a matching `for` attribute gives the control an accessible name and enlarges the click target. Placeholder text is not a label: it disappears as soon as someone types.\n\n## Group related controls\n\n`<fieldset>` with a `<legend>` groups radio buttons and checkboxes so screen readers announce the question, not just the options.\n\n## Announce errors\n\nAn error message needs to be connected to its field with `aria-describedby`, and moved into a live region so it is announced when it appears. Colour alone is not enough.\n\n## Keep focus visible\n\nNever remove the focus outline without replacing it. Keyboard users navigate by watching where focus is.',
  (select id from public.categories where slug = 'learning'),
  'learning',
  array['accessibility', 'html', 'forms'],
  false, false, 4,
  now() - interval '12 days', 'published',
  'Accessible Forms by Default',
  'Labels, fieldsets, error announcements and focus handling for forms that work for everyone.'
),
(
  'Reading List: Books Worth Your Time',
  'reading-list-2026',
  'Three books that changed how I build software',
  'A short, honest list. Each of these changed a decision I make regularly, and none of them is filler.',
  E'## Scope and Closures\n\nPart of the *You Don''t Know JS* series. It explains the mechanism underneath the syntax, which is what turns memorised patterns into understanding.\n\n## Refactoring UI\n\nPractical visual design advice for developers. It covers hierarchy, spacing and colour in a way that is immediately applicable to real interfaces.\n\n## Designing Data-Intensive Applications\n\nThe clearest explanation of how databases, indexes and distributed systems actually behave. It is dense, and it is worth it.',
  (select id from public.categories where slug = 'books'),
  'books',
  array['books', 'reading'],
  false, false, 3,
  now() - interval '16 days', 'published',
  'A Short Reading List for Developers',
  'Three books on JavaScript, interface design and data systems that are worth the time.'
),
(
  'How I Learn a New Framework',
  'how-i-learn-a-new-framework',
  'A repeatable process instead of tutorial hopping',
  'Tutorials give the feeling of progress without the retention. What works better is building one small, real thing and reading the official documentation as a reference.',
  E'## Start with the official guide\n\nNot a video, not a blog post. The official tutorial is written by the people who made the tool and is the least likely to be out of date.\n\n## Build something small but real\n\nA to-do list teaches the same things as a tutorial. A small tool you actually want — a reading tracker, a price watcher — forces you to hit the edges.\n\n## Read the source when confused\n\nWhen the documentation is ambiguous, the implementation is the specification. Modern packages are readable.\n\n## Write it down\n\nNotes written in your own words expose the gaps in your understanding faster than re-reading ever will.',
  (select id from public.categories where slug = 'learning'),
  'learning',
  array['learning', 'process'],
  false, false, 4,
  now() - interval '21 days', 'published',
  'How to Learn a New Framework',
  'A practical process for learning a framework: official docs, one real project, and notes in your own words.'
),
(
  'Why Teams Build Component Libraries',
  'why-teams-build-component-libraries',
  'Consistency is cheaper to enforce than to review',
  'A shared component library is less about saving keystrokes and more about making the correct choice the default one. When every team rebuilds a button, accessibility and spacing drift apart.',
  E'## The real problem\n\nInconsistent interfaces rarely come from carelessness. They come from each team solving the same problem independently, with slightly different results. A button gets a different focus ring in one place and no focus ring in another.\n\n## What a library actually provides\n\n1. **A single accessibility baseline.** Focus states, labels and keyboard behaviour are solved once and inherited.\n2. **A shared vocabulary.** Designers and engineers discuss the same named parts instead of describing them.\n3. **A faster review.** Reviewers stop re-arguing spacing and start reviewing behaviour.\n\n## The cost nobody mentions\n\nA library is a product with users. It needs documentation, versioning and a path for changes that break callers. Teams that treat it as a side project end up with a folder of abandoned components.\n\n## When not to build one\n\nIf a product has one surface and one team, a library is overhead. Reach for it when the same problem is being solved in more than two places.',
  (select id from public.categories where slug = 'writing'),
  'writing',
  array['engineering', 'design-systems'],
  false, false, 5,
  now() - interval '3 days', 'published',
  'Why Teams Build Component Libraries',
  'What a shared component library really buys a team, what it costs, and when not to build one.'
),
(
  'The Case for Boring Technology',
  'the-case-for-boring-technology',
  'Innovation tokens are a budget, and most projects overspend',
  'Every project can absorb only a limited number of unproven choices. Spend them on the part that is genuinely yours to solve, and use well-understood tools everywhere else.',
  E'## Innovation tokens\n\nEvery new technology you adopt is a bet: on its stability, its documentation, and your ability to debug it under pressure. Most projects can afford two or three such bets, not ten.\n\n## What boring buys you\n\n- Answers exist, because other people hit the problem first\n- Hiring and onboarding are easier\n- Upgrades are someone else''s maintenance burden\n\n## Spending the budget well\n\nIf your product''s value is in its data model, make the database the interesting part and keep the frontend conventional. If the interface is the product, the reverse applies.\n\n## The trap\n\nBoring does not mean unmaintained. A stale dependency is a liability regardless of how familiar it feels.',
  (select id from public.categories where slug = 'writing'),
  'writing',
  array['engineering', 'architecture'],
  false, false, 4,
  now() - interval '8 days', 'published',
  'The Case for Boring Technology',
  'Why limiting new technologies per project leads to better outcomes, and how to spend the budget.'
),
(
  'Notes on Building a Knowledge Platform',
  'notes-on-building-a-knowledge-platform',
  'Decisions, and the parts that were harder than expected',
  'Notes from building a personal knowledge platform: why search needed weighting rather than more features, and why row level security changes how you design the client.',
  E'## Start from retrieval, not capture\n\nIt is easy to build a beautiful editor and end up with a pile nothing can find again. The useful question is not "how do I save this?" but "how will I find this in six months?". That reframes search as a primary feature rather than a later addition.\n\n## Weight, then widen\n\nRanking by where a term appears — title first, then excerpt, then body — improved results more than any additional filter. Adding options before the ordering was right made search feel worse, not better.\n\n## Security belongs in the database\n\nPutting the access rules in the database rather than the client means a bug in the interface cannot leak data. The client then has to handle a refusal gracefully, which is more work up front and far less risk later.\n\n## Content outlives the design\n\nThe layout will be redesigned. The writing will not. Anything that treats content as decoration for a template ages badly.',
  (select id from public.categories where slug = 'writing'),
  'writing',
  array['product', 'engineering', 'security'],
  true, false, 6,
  now() - interval '6 days', 'published',
  'Notes on Building a Knowledge Platform',
  'Design notes from building a personal knowledge platform: retrieval, search weighting and database-level security.'
),
(
  'How JavaScript Features Actually Ship',
  'how-javascript-features-ship',
  'The TC39 process, from idea to standard',
  'A proposal does not become part of the language because a browser shipped it. It moves through numbered stages, and each stage has an entry condition that has to be met.',
  E'## The stages\n\n- **Stage 0 — Strawperson.** An idea, discussed by the committee.\n- **Stage 1 — Proposal.** A problem and a shape for the solution, with a champion.\n- **Stage 2 — Draft.** The precise syntax and semantics are specified.\n- **Stage 3 — Candidate.** The specification is complete and implementers are expected to begin building.\n- **Stage 4 — Finished.** Two independent implementations pass the conformance tests, and the feature is added to the next yearly edition.\n\n## Why this matters in practice\n\nA feature you read about is often at Stage 2. It is specified but not yet shipping, and its syntax can still change. Stage 3 is the point where it is safe to learn and start planning for.\n\n## The yearly release\n\nSince 2015 the language ships as a yearly edition containing everything that reached Stage 4. That is why the edition number rarely tells you much about how new the features are.',
  (select id from public.categories where slug = 'news'),
  'news',
  array['javascript', 'standards'],
  true, false, 5,
  now() - interval '1 day', 'published',
  'How JavaScript Features Ship: the TC39 Process',
  'How proposals move through the five TC39 stages to become part of the JavaScript standard.'
),
(
  'What Modern CSS Gives You For Free',
  'what-modern-css-gives-you',
  'Container queries, :has() and nesting, now broadly supported',
  'Three features that used to require JavaScript or a build step are now part of CSS itself, and they are supported across current browsers.',
  E'## Container queries\n\nMedia queries respond to the viewport. Container queries respond to the size of a parent element, which is what you usually want for a component that appears in several places. A card in a narrow sidebar and the same card in a wide column can now lay themselves out differently without any extra markup.\n\n## The :has() selector\n\n`:has()` lets you style a parent based on what it contains. A form field can style itself when it holds an invalid input, with no scripting. This was the most requested CSS feature for years because it removes a whole class of JavaScript workarounds.\n\n## Native nesting\n\nNesting lets you write related rules together without a preprocessor. It is not identical to Sass nesting — the native rules are more precise about what the `&` refers to — so a stylesheet ported from Sass is worth checking rather than assuming.\n\n## The practical effect\n\nEach of these removes a dependency: a JavaScript layout library, a preprocessor, or a resize listener. Less code, and fewer things to break.',
  (select id from public.categories where slug = 'news'),
  'news',
  array['css', 'browser-support'],
  false, false, 5,
  now() - interval '4 days', 'published',
  'Modern CSS: Container Queries, :has() and Nesting',
  'How container queries, the :has() selector and native nesting remove JavaScript and build-step dependencies.'
),
(
  'A Note on This Platform',
  'a-note-on-this-platform',
  'What NEXORA is, and how the content here works',
  'A short explanation of what this site is for, and a plain statement about what is and is not published on it.',
  E'## What this is\n\nNEXORA is a personal knowledge platform: a place to keep writing, study material, book notes and reading references together, and to be able to find them again later.\n\n## How content is published\n\nEverything is stored in a database and published through an admin dashboard. Draft and archived entries are not readable by the public — that restriction is enforced in the database itself, not in the interface, so it holds even if the frontend has a bug.\n\n## About the writing\n\nArticles here are explanations of technical topics written from personal study and practice. They are not news reporting and they make no claim to original research. Where a piece references a specific book or project, that reference is a real one.\n\n## Corrections\n\nIf something here is wrong, it should be corrected rather than quietly removed. Every article supports a correction note for exactly that purpose.',
  (select id from public.categories where slug = 'news'),
  'news',
  array['meta', 'platform'],
  false, false, 4,
  now() - interval '10 days', 'published',
  'About NEXORA',
  'What NEXORA is, how content is published, and how corrections are handled.'
);

-- ---------------------------------------------------------------------------
-- Books
-- ---------------------------------------------------------------------------
insert into public.books
  (title, slug, subtitle, author, publisher, description, category_id, publication_year,
   language, page_count, tags, review, rating, is_featured, published_at, status,
   file_visibility, external_url)
values
(
  'You Don''t Know JS: Scope & Closures',
  'you-dont-know-js-scope-and-closures',
  'Deep dive into JavaScript scope',
  'Kyle Simpson', 'O''Reilly Media',
  'A short, focused book on how JavaScript resolves variables. It covers lexical scope, hoisting, closures and the module pattern, and it explains why the language behaves the way it does rather than only what to type.',
  (select id from public.categories where slug = 'books'),
  2014, 'English', 98,
  array['javascript', 'fundamentals'],
  'The clearest explanation of scope and closures I have read. Short enough to finish in a weekend and dense enough to re-read.',
  4.7, true, now() - interval '14 days', 'published', 'external',
  'https://github.com/getify/You-Dont-Know-JS'
),
(
  'Refactoring UI',
  'refactoring-ui',
  'Design advice for developers',
  'Adam Wathan & Steve Schoger', 'Self-published',
  'A practical guide to making interfaces look considered, aimed at people who write code rather than study design. It covers visual hierarchy, spacing, colour and depth with concrete before-and-after examples.',
  (select id from public.categories where slug = 'books'),
  2018, 'English', 218,
  array['design', 'css', 'ui'],
  'Full of advice you can apply the same afternoon. The chapters on hierarchy and spacing alone changed how I build layouts.',
  4.8, true, now() - interval '18 days', 'published', 'external',
  'https://www.refactoringui.com/'
),
(
  'Designing Data-Intensive Applications',
  'designing-data-intensive-applications',
  'The big ideas behind reliable systems',
  'Martin Kleppmann', 'O''Reilly Media',
  'An explanation of how storage engines, indexes, replication and partitioning actually work, and the trade-offs each design makes. Dense, but it builds a mental model that survives contact with real systems.',
  (select id from public.categories where slug = 'books'),
  2017, 'English', 616,
  array['databases', 'architecture', 'backend'],
  'Not a quick read, and not meant to be. It is the book I reach for when a data problem needs thinking through properly.',
  4.9, false, now() - interval '24 days', 'published', 'external',
  'https://dataintensive.net/'
);

-- ---------------------------------------------------------------------------
-- Subjects and study resources
-- ---------------------------------------------------------------------------
insert into public.subjects (name, slug, description, level, status, display_order) values
  ('JavaScript', 'javascript', 'The language: syntax, the event loop, and the parts that surprise people.', 'Beginner to advanced', 'published', 1),
  ('React', 'react', 'Components, state, effects and the rendering model.', 'Intermediate', 'published', 2),
  ('Web Performance', 'web-performance', 'Measuring and improving how fast pages load and respond.', 'Intermediate', 'published', 3);

insert into public.study_resources
  (title, slug, description, subject, subject_id, resource_type, level, language,
   content, tags, is_featured, published_at, status)
values
(
  'Async Patterns in JavaScript',
  'javascript-async-patterns-cheatsheet',
  'Callbacks, promises and async/await side by side, with the pitfalls of each.',
  'JavaScript',
  (select id from public.subjects where slug = 'javascript'),
  'Notes', 'Intermediate', 'English',
  E'## Callbacks\n\nThe original pattern. Works everywhere, nests badly, and error handling is manual.\n\n## Promises\n\nRepresent a value that will exist later. Chain with `.then`, handle failure once with `.catch`, and run several in parallel with `Promise.all`.\n\n## async/await\n\nSyntax over promises. `await` pauses the function, not the program. Wrap in `try/catch` for errors.\n\n## The pitfall\n\n`await` inside a loop runs sequentially. To run in parallel, build the promises first and await `Promise.all`.',
  array['javascript', 'async'],
  true, now() - interval '7 days', 'published'
),
(
  'CSS Layout Reference',
  'css-layout-reference',
  'Flexbox and Grid, and how to choose between them.',
  'Web Performance',
  (select id from public.subjects where slug = 'web-performance'),
  'Reference', 'Beginner', 'English',
  E'## Flexbox\n\nFor layout in one dimension — a row or a column. Content decides the sizing. Use it for toolbars, button groups and card contents.\n\n## Grid\n\nFor layout in two dimensions. You define the tracks and place items into them. Use it for page layouts and any arrangement where rows and columns both matter.\n\n## The practical rule\n\nIf you are arranging things along a single axis, reach for flexbox. If you are defining a structure with rows and columns, reach for grid. They compose: a grid page layout full of flexbox components is normal.',
  array['css', 'layout'],
  false, now() - interval '11 days', 'published'
);

-- ---------------------------------------------------------------------------
-- Ideas
-- ---------------------------------------------------------------------------
insert into public.ideas (title, description, content, tags, status) values
(
  'A search that understands intent',
  'Keyword search finds strings. Intent search finds what you meant.',
  'Most personal search boxes match substrings. A better version ranks results by how often you open them, how recently they were added, and whether the words appear in the title rather than the body. Start simple: weight the title above the body and add a recency tiebreak.',
  array['search', 'product'],
  'published'
),
(
  'Offline-first reading',
  'Read saved articles without a connection.',
  'Cache saved posts and books locally so they remain readable offline, and sync changes when the connection returns. A service worker plus a local store covers most of it; the hard part is resolving conflicts when the same item was edited in two places.',
  array['offline', 'pwa'],
  'published'
);
