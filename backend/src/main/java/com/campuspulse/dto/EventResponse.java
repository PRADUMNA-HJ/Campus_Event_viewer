package com.campuspulse.dto;

import com.campuspulse.entity.Event;
import com.campuspulse.entity.EventStatus;
import com.campuspulse.entity.EventType;

import java.time.LocalDateTime;

/**
 * Response payload DTO returned to API clients.
 * Decouples database entities from public API contracts.
 */
public class EventResponse {

    private Long id;
    private String title;
    private String description;
    private EventType eventType;
    private EventStatus status;
    private String location;
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;
    private LocalDateTime registrationDeadline;
    private Integer maxCapacity;
    private String organizerName;
    private String contactEmail;
    private String whatsappNumber;
    private String bannerUrl;
    private String registrationUrl;
    private Long createdById;
    private String createdByName;
    private Long reviewedById;
    private LocalDateTime reviewedAt;
    private String reviewNote;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public EventResponse() {
    }

    public EventResponse(Long id,
                         String title,
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
                         String bannerUrl,
                         LocalDateTime createdAt,
                         LocalDateTime updatedAt) {
        this.id = id;
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
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    /**
     * Converts a JPA {@link Event} entity to an {@link EventResponse} DTO.
     *
     * @param event the entity to convert
     * @return populated response DTO, or null if entity is null
     */
    public static EventResponse fromEntity(Event event) {
        if (event == null) {
            return null;
        }
        EventResponse resp = new EventResponse(
                event.getId(),
                event.getTitle(),
                event.getDescription(),
                event.getEventType(),
                event.getStatus(),
                event.getLocation(),
                event.getStartDateTime(),
                event.getEndDateTime(),
                event.getRegistrationDeadline(),
                event.getMaxCapacity(),
                event.getOrganizerName(),
                event.getContactEmail(),
                event.getWhatsappNumber(),
                event.getBannerUrl(),
                event.getCreatedAt(),
                event.getUpdatedAt()
        );
        resp.setRegistrationUrl(event.getRegistrationUrl());
        if (event.getCreatedBy() != null) {
            resp.setCreatedById(event.getCreatedBy().getId());
            resp.setCreatedByName(event.getCreatedBy().getName());
        }
        if (event.getReviewedBy() != null) {
            resp.setReviewedById(event.getReviewedBy().getId());
        }
        resp.setReviewedAt(event.getReviewedAt());
        resp.setReviewNote(event.getReviewNote());
        return resp;
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

    public String getRegistrationUrl() {
        return registrationUrl;
    }

    public void setRegistrationUrl(String registrationUrl) {
        this.registrationUrl = registrationUrl;
    }

    public Long getCreatedById() {
        return createdById;
    }

    public void setCreatedById(Long createdById) {
        this.createdById = createdById;
    }

    public String getCreatedByName() {
        return createdByName;
    }

    public void setCreatedByName(String createdByName) {
        this.createdByName = createdByName;
    }

    public Long getReviewedById() {
        return reviewedById;
    }

    public void setReviewedById(Long reviewedById) {
        this.reviewedById = reviewedById;
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
}
