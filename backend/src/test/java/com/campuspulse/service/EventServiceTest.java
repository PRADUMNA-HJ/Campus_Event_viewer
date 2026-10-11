package com.campuspulse.service;

import com.campuspulse.dto.EventCreateRequest;
import com.campuspulse.dto.EventResponse;
import com.campuspulse.entity.Event;
import com.campuspulse.entity.EventStatus;
import com.campuspulse.entity.EventType;
import com.campuspulse.exception.InvalidEventException;
import com.campuspulse.exception.ResourceNotFoundException;
import com.campuspulse.repository.EventRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link EventServiceImpl} using JUnit 5 and Mockito.
 * Tests business logic, date validations, error scenarios, and DTO mappings in isolation.
 */
@ExtendWith(MockitoExtension.class)
class EventServiceTest {

    @Mock
    private EventRepository eventRepository;

    @InjectMocks
    private EventServiceImpl eventService;

    private final LocalDateTime now = LocalDateTime.of(2026, 10, 10, 12, 0);

    private EventCreateRequest createSampleRequest() {
        return new EventCreateRequest(
                "AI Hackathon 2026",
                "Flagship campus hackathon on artificial intelligence",
                EventType.HACKATHON,
                EventStatus.PUBLISHED,
                "Auditorium 1",
                now.plusDays(5),
                now.plusDays(7),
                now.plusDays(3),
                100,
                "Tech Club",
                "techclub@college.edu",
                "+919876543210",
                "https://example.com/ai.png"
        );
    }

    private Event createSampleEntity(Long id) {
        Event event = new Event();
        event.setId(id);
        event.setTitle("AI Hackathon 2026");
        event.setDescription("Flagship campus hackathon on artificial intelligence");
        event.setEventType(EventType.HACKATHON);
        event.setStatus(EventStatus.PUBLISHED);
        event.setLocation("Auditorium 1");
        event.setStartDateTime(now.plusDays(5));
        event.setEndDateTime(now.plusDays(7));
        event.setRegistrationDeadline(now.plusDays(3));
        event.setMaxCapacity(100);
        event.setOrganizerName("Tech Club");
        event.setContactEmail("techclub@college.edu");
        event.setWhatsappNumber("+919876543210");
        event.setBannerUrl("https://example.com/ai.png");
        event.setCreatedAt(now.minusDays(1));
        event.setUpdatedAt(now.minusDays(1));
        return event;
    }

    @Test
    @DisplayName("createEvent: Should successfully create and return EventResponse")
    void testCreateEvent_Success() {
        EventCreateRequest request = createSampleRequest();
        when(eventRepository.save(any(Event.class))).thenAnswer(invocation -> {
            Event entity = invocation.getArgument(0);
            entity.setId(10L);
            return entity;
        });

        EventResponse response = eventService.createEvent(request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getTitle()).isEqualTo("AI Hackathon 2026");
        assertThat(response.getEventType()).isEqualTo(EventType.HACKATHON);
        assertThat(response.getWhatsappNumber()).isEqualTo("+919876543210");
        verify(eventRepository).save(any(Event.class));
    }

    @Test
    @DisplayName("createEvent: Should throw InvalidEventException when endDateTime is before startDateTime")
    void testCreateEvent_InvalidDateRange_ThrowsException() {
        EventCreateRequest request = createSampleRequest();
        // End date is before start date
        request.setStartDateTime(now.plusDays(5));
        request.setEndDateTime(now.plusDays(3));

        assertThatThrownBy(() -> eventService.createEvent(request))
                .isInstanceOf(InvalidEventException.class)
                .hasMessageContaining("Event end date and time must be after the start date and time");

        verify(eventRepository, never()).save(any());
    }

