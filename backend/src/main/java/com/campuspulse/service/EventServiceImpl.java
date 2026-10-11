package com.campuspulse.service;

import com.campuspulse.dto.EventCreateRequest;
import com.campuspulse.dto.EventResponse;
import com.campuspulse.entity.Event;
import com.campuspulse.entity.EventStatus;
import com.campuspulse.exception.InvalidEventException;
import com.campuspulse.exception.ResourceNotFoundException;
import com.campuspulse.repository.EventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Implementation of {@link EventService} managing business logic,
 * validation, and persistence interactions for campus events.
 */
@Service
@Transactional(readOnly = true)
public class EventServiceImpl implements EventService {

    private final EventRepository eventRepository;

    public EventServiceImpl(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @Override
    public List<EventResponse> getUpcomingEvents() {
        LocalDateTime now = LocalDateTime.now();
        return eventRepository.findByStartDateTimeAfterOrderByStartDateTimeAsc(now)
                .stream()
                .map(EventResponse::fromEntity)
                .toList();
    }

    @Override
    public EventResponse getEventById(Long id) {
        Event event = findEventOrThrow(id);
        return EventResponse.fromEntity(event);
    }

    @Override
    @Transactional
    public EventResponse createEvent(EventCreateRequest request) {
        validateEventDates(
                request.getStartDateTime(),
                request.getEndDateTime(),
                request.getRegistrationDeadline()
        );

        Event event = new Event();
        mapRequestToEntity(request, event);

        Event saved = eventRepository.save(event);
        return EventResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public EventResponse updateEvent(Long id, EventCreateRequest request) {
        Event existing = findEventOrThrow(id);

        validateEventDates(
                request.getStartDateTime(),
                request.getEndDateTime(),
                request.getRegistrationDeadline()
        );

        mapRequestToEntity(request, existing);

        Event updated = eventRepository.save(existing);
        return EventResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public void deleteEvent(Long id) {
        Event existing = findEventOrThrow(id);
        eventRepository.delete(existing);
    }

    // Helper method to enforce reusable entity retrieval
    private Event findEventOrThrow(Long id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with id: " + id));
    }

    // Business validation rules for event dates
    private void validateEventDates(LocalDateTime start, LocalDateTime end, LocalDateTime deadline) {
        if (start == null || end == null) {
            throw new InvalidEventException("Event start and end date/time must not be null");
        }
        if (!end.isAfter(start)) {
            throw new InvalidEventException("Event end date and time must be after the start date and time");
        }
        if (deadline != null && deadline.isAfter(start)) {
            throw new InvalidEventException("Registration deadline must not be after the event start date and time");
        }
    }

    // Explicit DTO to Entity field mapping
    private void mapRequestToEntity(EventCreateRequest request, Event event) {
        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setEventType(request.getEventType());
        event.setStatus(request.getStatus() != null ? request.getStatus() : EventStatus.DRAFT);
        event.setLocation(request.getLocation());
        event.setStartDateTime(request.getStartDateTime());
        event.setEndDateTime(request.getEndDateTime());
        event.setRegistrationDeadline(request.getRegistrationDeadline());
        event.setMaxCapacity(request.getMaxCapacity());
        event.setOrganizerName(request.getOrganizerName());
        event.setContactEmail(request.getContactEmail());
        event.setWhatsappNumber(request.getWhatsappNumber());
        event.setBannerUrl(request.getBannerUrl());
    }
}
