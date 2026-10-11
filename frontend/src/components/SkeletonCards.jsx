/**
 * Skeleton loading cards for the events grid.
 */
export default function SkeletonCards({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 0.1}s` }}>
          <div className="skeleton-card__banner skeleton" />
          <div className="skeleton-card__body">
            <div className="skeleton-card__line skeleton-card__line--title skeleton" />
            <div className="skeleton-card__line skeleton" />
            <div className="skeleton-card__line skeleton-card__line--short skeleton" />
          </div>
        </div>
      ))}
    </>
  );
}
