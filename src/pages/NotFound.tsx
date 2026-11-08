import { PageMeta } from '../components/layout/PageMeta';
import { ButtonLink } from '../components/ui/ButtonLink';

export default function NotFound() {
  return (
    <>
      <PageMeta title="Page not found" noIndex />
      <div className="wrap flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <p className="eyebrow mb-4">404</p>
        <h1 className="text-3xl sm:text-4xl">This page could not be found</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
          The address may be incorrect, or the page may have been moved. Use the navigation above,
          or head back to the homepage.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink to="/" variant="primary">Back to home</ButtonLink>
          <ButtonLink to="/search" variant="ghost">Search NEXORA</ButtonLink>
        </div>
      </div>
    </>
  );
}
