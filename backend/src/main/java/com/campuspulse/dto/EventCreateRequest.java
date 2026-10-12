package com.campuspulse.dto;

import com.campuspulse.entity.EventStatus;
import com.campuspulse.entity.EventType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/**
 * Request payload DTO for creating or updating a campus event.
 */
public class EventCreateRequest {

    @NotBlank(message = "Event title is required")
    @Size(max = 150, message = "Event title must not exceed 150 characters")
    private String title;

    @NotBlank(message = "Event description is required")
    private String description;

    @NotNull(message = "Event type is required")
    private EventType eventType;

    private EventStatus status = EventStatus.DRAFT;

    @NotBlank(message = "Location is required")
    @Size(max = 255, message = "Location must not exceed 255 characters")
    private String location;

    @NotNull(message = "Start date time is required")
    private LocalDateTime startDateTime;

    @NotNull(message = "End date time is required")
    private LocalDateTime endDateTime;

    @NotNull(message = "Registration deadline is required")
    private LocalDateTime registrationDeadline;

    @Positive(message = "Max capacity must be greater than zero")
    private Integer maxCapacity;

    @NotBlank(message = "Organizer name is required")
    @Size(max = 100, message = "Organizer name must not exceed 100 characters")
    private String organizerName;

    @NotBlank(message = "Contact email is required")
    @Email(message = "Contact email must be a valid email address")
    @Size(max = 150, message = "Contact email must not exceed 150 characters")
    private String contactEmail;

    @Size(max = 20, message = "WhatsApp number must not exceed 20 characters")
    private String whatsappNumber;

    @Size(max = 500, message = "Banner URL must not exceed 500 characters")
    private String bannerUrl;

    @Size(max = 500, message = "Registration URL must not exceed 500 characters")
    private String registrationUrl;

    public EventCreateRequest() {
    }

    public EventCreateRequest(String title,
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

    // Getters and Setters
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
}
