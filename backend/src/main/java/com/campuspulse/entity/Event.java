package com.campuspulse.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * JPA Entity representing a campus event or hackathon.
 * Maps to the "events" table in both H2 (development) and PostgreSQL (production).
 */
@Entity
@Table(name = "events")
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Event title is required")
    @Size(max = 150, message = "Event title must not exceed 150 characters")
    @Column(nullable = false, length = 150)
    private String title;

    @NotBlank(message = "Event description is required")
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @NotNull(message = "Event type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 30)
    private EventType eventType;

    @NotNull(message = "Event status is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EventStatus status = EventStatus.DRAFT;

    @NotBlank(message = "Event location is required")
    @Size(max = 255, message = "Location must not exceed 255 characters")
    @Column(nullable = false, length = 255)
    private String location;

    @NotNull(message = "Start date time is required")
    @Column(name = "start_date_time", nullable = false)
    private LocalDateTime startDateTime;

    @NotNull(message = "End date time is required")
    @Column(name = "end_date_time", nullable = false)
    private LocalDateTime endDateTime;

    @NotNull(message = "Registration deadline is required")
    @Column(name = "registration_deadline", nullable = false)
    private LocalDateTime registrationDeadline;

    @Positive(message = "Max capacity must be greater than zero")
    @Column(name = "max_capacity")
    private Integer maxCapacity;

    @NotBlank(message = "Organizer name is required")
    @Size(max = 100, message = "Organizer name must not exceed 100 characters")
    @Column(name = "organizer_name", nullable = false, length = 100)
    private String organizerName;

    @NotBlank(message = "Contact email is required")
    @Email(message = "Contact email must be a valid email address")
    @Size(max = 150, message = "Contact email must not exceed 150 characters")
    @Column(name = "contact_email", nullable = false, length = 150)
    private String contactEmail;

    @Size(max = 20, message = "WhatsApp number must not exceed 20 characters")
    @Column(name = "whatsapp_number", length = 20)
    private String whatsappNumber;

    @Size(max = 500, message = "Banner URL must not exceed 500 characters")
    @Column(name = "banner_url", length = 500)
    private String bannerUrl;

    @Size(max = 255, message = "Banner public ID must not exceed 255 characters")
    @Column(name = "banner_public_id", length = 255)
    private String bannerPublicId;

    @Size(max = 500, message = "QR code URL must not exceed 500 characters")
    @Column(name = "qr_code_url", length = 500)
    private String qrCodeUrl;

    @Size(max = 255, message = "QR code public ID must not exceed 255 characters")
    @Column(name = "qr_code_public_id", length = 255)
    private String qrCodePublicId;

    @Size(max = 500, message = "Registration URL must not exceed 500 characters")
    @Column(name = "registration_url", length = 500)
    private String registrationUrl;

    @ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
    @jakarta.persistence.JoinColumn(name = "created_by_id")
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.SET_NULL)
    private Admin createdBy;

    @ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
    @jakarta.persistence.JoinColumn(name = "reviewed_by_id")
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.SET_NULL)
    private Admin reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_note", length = 1000)
    private String reviewNote;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Default constructor required by JPA
    public Event() {
    }

    // Convenience constructor for creating new events
    public Event(String title,
                 String description,
                 EventType eventType,
                 EventStatus status,
                 String location,
                 LocalDateTime startDateTime,
                 LocalDateTime endDateTime,
                 LocalDateTime registrationDeadline,
                 Integer maxCapacity,
                 String organizerName,
                 String contactEmail,
                 String whatsappNumber,
                 String bannerUrl) {
        this.title = title;
        this.description = description;
        this.eventType = eventType;
        this.status = status;
        this.location = location;
        this.startDateTime = startDateTime;
        this.endDateTime = endDateTime;
        this.registrationDeadline = registrationDeadline;
        this.maxCapacity = maxCapacity;
        this.organizerName = organizerName;
        this.contactEmail = contactEmail;
        this.whatsappNumber = whatsappNumber;
        this.bannerUrl = bannerUrl;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null) {
            this.status = EventStatus.DRAFT;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public EventType getEventType() {
        return eventType;
    }

    public void setEventType(EventType eventType) {
        this.eventType = eventType;
    }

    public EventStatus getStatus() {
        return status;
    }

    public void setStatus(EventStatus status) {
        this.status = status;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public LocalDateTime getStartDateTime() {
        return startDateTime;
    }

    public void setStartDateTime(LocalDateTime startDateTime) {
        this.startDateTime = startDateTime;
    }

    public LocalDateTime getEndDateTime() {
        return endDateTime;
    }

    public void setEndDateTime(LocalDateTime endDateTime) {
        this.endDateTime = endDateTime;
    }

    public LocalDateTime getRegistrationDeadline() {
        return registrationDeadline;
    }

    public void setRegistrationDeadline(LocalDateTime registrationDeadline) {
        this.registrationDeadline = registrationDeadline;
    }

    public Integer getMaxCapacity() {
        return maxCapacity;
    }

    public void setMaxCapacity(Integer maxCapacity) {
        this.maxCapacity = maxCapacity;
    }

    public String getOrganizerName() {
        return organizerName;
    }

    public void setOrganizerName(String organizerName) {
        this.organizerName = organizerName;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public void setContactEmail(String contactEmail) {
        this.contactEmail = contactEmail;
    }

    public String getWhatsappNumber() {
        return whatsappNumber;
    }

    public void setWhatsappNumber(String whatsappNumber) {
        this.whatsappNumber = whatsappNumber;
    }

    public String getBannerUrl() {
        return bannerUrl;
    }

    public void setBannerUrl(String bannerUrl) {
        this.bannerUrl = bannerUrl;
    }

    public String getBannerPublicId() {
        return bannerPublicId;
    }

    public void setBannerPublicId(String bannerPublicId) {
        this.bannerPublicId = bannerPublicId;
    }

    public String getQrCodeUrl() {
        return qrCodeUrl;
    }

    public void setQrCodeUrl(String qrCodeUrl) {
        this.qrCodeUrl = qrCodeUrl;
    }

    public String getQrCodePublicId() {
        return qrCodePublicId;
    }

    public void setQrCodePublicId(String qrCodePublicId) {
        this.qrCodePublicId = qrCodePublicId;
    }

    public String getRegistrationUrl() {
        return registrationUrl;
    }

    public void setRegistrationUrl(String registrationUrl) {
        this.registrationUrl = registrationUrl;
    }

    public Admin getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Admin createdBy) {
        this.createdBy = createdBy;
    }

    public Admin getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(Admin reviewedBy) {
        this.reviewedBy = reviewedBy;
    }

    public LocalDateTime getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(LocalDateTime reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public String getReviewNote() {
        return reviewNote;
    }

    public void setReviewNote(String reviewNote) {
        this.reviewNote = reviewNote;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Event event = (Event) o;
        return Objects.equals(id, event.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Event{" +
                "id=" + id +
                ", title='" + title + '\'' +
                ", eventType=" + eventType +
                ", status=" + status +
                ", organizerName='" + organizerName + '\'' +
                ", startDateTime=" + startDateTime +
                ", whatsappNumber='" + whatsappNumber + '\'' +
                '}';
    }
}
