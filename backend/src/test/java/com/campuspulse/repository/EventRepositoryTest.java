package com.campuspulse.repository;

import com.campuspulse.entity.Event;
import com.campuspulse.entity.EventStatus;
import com.campuspulse.entity.EventType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Focused repository integration tests for {@link EventRepository}.
 * Uses controlled test timestamps to verify query methods, filtering, and ordering
 * against the test H2 database.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class EventRepositoryTest {

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private TestEntityManager entityManager;

    // Controlled reference point in time to avoid clock drift issues
    private final LocalDateTime baseTime = LocalDateTime.of(2026, 10, 10, 12, 0, 0);

    private Event pastHackathon;
    private Event upcomingHackathon;
    private Event upcomingWorkshop;
    private Event draftSeminar;

    private Event buildEvent(String title,
                              EventType eventType,
                              EventStatus status,
                              LocalDateTime start,
                              LocalDateTime end,
                              String organizer) {
        Event event = new Event();
        event.setTitle(title);
        event.setDescription("Description for " + title);
        event.setEventType(eventType);
        event.setStatus(status);
        event.setLocation("Campus Hall A");
        event.setStartDateTime(start);
        event.setEndDateTime(end);
        event.setRegistrationDeadline(start.minusDays(1));
        event.setMaxCapacity(100);
        event.setOrganizerName(organizer);
        event.setContactEmail("contact@" + organizer.toLowerCase().replaceAll("\\s+", "") + ".edu");
        event.setWhatsappNumber("+919876543210");
        event.setBannerUrl("https://example.com/banner.png");
        return event;
    }

    @BeforeEach
    void setUp() {
        // Clear repository to ensure clean test state
        eventRepository.deleteAll();

        // 1. Past event (started 5 days ago, ended 4 days ago)
        pastHackathon = entityManager.persistAndFlush(buildEvent(
                "Winter Hackathon 2026",
                EventType.HACKATHON,
                EventStatus.COMPLETED,
                baseTime.minusDays(5),
                baseTime.minusDays(4),
                "Coding Club"
        ));

        // 2. Upcoming published hackathon (starts 3 days in future)
        upcomingHackathon = entityManager.persistAndFlush(buildEvent(
                "Spring Hackathon 2026",
                EventType.HACKATHON,
                EventStatus.PUBLISHED,
                baseTime.plusDays(3),
                baseTime.plusDays(4),
                "Coding Club"
        ));

        // 3. Upcoming published workshop (starts 7 days in future)
        upcomingWorkshop = entityManager.persistAndFlush(buildEvent(
                "Docker & K8s Workshop",
                EventType.WORKSHOP,
                EventStatus.PUBLISHED,
                baseTime.plusDays(7),
                baseTime.plusDays(8),
                "DevOps Society"
        ));

        // 4. Draft seminar (starts 10 days in future, but still DRAFT)
        draftSeminar = entityManager.persistAndFlush(buildEvent(
                "AI Ethics Seminar",
                EventType.SEMINAR,
                EventStatus.DRAFT,
                baseTime.plusDays(10),
                baseTime.plusDays(11),
                "AI Research Group"
        ));

        entityManager.clear();
    }

    @Test
    @DisplayName("Should save and retrieve an event by its ID")
    void testSaveAndFindById() {
        Optional<Event> found = eventRepository.findById(upcomingHackathon.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getTitle()).isEqualTo("Spring Hackathon 2026");
        assertThat(found.get().getEventType()).isEqualTo(EventType.HACKATHON);
        assertThat(found.get().getStatus()).isEqualTo(EventStatus.PUBLISHED);
    }

    @Test
    @DisplayName("Should find events by status")
    void testFindByStatus() {
        List<Event> publishedEvents = eventRepository.findByStatus(EventStatus.PUBLISHED);
        List<Event> completedEvents = eventRepository.findByStatus(EventStatus.COMPLETED);
        List<Event> draftEvents = eventRepository.findByStatus(EventStatus.DRAFT);

        assertThat(publishedEvents)
                .hasSize(2)
                .extracting(Event::getTitle)
                .containsExactlyInAnyOrder("Spring Hackathon 2026", "Docker & K8s Workshop");

        assertThat(completedEvents)
                .hasSize(1)
                .extracting(Event::getTitle)
                .containsExactly("Winter Hackathon 2026");

        assertThat(draftEvents)
                .hasSize(1)
                .extracting(Event::getTitle)
                .containsExactly("AI Ethics Seminar");
    }

    @Test
    @DisplayName("Should filter events by category (EventType)")
    void testFindByEventType() {
        List<Event> hackathons = eventRepository.findByEventType(EventType.HACKATHON);
        List<Event> workshops = eventRepository.findByEventType(EventType.WORKSHOP);

        assertThat(hackathons)
                .hasSize(2)
                .extracting(Event::getTitle)
                .containsExactlyInAnyOrder("Winter Hackathon 2026", "Spring Hackathon 2026");

        assertThat(workshops)
                .hasSize(1)
                .extracting(Event::getTitle)
                .containsExactly("Docker & K8s Workshop");
    }

    @Test
    @DisplayName("Should return upcoming events ordered chronologically, excluding expired ones")
    void testFindUpcomingEvents_ExcludesPastEvents() {
        List<Event> upcoming = eventRepository.findByStartDateTimeAfterOrderByStartDateTimeAsc(baseTime);

        // Should return upcomingHackathon, upcomingWorkshop, and draftSeminar; exclude pastHackathon
        assertThat(upcoming)
                .hasSize(3)
                .extracting(Event::getTitle)
                .containsExactly("Spring Hackathon 2026", "Docker & K8s Workshop", "AI Ethics Seminar");

        // Verify strictly chronological ordering
        assertThat(upcoming.get(0).getStartDateTime()).isBefore(upcoming.get(1).getStartDateTime());
        assertThat(upcoming.get(1).getStartDateTime()).isBefore(upcoming.get(2).getStartDateTime());
    }

    @Test
    @DisplayName("Should combine status and upcoming filter to return only published upcoming events")
    void testFindByStatusAndStartDateTimeAfter() {
        List<Event> publishedUpcoming = eventRepository
                .findByStatusAndStartDateTimeAfterOrderByStartDateTimeAsc(EventStatus.PUBLISHED, baseTime);

        // Excludes pastHackathon (past) and draftSeminar (DRAFT)
        assertThat(publishedUpcoming)
                .hasSize(2)
                .extracting(Event::getTitle)
                .containsExactly("Spring Hackathon 2026", "Docker & K8s Workshop");
    }

    @Test
    @DisplayName("Should combine category and upcoming filter")
    void testFindByEventTypeAndStartDateTimeAfter() {
        List<Event> upcomingHackathons = eventRepository
                .findByEventTypeAndStartDateTimeAfterOrderByStartDateTimeAsc(EventType.HACKATHON, baseTime);

        assertThat(upcomingHackathons)
                .hasSize(1)
                .extracting(Event::getTitle)
                .containsExactly("Spring Hackathon 2026");
    }

    @Test
    @DisplayName("Should combine status, category, and upcoming filter")
    void testCombinedFilter_StatusCategoryAndUpcoming() {
        List<Event> result = eventRepository
                .findByStatusAndEventTypeAndStartDateTimeAfterOrderByStartDateTimeAsc(
                        EventStatus.PUBLISHED, EventType.HACKATHON, baseTime);

        assertThat(result)
                .hasSize(1)
                .extracting(Event::getTitle)
                .containsExactly("Spring Hackathon 2026");
    }

    @Test
    @DisplayName("Should return an empty list gracefully when no events match the criteria")
    void testEmptyQueryResults() {
        List<Event> culturalEvents = eventRepository.findByEventType(EventType.CULTURAL);
        List<Event> cancelledEvents = eventRepository.findByStatus(EventStatus.CANCELLED);
        List<Event> distantFuture = eventRepository
                .findByStartDateTimeAfterOrderByStartDateTimeAsc(baseTime.plusYears(5));

        assertThat(culturalEvents).isEmpty();
        assertThat(cancelledEvents).isEmpty();
        assertThat(distantFuture).isEmpty();
    }

    @Test
    @DisplayName("Should find events by organizer name ignoring case")
    void testFindByOrganizerNameIgnoreCase() {
        List<Event> events = eventRepository.findByOrganizerNameIgnoreCase("coding club");

        assertThat(events)
                .hasSize(2)
                .extracting(Event::getTitle)
                .containsExactlyInAnyOrder("Winter Hackathon 2026", "Spring Hackathon 2026");
    }
}
