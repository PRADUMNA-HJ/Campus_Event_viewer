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

    @Test
    @DisplayName("getTodayEvents: Should return published events active today including ongoing, upcoming, completed, and multi-day")
    void testGetTodayEvents_IncludesAllTodayOverlappingEvents() {
        java.time.LocalDate today = java.time.LocalDate.of(2026, 10, 14);

        // 1. Ongoing event: started earlier today, ends later today
        Event ongoing = createSampleEntity(1L);
        ongoing.setTitle("Ongoing Hackathon");
        ongoing.setStartDateTime(today.atTime(9, 0));
        ongoing.setEndDateTime(today.atTime(17, 0));

        // 2. Upcoming event today: starts this evening
        Event upcoming = createSampleEntity(2L);
        upcoming.setTitle("Evening Seminar");
        upcoming.setStartDateTime(today.atTime(18, 0));
        upcoming.setEndDateTime(today.atTime(20, 0));

        // 3. Completed event today: ended this morning
        Event completed = createSampleEntity(3L);
        completed.setTitle("Morning Keynote");
        completed.setStartDateTime(today.atTime(7, 0));
        completed.setEndDateTime(today.atTime(8, 30));

        // 4. Multi-day event spanning across today
        Event multiDay = createSampleEntity(4L);
        multiDay.setTitle("3-Day Conference");
        multiDay.setStartDateTime(today.minusDays(1).atTime(10, 0));
        multiDay.setEndDateTime(today.plusDays(1).atTime(18, 0));

        // 5. Midnight-crossing event: starts tonight, ends tomorrow at 2 AM
        Event midnightCross = createSampleEntity(5L);
        midnightCross.setTitle("Midnight Hack Session");
        midnightCross.setStartDateTime(today.atTime(22, 0));
        midnightCross.setEndDateTime(today.plusDays(1).atTime(2, 0));

        // 6. Out-of-day past event: ended yesterday
        Event past = createSampleEntity(6L);
        past.setTitle("Yesterday Workshop");
        past.setStartDateTime(today.minusDays(1).atTime(10, 0));
        past.setEndDateTime(today.minusDays(1).atTime(16, 0));

        // 7. Out-of-day future event: starts tomorrow
        Event future = createSampleEntity(7L);
        future.setTitle("Tomorrow Meetup");
        future.setStartDateTime(today.plusDays(1).atTime(10, 0));
        future.setEndDateTime(today.plusDays(1).atTime(12, 0));

        when(eventRepository.findByStatusOrderByStartDateTimeAsc(EventStatus.PUBLISHED))
                .thenReturn(List.of(multiDay, completed, ongoing, upcoming, midnightCross, past, future));

        List<EventResponse> results = eventService.getTodayEvents(today);

        assertThat(results).hasSize(5);
        assertThat(results).extracting(EventResponse::getTitle)
                .containsExactly(
                        "3-Day Conference",
                        "Morning Keynote",
                        "Ongoing Hackathon",
                        "Evening Seminar",
                        "Midnight Hack Session"
                );
    }

    @Test
    @DisplayName("createEvent: Should throw InvalidEventException when startDateTime or endDateTime is null")
    void testCreateEvent_NullStartOrEndDate_ThrowsException() {
        EventCreateRequest nullStart = createSampleRequest();
        nullStart.setStartDateTime(null);
        assertThatThrownBy(() -> eventService.createEvent(nullStart))
                .isInstanceOf(InvalidEventException.class)
                .hasMessageContaining("Event start and end date/time must not be null");

        EventCreateRequest nullEnd = createSampleRequest();
        nullEnd.setEndDateTime(null);
        assertThatThrownBy(() -> eventService.createEvent(nullEnd))
                .isInstanceOf(InvalidEventException.class)
                .hasMessageContaining("Event start and end date/time must not be null");

        verify(eventRepository, never()).save(any());
    }

    @Test
    @DisplayName("createEvent: Should throw InvalidEventException when endDateTime equals startDateTime")
    void testCreateEvent_IdenticalStartAndEndDate_ThrowsException() {
        EventCreateRequest request = createSampleRequest();
        request.setEndDateTime(request.getStartDateTime());

        assertThatThrownBy(() -> eventService.createEvent(request))
                .isInstanceOf(InvalidEventException.class)
                .hasMessageContaining("Event end date and time must be after the start date and time");

        verify(eventRepository, never()).save(any());
    }

    @Test
    @DisplayName("createEvent: Should succeed when registration deadline is null")
    void testCreateEvent_NullRegistrationDeadline_Allowed() {
        EventCreateRequest request = createSampleRequest();
        request.setRegistrationDeadline(null);

        when(eventRepository.save(any(Event.class))).thenAnswer(invocation -> {
            Event entity = invocation.getArgument(0);
            entity.setId(15L);
            return entity;
        });

        EventResponse response = eventService.createEvent(request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(15L);
        assertThat(response.getRegistrationDeadline()).isNull();
        verify(eventRepository).save(any(Event.class));
    }

    @Test
    @DisplayName("createEvent: Should default status to DRAFT when request status is null")
    void testCreateEvent_DefaultDraftStatusWhenStatusNull() {
        EventCreateRequest request = createSampleRequest();
        request.setStatus(null);

        when(eventRepository.save(any(Event.class))).thenAnswer(invocation -> {
            Event entity = invocation.getArgument(0);
            entity.setId(20L);
            return entity;
        });

        EventResponse response = eventService.createEvent(request);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(EventStatus.DRAFT);
    }

    @Test
    @DisplayName("updateEvent: Should throw InvalidEventException when start or end date is null on update")
    void testUpdateEvent_NullStartOrEndDate_ThrowsException() {
        Event existing = createSampleEntity(1L);
        EventCreateRequest updateRequest = createSampleRequest();
        updateRequest.setStartDateTime(null);

        when(eventRepository.findById(1L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> eventService.updateEvent(1L, updateRequest))
                .isInstanceOf(InvalidEventException.class)
                .hasMessageContaining("Event start and end date/time must not be null");

        verify(eventRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateEvent: Should throw InvalidEventException when end date equals start date on update")
    void testUpdateEvent_IdenticalStartAndEndDate_ThrowsException() {
        Event existing = createSampleEntity(1L);
        EventCreateRequest updateRequest = createSampleRequest();
        updateRequest.setEndDateTime(updateRequest.getStartDateTime());

        when(eventRepository.findById(1L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> eventService.updateEvent(1L, updateRequest))
                .isInstanceOf(InvalidEventException.class)
                .hasMessageContaining("Event end date and time must be after the start date and time");

        verify(eventRepository, never()).save(any());
    }
}
