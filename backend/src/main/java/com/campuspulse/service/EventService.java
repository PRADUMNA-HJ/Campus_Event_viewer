package com.campuspulse.service;

import com.campuspulse.dto.EventCreateRequest;
import com.campuspulse.dto.EventResponse;

import java.util.List;

/**
 * Service interface defining business operations for campus events.
 */
public interface EventService {

    /**
     * Retrieves all upcoming events whose start date/time is in the future.
     * Excludes past/expired events from the listing.
     *
     * @return chronologically sorted list of upcoming event responses
     */
    List<EventResponse> getUpcomingEvents();

    /**
     * Retrieves all published events scheduled for or active during the current calendar day.
     * Includes events starting today, ending today, ongoing events that started earlier,
     * and multi-day events crossing today.
     *
     * @return chronologically sorted list of today's event responses
     */
    List<EventResponse> getTodayEvents();

    /**
     * Retrieves a single event by its unique ID.
     *
     * @param id the event ID
     * @return the event response
     * @throws com.campuspulse.exception.ResourceNotFoundException if no event exists with given ID
     */
    EventResponse getEventById(Long id);

    /**
     * Validates and creates a new event.
     *
     * @param request the creation payload
     * @return the newly created event response
     * @throws com.campuspulse.exception.InvalidEventException if business validation fails
     */
    EventResponse createEvent(EventCreateRequest request);

    /**
     * Validates and updates an existing event.
     *
     * @param id      the ID of the event to update
     * @param request the updated payload
     * @return the updated event response
     * @throws com.campuspulse.exception.ResourceNotFoundException if event ID does not exist
     * @throws com.campuspulse.exception.InvalidEventException   if business validation fails
     */
    EventResponse updateEvent(Long id, EventCreateRequest request);

    /**
     * Deletes an event by its ID.
     *
     * @param id the ID of the event to delete
     * @throws com.campuspulse.exception.ResourceNotFoundException if event ID does not exist
     */
    void deleteEvent(Long id);

    /**
     * Creates an event with security context and ownership tracking.
     */
    EventResponse createEventWithPrincipal(EventCreateRequest request, String principalEmail);

    /**
     * Updates an event enforcing coordinator ownership and review lifecycle.
     */
    EventResponse updateEventWithPrincipal(Long id, EventCreateRequest request, String principalEmail);

    /**
     * Deletes an event enforcing coordinator ownership or admin privileges.
     */
    void deleteEventWithPrincipal(Long id, String principalEmail);

    /**
     * Retrieves all events created by the authenticated coordinator.
     */
    List<EventResponse> getMyCoordinatorEvents(String coordinatorEmail);

    /**
     * Retrieves all events regardless of status for Main Admin overview.
     */
    List<EventResponse> getAllEventsAdmin();

    /**
     * Publishes an event (Main Admin only).
     */
    EventResponse publishEvent(Long id, String adminEmail, String note);

    /**
     * Rejects an event submission (Main Admin only).
     */
    EventResponse rejectEvent(Long id, String adminEmail, String note);

    /**
     * Creates an event with optional uploaded banner and QR-code assets.
     */
    EventResponse createEventWithImages(EventCreateRequest request,
                                       org.springframework.web.multipart.MultipartFile bannerFile,
                                       org.springframework.web.multipart.MultipartFile qrFile,
                                       String principalEmail);

    /**
     * Updates an event with optional uploaded banner and QR-code assets.
     */
    EventResponse updateEventWithImages(Long id,
                                       EventCreateRequest request,
                                       org.springframework.web.multipart.MultipartFile bannerFile,
                                       org.springframework.web.multipart.MultipartFile qrFile,
                                       String principalEmail);

    /**
     * Uploads or replaces the banner image for an existing event.
     */
    EventResponse uploadBanner(Long id, org.springframework.web.multipart.MultipartFile file, String principalEmail);

    /**
     * Deletes the banner image from an event and cleans up cloud storage.
     */
    EventResponse deleteBanner(Long id, String principalEmail);

    /**
     * Uploads or replaces the QR-code image for an existing event.
     */
    EventResponse uploadQrCode(Long id, org.springframework.web.multipart.MultipartFile file, String principalEmail);

    /**
     * Deletes the QR-code image from an event and cleans up cloud storage.
     */
    EventResponse deleteQrCode(Long id, String principalEmail);
}
