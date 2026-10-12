package com.campuspulse.repository;

import com.campuspulse.entity.Event;
import com.campuspulse.entity.EventStatus;
import com.campuspulse.entity.EventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Spring Data JPA repository for the {@link Event} entity.
 * Provides standard CRUD operations and derived query methods for campus event discovery.
 */
@Repository
public interface EventRepository extends JpaRepository<Event, Long> {

    /**
     * Finds all events matching a specific lifecycle status.
     *
     * @param status the event status (e.g., PUBLISHED, DRAFT)
     * @return list of matching events
     */
    List<Event> findByStatus(EventStatus status);

    /**
     * Finds all events matching a specific status, ordered chronologically by start date.
     *
     * @param status the event status
     * @return chronologically ordered list of matching events
     */
    List<Event> findByStatusOrderByStartDateTimeAsc(EventStatus status);

    /**
     * Finds upcoming events whose start date/time is after the given threshold.
     * Excludes past/expired events from the result set without deleting them.
     *
     * @param threshold the date/time boundary (typically LocalDateTime.now())
     * @return list of upcoming events ordered with the soonest first
     */
    List<Event> findByStartDateTimeAfterOrderByStartDateTimeAsc(LocalDateTime threshold);

    /**
     * Finds published upcoming events whose start date/time is after the given threshold.
     *
     * @param status    the event status (typically PUBLISHED)
     * @param threshold the date/time boundary
     * @return list of published upcoming events ordered chronologically
     */
    List<Event> findByStatusAndStartDateTimeAfterOrderByStartDateTimeAsc(EventStatus status, LocalDateTime threshold);

    /**
     * Filters events by category or type (e.g., HACKATHON, WORKSHOP).
     *
     * @param eventType the category to filter by
     * @return list of matching events
     */
    List<Event> findByEventType(EventType eventType);

    /**
     * Filters events by category, ordered chronologically by start date.
     *
     * @param eventType the category to filter by
     * @return chronologically ordered list of matching events
     */
    List<Event> findByEventTypeOrderByStartDateTimeAsc(EventType eventType);

    /**
     * Filters events by both status and category.
     *
     * @param status    the event status
     * @param eventType the event category
     * @return list of matching events
     */
    List<Event> findByStatusAndEventType(EventStatus status, EventType eventType);

    /**
     * Combined filter: retrieves upcoming events for a specific category.
     *
     * @param eventType the event category
     * @param threshold the date/time boundary
     * @return upcoming events in the specified category ordered chronologically
     */
    List<Event> findByEventTypeAndStartDateTimeAfterOrderByStartDateTimeAsc(EventType eventType, LocalDateTime threshold);

    /**
     * Combined filter: retrieves published upcoming events for a specific category.
     *
     * @param status    the event status (e.g. PUBLISHED)
     * @param eventType the event category (e.g. HACKATHON)
     * @param threshold the date/time boundary
     * @return published upcoming events of that category ordered chronologically
     */
    List<Event> findByStatusAndEventTypeAndStartDateTimeAfterOrderByStartDateTimeAsc(EventStatus status,
                                                                                    EventType eventType,
                                                                                    LocalDateTime threshold);

    /**
     * Finds events hosted by a specific organizer or club (case-insensitive).
     *
     * @param organizerName name of the hosting club or chapter
     * @return list of matching events
     */
    List<Event> findByOrganizerNameIgnoreCase(String organizerName);

    /**
     * Finds all events created by a specific coordinator/admin.
     *
     * @param createdBy the user who created the events
     * @return list of matching events ordered chronologically
     */
    List<Event> findByCreatedByOrderByStartDateTimeAsc(com.campuspulse.entity.Admin createdBy);

    /**
     * Retrieves all events ordered chronologically by start date time.
     *
     * @return list of all events
     */
    List<Event> findAllByOrderByStartDateTimeAsc();
}
