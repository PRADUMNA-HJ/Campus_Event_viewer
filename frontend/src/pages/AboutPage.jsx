/**
 * About page — Platform information and features overview.
 */
export default function AboutPage() {
  const features = [
    {
      icon: '🔍',
      title: 'Discover Events',
      description: 'Browse and search through campus events, hackathons, workshops, and seminars. Find exactly what interests you with powerful filtering.',
    },
    {
      icon: '🔒',
      title: 'Secure Admin Portal',
      description: 'Authorized administrators manage events through a secure JWT-authenticated dashboard. Role-based access ensures platform integrity.',
    },
    {
      icon: '⚡',
      title: 'Real-Time Updates',
      description: 'Stay current with live event listings powered by our Spring Boot backend. Never miss an important campus event again.',
    },
    {
      icon: '📱',
      title: 'Responsive Design',
      description: 'Access CampusPulse from any device — desktop, tablet, or mobile. Our modern interface adapts seamlessly to every screen size.',
    },
    {
      icon: '🎨',
      title: 'Event Categories',
      description: 'Events are organized into clear categories: Hackathons, Workshops, Seminars, Technical events, Cultural festivals, and Guest Lectures.',
    },
    {
      icon: '🌐',
      title: 'Open Access',
      description: 'Students can freely browse all public events without creating an account. No barriers to discovering what\'s happening on campus.',
    },
  ];

  return (
    <div className="about-page container" id="about-page">
      <div className="about-page__hero">
        <h1 className="about-page__title">
          About <span className="gradient-text">CampusPulse</span>
        </h1>
        <p className="about-page__subtitle">
          CampusPulse is a centralized platform designed for college campuses to discover,
          organize, and participate in campus events, technical symposiums, and hackathons.
        </p>
      </div>

      <div className="about-page__features" id="features-grid">
        {features.map((feature, index) => (
          <div
            key={index}
            className="feature-card animate-fade-in-up"
            style={{ animationDelay: `${index * 0.1}s` }}
            id={`feature-card-${index}`}
          >
            <div className="feature-card__icon">{feature.icon}</div>
            <h3 className="feature-card__title">{feature.title}</h3>
            <p className="feature-card__description">{feature.description}</p>
          </div>
        ))}
      </div>

      <div className="event-detail__info-card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
        <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: 'var(--space-4)' }}>
          Tech Stack
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.8 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Backend:</strong> Java 21 • Spring Boot 3.x • Spring Security • JWT (JJWT) • H2 / PostgreSQL<br />
          <strong style={{ color: 'var(--text-primary)' }}>Frontend:</strong> React 18 • Vite • React Router • Vanilla CSS Design System<br />
          <strong style={{ color: 'var(--text-primary)' }}>Architecture:</strong> REST API • Stateless JWT Auth • Role-Based Access Control
        </p>
      </div>
    </div>
  );
}
