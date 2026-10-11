import { Link } from 'react-router-dom';

/**
 * Site footer with branding and navigation links.
 */
export default function Footer() {
  return (
    <footer className="footer" id="footer">
      <div className="container footer__inner">
        <div className="footer__logo">
          <span className="gradient-text">CampusPulse</span>
        </div>
        <p className="footer__text">
          © {new Date().getFullYear()} CampusPulse. Built for campus communities.
        </p>
        <div className="footer__links">
          <Link to="/" className="footer__link">Events</Link>
          <Link to="/about" className="footer__link">About</Link>
        </div>
      </div>
    </footer>
  );
}
