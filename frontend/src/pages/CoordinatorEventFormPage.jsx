import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createEvent, updateEvent, fetchEventById, ApiError } from '../services/api';
import {
  ArrowLeftIcon,
  SaveIcon,
  SpinnerIcon,
  AlertCircleIcon,
  CalendarIcon,
  ClockIcon,
  CheckIcon,
} from '../components/Icons';

/**
 * Coordinator Event Form Page
 * 
 * Supports creating new events or editing existing events for coordinators.
 * New events unconditionally start in PENDING_REVIEW.
 * Edits to published events automatically reset status to PENDING_REVIEW.
 */
export default function CoordinatorEventFormPage() {
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: 'HACKATHON',
    location: '',
    startDateTime: '',
    endDateTime: '',
    registrationDeadline: '',
    maxCapacity: '',
    organizerName: user?.name || '',
    contactEmail: user?.email || '',
    whatsappNumber: '',
    bannerUrl: '',
    registrationUrl: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialStatus, setInitialStatus] = useState(null);

  // Load existing event data in edit mode
  useEffect(() => {
    if (!isEditMode) return;

    async function loadEvent() {
      setIsLoading(true);
      try {
        const { event } = await fetchEventById(id);
        if (!event) {
          setGeneralError('Event not found or inaccessible.');
          return;
        }

        setInitialStatus(event.status);
        setFormData({
          title: event.title || '',
          description: event.description || '',
          eventType: event.eventType || 'HACKATHON',
          location: event.location || '',
          startDateTime: event.startDateTime ? event.startDateTime.slice(0, 16) : '',
          endDateTime: event.endDateTime ? event.endDateTime.slice(0, 16) : '',
          registrationDeadline: event.registrationDeadline ? event.registrationDeadline.slice(0, 16) : '',
          maxCapacity: event.maxCapacity ? String(event.maxCapacity) : '',
          organizerName: event.organizerName || '',
          contactEmail: event.contactEmail || '',
          whatsappNumber: event.whatsappNumber || '',
          bannerUrl: event.bannerUrl || '',
          registrationUrl: event.registrationUrl || '',
        });
      } catch (err) {
        setGeneralError('Failed to load event for editing: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadEvent();
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) errors.title = 'Event title is required.';
    if (!formData.description.trim()) errors.description = 'Event description is required.';
    if (!formData.location.trim()) errors.location = 'Location or venue is required.';
    if (!formData.startDateTime) errors.startDateTime = 'Start date and time are required.';
    if (!formData.endDateTime) errors.endDateTime = 'End date and time are required.';
    if (!formData.organizerName.trim()) errors.organizerName = 'Organizer name is required.';
    if (!formData.contactEmail.trim()) {
      errors.contactEmail = 'Contact email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail.trim())) {
      errors.contactEmail = 'Please provide a valid email address.';
    }

    // Chronological date validations
    if (formData.startDateTime && formData.endDateTime) {
      const start = new Date(formData.startDateTime);
      const end = new Date(formData.endDateTime);
      if (end <= start) {
        errors.endDateTime = 'End date & time must be strictly after start date & time.';
      }
    }

    if (formData.registrationDeadline && formData.startDateTime) {
      const reg = new Date(formData.registrationDeadline);
      const start = new Date(formData.startDateTime);
      if (reg > start) {
        errors.registrationDeadline = 'Registration deadline cannot be after event start time.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) return;

    setIsSubmitting(true);

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      eventType: formData.eventType,
      location: formData.location.trim(),
      startDateTime: formData.startDateTime,
      endDateTime: formData.endDateTime,
      registrationDeadline: formData.registrationDeadline || null,
      maxCapacity: formData.maxCapacity ? parseInt(formData.maxCapacity, 10) : null,
      organizerName: formData.organizerName.trim(),
      contactEmail: formData.contactEmail.trim(),
      whatsappNumber: formData.whatsappNumber.trim() || null,
      bannerUrl: formData.bannerUrl.trim() || null,
      registrationUrl: formData.registrationUrl.trim() || null,
    };

    try {
      if (isEditMode) {
        await updateEvent(id, payload, token);
        const flashMsg = initialStatus === 'PUBLISHED'
          ? `Event "${payload.title}" updated and returned to PENDING_REVIEW for administrator verification.`
          : `Event "${payload.title}" updated successfully.`;
        navigate('/coordinator/dashboard', { state: { flashMessage: flashMsg }, replace: true });
      } else {
        await createEvent(payload, token);
        navigate('/coordinator/dashboard', {
          state: { flashMessage: `Event "${payload.title}" submitted for Main Admin review (PENDING_REVIEW).` },
          replace: true,
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.validationErrors) {
          setFieldErrors(err.validationErrors);
          setGeneralError('Please correct the validation errors below.');
        } else if (err.status === 403) {
          setGeneralError('Permission denied: You do not have coordinator access or do not own this event.');
        } else {
          setGeneralError(err.message || 'Operation failed. Please try again.');
        }
      } else {
        setGeneralError('Unable to connect to server. Please verify backend is running.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-loading" id="coordinator-event-form-loading">
        <div className="admin-loading__spinner">
          <SpinnerIcon size={32} />
        </div>
        <p className="admin-loading__text">Loading event information...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 'var(--space-10) 0', maxWidth: '820px' }} id="coordinator-event-form-page">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link to="/coordinator/dashboard" className="btn btn--ghost btn--sm">
          <ArrowLeftIcon size={14} /> Back to Coordinator Dashboard
        </Link>
      </div>

      <div className="card" style={{ padding: 'var(--space-8)' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <span className="badge badge--admin" style={{ marginBottom: 'var(--space-2)', display: 'inline-block' }}>
            {isEditMode ? `Editing Event #${id}` : 'New Event Submission'}
          </span>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', margin: 0 }}>
            {isEditMode ? 'Edit Campus Event' : 'Create Campus Event'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
            Provide event details for administrative review and campus publication.
          </p>
        </div>

        {/* Workflow Info Alert */}
        <div className="alert alert--info" style={{ marginBottom: 'var(--space-6)' }}>
          <ClockIcon size={20} className="alert__icon" />
          <div className="alert__content">
            <strong>Approval Workflow:</strong>
            <p style={{ marginTop: 'var(--space-1)', color: 'var(--text-secondary)' }}>
              {isEditMode && initialStatus === 'PUBLISHED'
                ? 'Saving edits to this published event will return its status to PENDING_REVIEW until approved by the Main Admin.'
                : 'Your submission will be placed in PENDING_REVIEW status and must be verified by the Main Admin before appearing publicly.'}
            </p>
          </div>
        </div>

        {generalError && (
          <div className="alert alert--danger" role="alert" style={{ marginBottom: 'var(--space-6)' }}>
            <AlertCircleIcon size={20} className="alert__icon" />
            <div className="alert__content">
              <p className="alert__message">{generalError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="admin-event-form" id="coordinator-event-form">
          {/* Title */}
          <div className="form-group">
            <label htmlFor="event-title" className="form-label">
              Event Title <span className="form-required">*</span>
            </label>
            <input
              id="event-title"
              name="title"
              type="text"
              className={`form-input ${fieldErrors.title ? 'form-input--error' : ''}`}
              placeholder="e.g. Annual AI Innovation Hackathon"
              value={formData.title}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            {fieldErrors.title && <span className="form-error" role="alert">{fieldErrors.title}</span>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="event-description" className="form-label">
              Description & Agenda <span className="form-required">*</span>
            </label>
            <textarea
              id="event-description"
              name="description"
              rows={5}
              className={`form-input ${fieldErrors.description ? 'form-input--error' : ''}`}
              placeholder="Detailed description, schedule, tracks, prizes, and requirements..."
              value={formData.description}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            {fieldErrors.description && <span className="form-error" role="alert">{fieldErrors.description}</span>}
          </div>

          {/* Event Type & Venue Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label htmlFor="event-type" className="form-label">
                Event Type <span className="form-required">*</span>
              </label>
              <select
                id="event-type"
                name="eventType"
                className="form-input"
                value={formData.eventType}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                <option value="HACKATHON">Hackathon</option>
                <option value="WORKSHOP">Workshop</option>
                <option value="SEMINAR">Seminar</option>
                <option value="TECHNICAL">Technical Competition</option>
                <option value="CULTURAL">Cultural Event</option>
                <option value="GUEST_LECTURE">Guest Lecture</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="event-location" className="form-label">
                Location / Venue <span className="form-required">*</span>
              </label>
              <input
                id="event-location"
                name="location"
                type="text"
                className={`form-input ${fieldErrors.location ? 'form-input--error' : ''}`}
                placeholder="e.g. Auditorium Hall, Room 304, or Virtual Link"
                value={formData.location}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {fieldErrors.location && <span className="form-error" role="alert">{fieldErrors.location}</span>}
            </div>
          </div>

          {/* Dates & Times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label htmlFor="event-start-date" className="form-label">
                Start Date & Time <span className="form-required">*</span>
              </label>
              <input
                id="event-start-date"
                name="startDateTime"
                type="datetime-local"
                className={`form-input ${fieldErrors.startDateTime ? 'form-input--error' : ''}`}
                value={formData.startDateTime}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {fieldErrors.startDateTime && <span className="form-error" role="alert">{fieldErrors.startDateTime}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="event-end-date" className="form-label">
                End Date & Time <span className="form-required">*</span>
              </label>
              <input
                id="event-end-date"
                name="endDateTime"
                type="datetime-local"
                className={`form-input ${fieldErrors.endDateTime ? 'form-input--error' : ''}`}
                value={formData.endDateTime}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {fieldErrors.endDateTime && <span className="form-error" role="alert">{fieldErrors.endDateTime}</span>}
            </div>
          </div>

          {/* Registration Deadline & Capacity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label htmlFor="event-reg-deadline" className="form-label">
                Registration Deadline (Optional)
              </label>
              <input
                id="event-reg-deadline"
                name="registrationDeadline"
                type="datetime-local"
                className={`form-input ${fieldErrors.registrationDeadline ? 'form-input--error' : ''}`}
                value={formData.registrationDeadline}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {fieldErrors.registrationDeadline && <span className="form-error" role="alert">{fieldErrors.registrationDeadline}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="event-capacity" className="form-label">
                Max Capacity (Optional)
              </label>
              <input
                id="event-capacity"
                name="maxCapacity"
                type="number"
                min="1"
                className="form-input"
                placeholder="e.g. 150"
                value={formData.maxCapacity}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Organizer & Contacts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label htmlFor="event-organizer" className="form-label">
                Organizer / Society Name <span className="form-required">*</span>
              </label>
              <input
                id="event-organizer"
                name="organizerName"
                type="text"
                className={`form-input ${fieldErrors.organizerName ? 'form-input--error' : ''}`}
                placeholder="e.g. ACM Student Chapter"
                value={formData.organizerName}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {fieldErrors.organizerName && <span className="form-error" role="alert">{fieldErrors.organizerName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="event-contact-email" className="form-label">
                Contact Email <span className="form-required">*</span>
              </label>
              <input
                id="event-contact-email"
                name="contactEmail"
                type="email"
                className={`form-input ${fieldErrors.contactEmail ? 'form-input--error' : ''}`}
                placeholder="contact@college.edu"
                value={formData.contactEmail}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {fieldErrors.contactEmail && <span className="form-error" role="alert">{fieldErrors.contactEmail}</span>}
            </div>
          </div>

          {/* WhatsApp & Registration URL */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label htmlFor="event-whatsapp" className="form-label">
                WhatsApp Inquiry Number (Optional)
              </label>
              <input
                id="event-whatsapp"
                name="whatsappNumber"
                type="text"
                className="form-input"
                placeholder="e.g. +91 9876543210"
                value={formData.whatsappNumber}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="event-reg-url" className="form-label">
                External Registration Link / Form URL (Optional)
              </label>
              <input
                id="event-reg-url"
                name="registrationUrl"
                type="url"
                className="form-input"
                placeholder="https://forms.gle/... or event platform"
                value={formData.registrationUrl}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Poster / Banner URL */}
          <div className="form-group">
            <label htmlFor="event-banner-url" className="form-label">
              Poster / Image URL (Optional)
            </label>
            <input
              id="event-banner-url"
              name="bannerUrl"
              type="url"
              className="form-input"
              placeholder="https://images.unsplash.com/... or hosted poster link"
              value={formData.bannerUrl}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          {/* Poster Preview */}
          {formData.bannerUrl && (
            <div style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-2)' }}>
                Poster Preview
              </span>
              <img
                src={formData.bannerUrl}
                alt="Poster preview"
                style={{
                  maxHeight: '220px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-card)',
                  objectFit: 'cover',
                  maxWidth: '100%',
                }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
            <Link to="/coordinator/dashboard" className="btn btn--secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={isSubmitting}
              id="coordinator-submit-event-btn"
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon size={18} />
                  <span>Submitting Event...</span>
                </>
              ) : (
                <>
                  <SaveIcon size={18} />
                  <span>{isEditMode ? 'Update & Submit for Review' : 'Submit for Review'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
