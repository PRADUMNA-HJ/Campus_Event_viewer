import { Link } from 'react-router-dom';

/**
 * 404 Not Found page.
 */
export default function NotFoundPage() {
  return (
    <div className="not-found" id="not-found-page">
      <div className="not-found__code">404</div>
      <h1 className="not-found__title">Page Not Found</h1>
      <p className="not-found__description">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="not-found__link" id="go-home-link">
        ← Back to Events
      </Link>
    </div>
  );
}