    @Test
    @DisplayName("createEvent: Should throw InvalidEventException when registration deadline is after start date")
    void testCreateEvent_RegistrationDeadlineAfterStart_ThrowsException() {
        EventCreateRequest request = createSampleRequest();
        // Deadline is after start
        request.setStartDateTime(now.plusDays(5));
        request.setEndDateTime(now.plusDays(6));
        request.setRegistrationDeadline(now.plusDays(7));

        assertThatThrownBy(() -> eventService.createEvent(request))
                .isInstanceOf(InvalidEventException.class)
                .hasMessageContaining("Registration deadline must not be after the event start date and time");

        verify(eventRepository, never()).save(any());
    }

    @Test
    @DisplayName("getEventById: Should return EventResponse when event exists")
    void testGetEventById_Success() {
        Event event = createSampleEntity(1L);
        when(eventRepository.findById(1L)).thenReturn(Optional.of(event));

        EventResponse response = eventService.getEventById(1L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getTitle()).isEqualTo("AI Hackathon 2026");
    }

    @Test
    @DisplayName("getEventById: Should throw ResourceNotFoundException when event ID does not exist")
    void testGetEventById_NotFound_ThrowsException() {
        when(eventRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> eventService.getEventById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Event not found with id: 99");
    }

    @Test
    @DisplayName("updateEvent: Should update existing event and return updated response")
    void testUpdateEvent_Success() {
        Event existing = createSampleEntity(1L);
        EventCreateRequest updateRequest = createSampleRequest();
        updateRequest.setTitle("Updated AI Hackathon 2026");
        updateRequest.setLocation("Main Campus Center");

        when(eventRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(eventRepository.save(existing)).thenReturn(existing);

        EventResponse response = eventService.updateEvent(1L, updateRequest);

        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("Updated AI Hackathon 2026");
        assertThat(response.getLocation()).isEqualTo("Main Campus Center");
        verify(eventRepository).save(existing);
    }

    @Test
    @DisplayName("updateEvent: Should throw ResourceNotFoundException when updating non-existent event")
    void testUpdateEvent_NotFound_ThrowsException() {
        EventCreateRequest updateRequest = createSampleRequest();
        when(eventRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> eventService.updateEvent(99L, updateRequest))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Event not found with id: 99");

        verify(eventRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateEvent: Should throw InvalidEventException when update contains invalid date range")
    void testUpdateEvent_InvalidDateRange_ThrowsException() {
        Event existing = createSampleEntity(1L);
        EventCreateRequest updateRequest = createSampleRequest();
        updateRequest.setEndDateTime(updateRequest.getStartDateTime().minusDays(1));

        when(eventRepository.findById(1L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> eventService.updateEvent(1L, updateRequest))
                .isInstanceOf(InvalidEventException.class)
                .hasMessageContaining("Event end date and time must be after the start date and time");

        verify(eventRepository, never()).save(any());
    }

    @Test
    @DisplayName("deleteEvent: Should delete event when found")
    void testDeleteEvent_Success() {
        Event existing = createSampleEntity(1L);
        when(eventRepository.findById(1L)).thenReturn(Optional.of(existing));

        eventService.deleteEvent(1L);

        verify(eventRepository).delete(existing);
    }

    @Test
    @DisplayName("deleteEvent: Should throw ResourceNotFoundException when deleting non-existent event")
    void testDeleteEvent_NotFound_ThrowsException() {
        when(eventRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> eventService.deleteEvent(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Event not found with id: 99");

        verify(eventRepository, never()).delete(any());
    }

    @Test
    @DisplayName("getUpcomingEvents: Should return list of upcoming event responses")
    void testGetUpcomingEvents_ReturnsUpcomingOnly() {
        Event event1 = createSampleEntity(1L);
        Event event2 = createSampleEntity(2L);
        event2.setTitle("Web Development Bootcamp");

        when(eventRepository.findByStartDateTimeAfterOrderByStartDateTimeAsc(any(LocalDateTime.class)))
                .thenReturn(List.of(event1, event2));

        List<EventResponse> results = eventService.getUpcomingEvents();

        assertThat(results).hasSize(2);
        assertThat(results.get(0).getTitle()).isEqualTo("AI Hackathon 2026");
        assertThat(results.get(1).getTitle()).isEqualTo("Web Development Bootcamp");
    }
}
