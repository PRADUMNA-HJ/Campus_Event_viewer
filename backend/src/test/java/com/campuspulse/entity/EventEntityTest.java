package com.campuspulse.entity;

import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Focused persistence and mapping tests for the Event entity.
 * Uses TestEntityManager to test JPA/Hibernate lifecycle and constraints
 * without introducing repository or service layers.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class EventEntityTest {

    @Autowired
    private TestEntityManager entityManager;

    private Event createSampleEvent() {
        LocalDateTime now = LocalDateTime.now();
        Event event = new Event();
        event.setTitle("Campus Hackathon 2026");
        event.setDescription("A 24-hour flagship hackathon for student developers.");
        event.setEventType(EventType.HACKATHON);
        event.setStatus(EventStatus.PUBLISHED);
        event.setLocation("Tech Hub Seminar Hall A");
        event.setStartDateTime(now.plusDays(7));
        event.setEndDateTime(now.plusDays(8));
        event.setRegistrationDeadline(now.plusDays(5));
        event.setMaxCapacity(150);
        event.setOrganizerName("ACM Student Chapter");
        event.setContactEmail("acm@college.edu");
        event.setWhatsappNumber("+919876543210");
        event.setBannerUrl("https://example.com/banners/hackathon.png");
        return event;
    }

    @Test
    @DisplayName("Should successfully persist and retrieve a complete Event")
    void testSaveAndRetrieveEvent() {
        Event event = createSampleEvent();

        Event saved = entityManager.persistAndFlush(event);
        entityManager.clear();

        Event retrieved = entityManager.find(Event.class, saved.getId());

        assertThat(retrieved).isNotNull();
        assertThat(retrieved.getId()).isNotNull().isPositive();
        assertThat(retrieved.getTitle()).isEqualTo("Campus Hackathon 2026");
        assertThat(retrieved.getEventType()).isEqualTo(EventType.HACKATHON);
        assertThat(retrieved.getStatus()).isEqualTo(EventStatus.PUBLISHED);
        assertThat(retrieved.getOrganizerName()).isEqualTo("ACM Student Chapter");
        assertThat(retrieved.getContactEmail()).isEqualTo("acm@college.edu");
        assertThat(retrieved.getWhatsappNumber()).isEqualTo("+919876543210");
        assertThat(retrieved.getMaxCapacity()).isEqualTo(150);
        assertThat(retrieved.getCreatedAt()).isNotNull();
        assertThat(retrieved.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("Should apply default DRAFT status and timestamps via @PrePersist")
    void testPrePersistDefaultsAndTimestamps() {
        Event event = createSampleEvent();
        event.setStatus(null); // Clear status to test default assignment

        Event saved = entityManager.persistAndFlush(event);
        entityManager.clear();

        Event retrieved = entityManager.find(Event.class, saved.getId());

        assertThat(retrieved).isNotNull();
        assertThat(retrieved.getStatus()).isEqualTo(EventStatus.DRAFT);
        assertThat(retrieved.getCreatedAt()).isNotNull();
        assertThat(retrieved.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("Should accurately store and retrieve event date-time fields")
    void testDateTimeHandling() {
        Event event = createSampleEvent();
        LocalDateTime start = LocalDateTime.of(2026, 11, 15, 9, 30, 0);
        LocalDateTime end = LocalDateTime.of(2026, 11, 16, 17, 0, 0);
        LocalDateTime deadline = LocalDateTime.of(2026, 11, 10, 23, 59, 59);

        event.setStartDateTime(start);
        event.setEndDateTime(end);
        event.setRegistrationDeadline(deadline);

        Event saved = entityManager.persistAndFlush(event);
        entityManager.clear();

        Event retrieved = entityManager.find(Event.class, saved.getId());

        assertThat(retrieved).isNotNull();
        assertThat(retrieved.getStartDateTime()).isEqualTo(start);
        assertThat(retrieved.getEndDateTime()).isEqualTo(end);
        assertThat(retrieved.getRegistrationDeadline()).isEqualTo(deadline);
    }

    @Test
    @DisplayName("Should fail validation when required title is blank")
    void testValidation_BlankTitle_ThrowsException() {
        Event event = createSampleEvent();
        event.setTitle(""); // Blank title violates @NotBlank

        assertThatThrownBy(() -> entityManager.persistAndFlush(event))
                .isInstanceOf(ConstraintViolationException.class)
                .hasMessageContaining("Event title is required");
    }

    @Test
    @DisplayName("Should fail validation when contact email format is invalid")
    void testValidation_InvalidEmail_ThrowsException() {
        Event event = createSampleEvent();
        event.setContactEmail("not-a-valid-email"); // Violates @Email

        assertThatThrownBy(() -> entityManager.persistAndFlush(event))
                .isInstanceOf(ConstraintViolationException.class)
                .hasMessageContaining("Contact email must be a valid email address");
    }

    @Test
    @DisplayName("Should update updatedAt timestamp on entity modification")
    void testPreUpdate_UpdatesTimestamp() throws InterruptedException {
        Event event = createSampleEvent();
        Event saved = entityManager.persistAndFlush(event);
        entityManager.clear();

        Event existing = entityManager.find(Event.class, saved.getId());
        LocalDateTime initialUpdatedAt = existing.getUpdatedAt();

        // Pause to ensure system clock advances
        Thread.sleep(25);

        existing.setTitle("Updated Hackathon Title");
        entityManager.persistAndFlush(existing);
        entityManager.clear();

        Event reloaded = entityManager.find(Event.class, existing.getId());

        assertThat(reloaded.getTitle()).isEqualTo("Updated Hackathon Title");
        assertThat(reloaded.getUpdatedAt()).isAfter(initialUpdatedAt);
    }

    @Test
    @DisplayName("Should fail validation when startDateTime is null")
    void testValidation_NullStartDate_ThrowsException() {
        Event event = createSampleEvent();
        event.setStartDateTime(null);

        assertThatThrownBy(() -> entityManager.persistAndFlush(event))
                .isInstanceOf(ConstraintViolationException.class)
                .hasMessageContaining("Start date time is required");
    }

    @Test
    @DisplayName("Should fail validation when endDateTime is null")
    void testValidation_NullEndDate_ThrowsException() {
        Event event = createSampleEvent();
        event.setEndDateTime(null);

        assertThatThrownBy(() -> entityManager.persistAndFlush(event))
                .isInstanceOf(ConstraintViolationException.class)
                .hasMessageContaining("End date time is required");
    }

    @Test
    @DisplayName("Should fail validation when description is blank")
    void testValidation_BlankDescription_ThrowsException() {
        Event event = createSampleEvent();
        event.setDescription("   ");

        assertThatThrownBy(() -> entityManager.persistAndFlush(event))
                .isInstanceOf(ConstraintViolationException.class)
                .hasMessageContaining("Event description is required");
    }

    @Test
    @DisplayName("Should fail validation when location is blank")
    void testValidation_BlankLocation_ThrowsException() {
        Event event = createSampleEvent();
        event.setLocation("");

        assertThatThrownBy(() -> entityManager.persistAndFlush(event))
                .isInstanceOf(ConstraintViolationException.class)
                .hasMessageContaining("Event location is required");
    }

    @Test
    @DisplayName("Should fail validation when organizerName is blank")
    void testValidation_BlankOrganizerName_ThrowsException() {
        Event event = createSampleEvent();
        event.setOrganizerName("");

        assertThatThrownBy(() -> entityManager.persistAndFlush(event))
                .isInstanceOf(ConstraintViolationException.class)
                .hasMessageContaining("Organizer name is required");
    }

    @Test
    @DisplayName("Should fail validation when maxCapacity is non-positive")
    void testValidation_NonPositiveMaxCapacity_ThrowsException() {
        Event event = createSampleEvent();
        event.setMaxCapacity(-5);

        assertThatThrownBy(() -> entityManager.persistAndFlush(event))
                .isInstanceOf(ConstraintViolationException.class)
                .hasMessageContaining("Max capacity must be greater than zero");
    }

    @Test
    @DisplayName("Should fail validation when title exceeds 150 characters")
    void testValidation_TitleLengthExceeded_ThrowsException() {
        Event event = createSampleEvent();
        event.setTitle("T".repeat(151));

        assertThatThrownBy(() -> entityManager.persistAndFlush(event))
                .isInstanceOf(ConstraintViolationException.class)
                .hasMessageContaining("Event title must not exceed 150 characters");
    }
}
