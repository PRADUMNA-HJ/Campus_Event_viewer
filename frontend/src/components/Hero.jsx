import { useMemo } from 'react';

/**
 * Hero section with animated particles, gradient glows, and live stats.
 */
export default function Hero({ eventCount = 0 }) {
  // Generate random particle positions once
  const particles = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 6}s`,
      size: `${1 + Math.random() * 2}px`,
      opacity: 0.1 + Math.random() * 0.3,
    }));
  }, []);

  return (
    <section className="hero" id="hero-section">
      {/* Animated particle background */}
      <div className="hero__particles" aria-hidden="true">
        {particles.map((p) => (
          <div
            key={p.id}
            className="hero__particle"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      {/* Gradient glow orbs */}
      <div className="hero__glow hero__glow--cyan" aria-hidden="true" />
      <div className="hero__glow hero__glow--purple" aria-hidden="true" />

      <div className="hero__content">
        <h1 className="hero__title">
          Discover Campus{' '}
          <span className="gradient-text">Events & Hackathons</span>
        </h1>
        <p className="hero__subtitle">
          Your centralized hub for campus events, workshops, hackathons, and technical symposiums.
          Never miss what's happening on campus.
        </p>
        <div className="hero__stats">
          <div className="hero__stat">
            <div className="hero__stat-value">{eventCount}</div>
            <div className="hero__stat-label">Upcoming Events</div>
          </div>
          <div className="hero__stat">
            <div className="hero__stat-value">6</div>
            <div className="hero__stat-label">Event Types</div>
          </div>
          <div className="hero__stat">
            <div className="hero__stat-value">∞</div>
            <div className="hero__stat-label">Possibilities</div>
          </div>
        </div>
      </div>
    </section>
  );
}
