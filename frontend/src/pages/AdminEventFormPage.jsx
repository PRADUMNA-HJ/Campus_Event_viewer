import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createEvent, updateEvent, fetchEventById, ApiError } from '../services/api';
import {
  toDatetimeLocalValue,
  toIsoDateTime,
  getEventTypeLabel,
} from '../utils/formatters';
import {
  ArrowLeftIcon,
  CheckIcon,
  AlertCircleIcon,
  SpinnerIcon,
} from '../components/Icons';

const EVENT_TYPES = [
  'HACKATHON',
  'WORKSHOP',
  'SEMINAR',
  'TECHNICAL',
  'CULTURAL',
  'GUEST_LECTURE',
];

const EVENT_STATUSES = [
  'DRAFT',
  'PUBLISHED',
  'ONGOING',
  'COMPLETED',
  'CANCELLED',
];

/**
 * Event Create & Edit Form Page
 * 
 * Supports both creating new events and updating existing ones.
 * Adheres strictly to backend EventCreateRequest DTO validation constraints.
 */
export default function AdminEventFormPage() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { token } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: 'HACKATHON',
    status: 'PUBLISHED',
    location: '',
    startDateTime: '',
    endDateTime: '',
    registrationDeadline: '',
    maxCapacity: '',
    organizerName: '',
    contactEmail: '',
    whatsappNumber: '',
    bannerUrl: '',
    qrCodeUrl: '',
    registrationUrl: '',
  });

  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [qrCodeFile, setQrCodeFile] = useState(null);
  const [qrCodePreview, setQrCodePreview] = useState('');
  const [removeBanner, setRemoveBanner] = useState(false);
  const [removeQrCode, setRemoveQrCode] = useState(false);

  // Object URL references for memory leak prevention
  const bannerObjectUrlRef = useRef(null);
  const qrObjectUrlRef = useRef(null);

  const [isLoadingEvent, setIsLoadingEvent] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');

  // Cleanup object URLs on unmount or id change
  useEffect(() => {
    return () => {
      if (bannerObjectUrlRef.current) {
        URL.revokeObjectURL(bannerObjectUrlRef.current);
        bannerObjectUrlRef.current = null;
      }
      if (qrObjectUrlRef.current) {
        URL.revokeObjectURL(qrObjectUrlRef.current);
        qrObjectUrlRef.current = null;
      }
    };
  }, [id]);

  // If in edit mode, fetch existing event data to populate the form; otherwise reset
  useEffect(() => {
    if (!isEditMode) {
      setFormData({
        title: '',
        description: '',
        eventType: 'HACKATHON',
        status: 'PUBLISHED',
        location: '',
        startDateTime: '',
        endDateTime: '',
        registrationDeadline: '',
        maxCapacity: '',
        organizerName: '',
        contactEmail: '',
        whatsappNumber: '',
        bannerUrl: '',
        qrCodeUrl: '',
        registrationUrl: '',
      });
      if (bannerObjectUrlRef.current) {
        URL.revokeObjectURL(bannerObjectUrlRef.current);
        bannerObjectUrlRef.current = null;
      }
      if (qrObjectUrlRef.current) {
        URL.revokeObjectURL(qrObjectUrlRef.current);
        qrObjectUrlRef.current = null;
      }
      setBannerFile(null);
      setBannerPreview('');
      setQrCodeFile(null);
      setQrCodePreview('');
      setRemoveBanner(false);
      setRemoveQrCode(false);
      setIsLoadingEvent(false);
      return;
    }

    let isMounted = true;
    async function loadEvent() {
      setIsLoadingEvent(true);
      setGeneralError('');
      try {
        const { event } = await fetchEventById(id, token);
        if (!event) {
          if (isMounted) {
            setGeneralError(`Event with ID ${id} was not found.`);
          }
          return;
        }

        if (isMounted) {
          setFormData({
            title: event.title || '',
            description: event.description || '',
            eventType: event.eventType || 'HACKATHON',
            status: event.status || 'DRAFT',
            location: event.location || '',
            startDateTime: toDatetimeLocalValue(event.startDateTime),
            endDateTime: toDatetimeLocalValue(event.endDateTime),
            registrationDeadline: toDatetimeLocalValue(event.registrationDeadline),
            maxCapacity: event.maxCapacity !== null && event.maxCapacity !== undefined ? String(event.maxCapacity) : '',
            organizerName: event.organizerName || '',
            contactEmail: event.contactEmail || '',
            whatsappNumber: event.whatsappNumber || '',
            bannerUrl: event.bannerUrl || '',
            qrCodeUrl: event.qrCodeUrl || '',
            registrationUrl: event.registrationUrl || '',
          });
          if (event.bannerUrl) {
            setBannerPreview(event.bannerUrl);
          }
          if (event.qrCodeUrl) {
            setQrCodePreview(event.qrCodeUrl);
          }
        }
      } catch (err) {
        if (isMounted) {
          setGeneralError(err.message || 'Failed to load event details.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingEvent(false);
        }
      }
    }

    loadEvent();

    return () => {
      isMounted = false;
    };
  }, [id, isEditMode, token]);

  const handleBannerFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setGeneralError('Banner image size must not exceed 5 MB.');
      return;
    }
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setGeneralError('Unsupported file type. Please upload a JPEG, PNG, WebP, or GIF image.');
      return;
    }
    setGeneralError('');
    if (bannerObjectUrlRef.current) {
      URL.revokeObjectURL(bannerObjectUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    bannerObjectUrlRef.current = objectUrl;
    setBannerFile(file);
    setBannerPreview(objectUrl);
    setRemoveBanner(false);
  };

  const handleQrFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setGeneralError('QR code image size must not exceed 5 MB.');
      return;
    }
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setGeneralError('Unsupported file type. Please upload a JPEG, PNG, WebP, or GIF image.');
      return;
    }
    setGeneralError('');
    if (qrObjectUrlRef.current) {
      URL.revokeObjectURL(qrObjectUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    qrObjectUrlRef.current = objectUrl;
    setQrCodeFile(file);
    setQrCodePreview(objectUrl);
    setRemoveQrCode(false);
  };

  const handleRemoveBanner = () => {
    if (bannerObjectUrlRef.current) {
      URL.revokeObjectURL(bannerObjectUrlRef.current);
      bannerObjectUrlRef.current = null;
    }
    setBannerFile(null);
    setBannerPreview('');
    setFormData((prev) => ({ ...prev, bannerUrl: '' }));
    setRemoveBanner(true);
  };

  const handleRemoveQrCode = () => {
    if (qrObjectUrlRef.current) {
      URL.revokeObjectURL(qrObjectUrlRef.current);
      qrObjectUrlRef.current = null;
    }
    setQrCodeFile(null);
    setQrCodePreview('');
    setFormData((prev) => ({ ...prev, qrCodeUrl: '' }));
    setRemoveQrCode(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'bannerUrl') {
      setBannerPreview(value);
      setBannerFile(null);
      setRemoveBanner(!value);
    }
    if (name === 'qrCodeUrl') {
      setQrCodePreview(value);
      setQrCodeFile(null);
      setRemoveQrCode(!value);
    }
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Comprehensive client-side validation
  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = 'Event title is required.';
    } else if (formData.title.trim().length > 150) {
      errors.title = 'Title must not exceed 150 characters.';
    }

    if (!formData.description.trim()) {
      errors.description = 'Event description is required.';
    }

    if (!formData.eventType) {
      errors.eventType = 'Please select an event type.';
    }

    if (!formData.location.trim()) {
      errors.location = 'Location is required.';
    } else if (formData.location.trim().length > 255) {
      errors.location = 'Location must not exceed 255 characters.';
    }

    if (!formData.organizerName.trim()) {
      errors.organizerName = 'Organizer name is required.';
    } else if (formData.organizerName.trim().length > 100) {
      errors.organizerName = 'Organizer name must not exceed 100 characters.';
    }

    if (!formData.contactEmail.trim()) {
      errors.contactEmail = 'Contact email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail.trim())) {
      errors.contactEmail = 'Please provide a valid email address.';
    } else if (formData.contactEmail.trim().length > 150) {
      errors.contactEmail = 'Contact email must not exceed 150 characters.';
    }

    if (formData.whatsappNumber && formData.whatsappNumber.length > 20) {
      errors.whatsappNumber = 'WhatsApp number must not exceed 20 characters.';
    }

    if (formData.bannerUrl && formData.bannerUrl.length > 500) {
      errors.bannerUrl = 'Banner URL must not exceed 500 characters.';
    }

    if (formData.maxCapacity) {
      const cap = Number(formData.maxCapacity);
      if (isNaN(cap) || cap <= 0 || !Number.isInteger(cap)) {
        errors.maxCapacity = 'Capacity must be a positive integer.';
      }
    }

    // Date validations
    if (!formData.startDateTime) {
      errors.startDateTime = 'Start date and time are required.';
    }
    if (!formData.endDateTime) {
      errors.endDateTime = 'End date and time are required.';
    }
    if (!formData.registrationDeadline) {
      errors.registrationDeadline = 'Registration deadline is required.';
    }

    if (formData.startDateTime && formData.endDateTime) {
      const start = new Date(formData.startDateTime);
      const end = new Date(formData.endDateTime);
      if (end <= start) {
        errors.endDateTime = 'End date and time must be after the start date and time.';
      }
    }

    if (formData.startDateTime && formData.registrationDeadline) {
      const start = new Date(formData.startDateTime);
      const deadline = new Date(formData.registrationDeadline);
      if (deadline > start) {
        errors.registrationDeadline = 'Registration deadline must not be after the event start date and time.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      eventType: formData.eventType,
      status: formData.status || 'DRAFT',
      location: formData.location.trim(),
      startDateTime: toIsoDateTime(formData.startDateTime),
      endDateTime: toIsoDateTime(formData.endDateTime),
      registrationDeadline: toIsoDateTime(formData.registrationDeadline),
      maxCapacity: formData.maxCapacity ? parseInt(formData.maxCapacity, 10) : null,
      organizerName: formData.organizerName.trim(),
      contactEmail: formData.contactEmail.trim(),
      whatsappNumber: formData.whatsappNumber.trim() || null,
      bannerUrl: formData.bannerUrl.trim() || null,
      qrCodeUrl: formData.qrCodeUrl ? formData.qrCodeUrl.trim() : null,
      registrationUrl: formData.registrationUrl ? formData.registrationUrl.trim() : null,
      removeBanner: removeBanner,
      removeQrCode: removeQrCode,
    };

    let submitData = payload;
    if (bannerFile || qrCodeFile) {
      const data = new FormData();
      data.append('event', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      if (bannerFile) data.append('bannerFile', bannerFile);
      if (qrCodeFile) data.append('qrFile', qrCodeFile);
      submitData = data;
    }

    try {
      if (isEditMode) {
        await updateEvent(id, submitData, token);
        navigate('/admin/dashboard', {
          state: { flashMessage: `Event "${payload.title}" updated successfully.` },
        });
      } else {
        await createEvent(submitData, token);
        navigate('/admin/dashboard', {
          state: { flashMessage: `Event "${payload.title}" created successfully.` },
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.validationErrors) {
          setFieldErrors(err.validationErrors);
          setGeneralError('Validation failed. Please review the highlighted fields.');
        } else {
          setGeneralError(err.message || 'Operation failed. Please try again.');
        }
      } else {
        setGeneralError('Unable to connect to the server. Please check that the backend is running.');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingEvent) {
    return (
      <div className="admin-loading" id="event-form-loading">
        <div className="admin-loading__spinner">
          <SpinnerIcon size={32} />
        </div>
        <p className="admin-loading__text">Loading event information...</p>
      </div>
    );
  }

  return (
    <div className="admin-form-page" id="admin-event-form-page">
      <div className="container admin-form-page__inner">
        {/* Navigation Breadcrumb */}
        <div className="admin-form-page__breadcrumb">
          <Link to="/admin/dashboard" className="back-link" id="form-back-to-dashboard">
            <ArrowLeftIcon size={16} />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="admin-form-page__header">
          <h1 className="admin-form-page__title">
            {isEditMode ? 'Edit Campus Event' : 'Create New Event'}
          </h1>
          <p className="admin-form-page__subtitle">
            {isEditMode
              ? `Update details and schedule for "${formData.title || `Event #${id}`}".`
              : 'Publish an upcoming hackathon, workshop, seminar, or campus festival.'}
          </p>
        </div>

        {/* General Error Alert */}
        {generalError && (
          <div className="alert alert--danger" role="alert" id="form-general-error">
            <AlertCircleIcon size={20} className="alert__icon" />
            <div className="alert__content">
              <p className="alert__message">{generalError}</p>
            </div>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="admin-form-card" noValidate id="event-crud-form">
          {/* Section 1: Basic Event Details */}
          <div className="form-section">
            <h2 className="form-section__title">1. Event Overview</h2>
            <p className="form-section__subtitle">Core event identity and category</p>

            <div className="form-group">
              <label htmlFor="event-title" className="form-label required">
                Event Title
              </label>
              <input
                id="event-title"
                name="title"
                type="text"
                className={`form-input ${fieldErrors.title ? 'form-input--error' : ''}`}
                placeholder="e.g., Spring Hackathon 2026"
                value={formData.title}
                onChange={handleChange}
                maxLength={150}
                disabled={isSubmitting}
                required
              />
              <div className="form-input-help">
                <span>Maximum 150 characters</span>
                <span>{formData.title.length}/150</span>
              </div>
              {fieldErrors.title && <span className="form-error">{fieldErrors.title}</span>}
            </div>

            <div className="form-row form-row--2col">
              <div className="form-group">
                <label htmlFor="event-type" className="form-label required">
                  Event Type
                </label>
                <select
                  id="event-type"
                  name="eventType"
                  className={`form-select ${fieldErrors.eventType ? 'form-input--error' : ''}`}
                  value={formData.eventType}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {getEventTypeLabel(type)}
                    </option>
                  ))}
                </select>
                {fieldErrors.eventType && <span className="form-error">{fieldErrors.eventType}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="event-status" className="form-label required">
                  Publication Status
                </label>
                <select
                  id="event-status"
                  name="status"
                  className="form-select"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  {EVENT_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st.charAt(0) + st.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="event-description" className="form-label required">
                Description & Agenda
              </label>
              <textarea
                id="event-description"
                name="description"
                className={`form-textarea ${fieldErrors.description ? 'form-input--error' : ''}`}
                rows={5}
                placeholder="Provide a detailed description of the event, eligibility, tracks, schedule, and perks..."
                value={formData.description}
                onChange={handleChange}
                disabled={isSubmitting}
                required
              />
              {fieldErrors.description && <span className="form-error">{fieldErrors.description}</span>}
            </div>
          </div>

          {/* Section 2: Date, Time & Venue */}
          <div className="form-section">
            <h2 className="form-section__title">2. Schedule & Venue</h2>
            <p className="form-section__subtitle">Specify dates, registration deadlines, and physical location</p>

            <div className="form-group">
              <label htmlFor="event-location" className="form-label required">
                Location / Venue
              </label>
              <input
                id="event-location"
                name="location"
                type="text"
                className={`form-input ${fieldErrors.location ? 'form-input--error' : ''}`}
                placeholder="e.g., Auditorium Hall, Innovation Center, Building B"
                value={formData.location}
                onChange={handleChange}
                maxLength={255}
                disabled={isSubmitting}
                required
              />
              {fieldErrors.location && <span className="form-error">{fieldErrors.location}</span>}
            </div>

            <div className="form-row form-row--3col">
              <div className="form-group">
                <label htmlFor="event-start-date" className="form-label required">
                  Start Date & Time
                </label>
                <input
                  id="event-start-date"
                  name="startDateTime"
                  type="datetime-local"
                  className={`form-input ${fieldErrors.startDateTime ? 'form-input--error' : ''}`}
                  value={formData.startDateTime}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required
                />
                {fieldErrors.startDateTime && <span className="form-error">{fieldErrors.startDateTime}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="event-end-date" className="form-label required">
                  End Date & Time
                </label>
                <input
                  id="event-end-date"
                  name="endDateTime"
                  type="datetime-local"
                  className={`form-input ${fieldErrors.endDateTime ? 'form-input--error' : ''}`}
                  value={formData.endDateTime}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required
                />
                {fieldErrors.endDateTime && <span className="form-error">{fieldErrors.endDateTime}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="event-deadline" className="form-label required">
                  Registration Deadline
                </label>
                <input
                  id="event-deadline"
                  name="registrationDeadline"
                  type="datetime-local"
                  className={`form-input ${fieldErrors.registrationDeadline ? 'form-input--error' : ''}`}
                  value={formData.registrationDeadline}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required
                />
                {fieldErrors.registrationDeadline && <span className="form-error">{fieldErrors.registrationDeadline}</span>}
              </div>
            </div>
          </div>

          {/* Section 3: Capacity & Contact Information */}
          <div className="form-section">
            <h2 className="form-section__title">3. Capacity & Contact</h2>
            <p className="form-section__subtitle">Organizer contact channels and participant limit</p>

            <div className="form-row form-row--2col">
              <div className="form-group">
                <label htmlFor="event-organizer" className="form-label required">
                  Organizer / Society Name
                </label>
                <input
                  id="event-organizer"
                  name="organizerName"
                  type="text"
                  className={`form-input ${fieldErrors.organizerName ? 'form-input--error' : ''}`}
                  placeholder="e.g., Computer Science Society"
                  value={formData.organizerName}
                  onChange={handleChange}
                  maxLength={100}
                  disabled={isSubmitting}
                  required
                />
                {fieldErrors.organizerName && <span className="form-error">{fieldErrors.organizerName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="event-capacity" className="form-label">
                  Max Capacity <span className="form-label-hint">(Optional)</span>
                </label>
                <input
                  id="event-capacity"
                  name="maxCapacity"
                  type="number"
                  min="1"
                  step="1"
                  className={`form-input ${fieldErrors.maxCapacity ? 'form-input--error' : ''}`}
                  placeholder="e.g., 150"
                  value={formData.maxCapacity}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                {fieldErrors.maxCapacity && <span className="form-error">{fieldErrors.maxCapacity}</span>}
              </div>
            </div>

            <div className="form-row form-row--2col">
              <div className="form-group">
                <label htmlFor="event-contact-email" className="form-label required">
                  Contact Email
                </label>
                <input
                  id="event-contact-email"
                  name="contactEmail"
                  type="email"
                  className={`form-input ${fieldErrors.contactEmail ? 'form-input--error' : ''}`}
                  placeholder="organizer@campus.edu"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  maxLength={150}
                  disabled={isSubmitting}
                  required
                />
                {fieldErrors.contactEmail && <span className="form-error">{fieldErrors.contactEmail}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="event-whatsapp" className="form-label">
                  WhatsApp Contact / Support <span className="form-label-hint">(Optional)</span>
                </label>
                <input
                  id="event-whatsapp"
                  name="whatsappNumber"
                  type="tel"
                  className={`form-input ${fieldErrors.whatsappNumber ? 'form-input--error' : ''}`}
                  placeholder="e.g., +919876543210"
                  value={formData.whatsappNumber}
                  onChange={handleChange}
                  maxLength={20}
                  disabled={isSubmitting}
                />
                {fieldErrors.whatsappNumber && <span className="form-error">{fieldErrors.whatsappNumber}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="event-reg-url" className="form-label">
                Registration / Ticketing Link <span className="form-label-hint">(Optional)</span>
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

          {/* Poster / Banner Asset Section */}
          <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)', border: '1px solid var(--border-card)' }}>
            <h3 style={{ fontSize: 'var(--font-size-base)', margin: '0 0 var(--space-3) 0' }}>
              Event Banner / Poster (Optional)
            </h3>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
              Upload a banner image (JPEG, PNG, WebP, GIF, max 5 MB) or provide a hosted image link.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="event-banner-file" className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>
                  Upload Banner File
                </label>
                <input
                  id="event-banner-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="form-input"
                  onChange={handleBannerFileChange}
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="event-banner-url" className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>
                  Poster / Image URL (Optional)
                </label>
                <input
                  id="event-banner-url"
                  name="bannerUrl"
                  type="url"
                  className={`form-input ${fieldErrors.bannerUrl ? 'form-input--error' : ''}`}
                  placeholder="https://images.unsplash.com/... or hosted poster link"
                  value={formData.bannerUrl}
                  onChange={handleChange}
                  maxLength={500}
                  disabled={isSubmitting}
                />
                {fieldErrors.bannerUrl && <span className="form-error">{fieldErrors.bannerUrl}</span>}
              </div>
            </div>

            {bannerPreview && (
              <div style={{ marginTop: 'var(--space-4)', textAlign: 'center', position: 'relative' }}>
                <div style={{ display: 'inline-block', position: 'relative' }}>
                  <img
                    src={bannerPreview}
                    alt="Poster preview"
                    style={{
                      maxHeight: '180px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-card)',
                      objectFit: 'cover',
                      maxWidth: '100%',
                    }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveBanner}
                    id="remove-banner-btn"
                    className="btn btn--danger btn--sm"
                    style={{ display: 'block', margin: 'var(--space-2) auto 0' }}
                  >
                    Remove Banner
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* QR-Code Asset Section */}
          <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)', border: '1px solid var(--border-card)' }}>
            <h3 style={{ fontSize: 'var(--font-size-base)', margin: '0 0 var(--space-3) 0' }}>
              Event QR-Code Image (Optional)
            </h3>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
              {formData.registrationUrl
                ? 'Upload a QR code linking to your registration page (Google Forms, ticketing, etc.). Displays uncropped in high contrast.'
                : 'Upload a QR code for event check-in or brochure/website information. Displays uncropped in high contrast.'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="event-qr-file" className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>
                  Upload QR-Code File
                </label>
                <input
                  id="event-qr-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="form-input"
                  onChange={handleQrFileChange}
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="event-qr-url" className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>
                  QR Image Link / URL (Optional)
                </label>
                <input
                  id="event-qr-url"
                  name="qrCodeUrl"
                  type="url"
                  className="form-input"
                  placeholder="https://... hosted QR code link"
                  value={formData.qrCodeUrl}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {qrCodePreview && (
              <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
                <div style={{ display: 'inline-block', background: '#ffffff', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)' }}>
                  <img
                    src={qrCodePreview}
                    alt="QR-code preview"
                    style={{
                      maxHeight: '160px',
                      maxWidth: '160px',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleRemoveQrCode}
                    id="remove-qr-btn"
                    className="btn btn--danger btn--sm"
                    style={{ margin: 'var(--space-2) auto 0' }}
                  >
                    Remove QR Code
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <Link
              to="/admin/dashboard"
              className="btn btn--secondary"
              id="form-cancel-btn"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn--primary btn--lg"
              disabled={isSubmitting}
              id="form-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon size={18} />
                  <span>
                    {(bannerFile || qrCodeFile)
                      ? 'Uploading Assets & Submitting...'
                      : (isEditMode ? 'Updating Event...' : 'Publishing Event...')}
                  </span>
                </>
              ) : (
                <>
                  <CheckIcon size={18} />
                  <span>{isEditMode ? 'Update Event' : 'Publish Event'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
