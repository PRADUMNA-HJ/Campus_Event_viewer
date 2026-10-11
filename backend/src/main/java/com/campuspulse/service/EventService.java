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
}
