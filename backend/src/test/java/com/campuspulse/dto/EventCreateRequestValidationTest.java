package com.campuspulse.dto;

import com.campuspulse.entity.EventStatus;
import com.campuspulse.entity.EventType;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests verifying bean validation constraints on {@link EventCreateRequest}.
 * Tests constraints in isolation without starting Spring context or servlet containers.
 */
class EventCreateRequestValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    private EventCreateRequest createValidRequest() {
        LocalDateTime now = LocalDateTime.now();
        return new EventCreateRequest(
                "Annual Tech Symposium 2026",
                "Flagship technical symposium covering AI, Cloud, and Cybersecurity.",
                EventType.TECHNICAL,
                EventStatus.PUBLISHED,
                "Main Auditorium Complex",
                now.plusDays(10),
                now.plusDays(12),
                now.plusDays(8),
                250,
                "IEEE Student Branch",
                "ieee@college.edu",
                "+919876543210",
                "https://example.com/banner.jpg"
        );
    }

    @Test
    @DisplayName("Should pass validation when all fields meet constraints")
    void testValidation_ValidRequest_NoViolations() {
        EventCreateRequest request = createValidRequest();
        Set<ConstraintViolation<EventCreateRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Should fail validation when title is blank")
    void testValidation_BlankTitle_ProducesViolation() {
        EventCreateRequest request = createValidRequest();
        request.setTitle("   ");

        Set<ConstraintViolation<EventCreateRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("Event title is required");
    }

    @Test
    @DisplayName("Should fail validation when title exceeds 150 characters")
    void testValidation_TitleExceeds150Characters_ProducesViolation() {
        EventCreateRequest request = createValidRequest();
        request.setTitle("A".repeat(151));

        Set<ConstraintViolation<EventCreateRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("Event title must not exceed 150 characters");
    }

    @Test
    @DisplayName("Should fail validation when description is blank")
    void testValidation_BlankDescription_ProducesViolation() {
        EventCreateRequest request = createValidRequest();
        request.setDescription("");

        Set<ConstraintViolation<EventCreateRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("Event description is required");
    }

    @Test
    @DisplayName("Should fail validation when eventType is null")
    void testValidation_NullEventType_ProducesViolation() {
        EventCreateRequest request = createValidRequest();
        request.setEventType(null);

        Set<ConstraintViolation<EventCreateRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("Event type is required");
    }

    @Test
    @DisplayName("Should fail validation when location is blank")
    void testValidation_BlankLocation_ProducesViolation() {
        EventCreateRequest request = createValidRequest();
        request.setLocation("  ");

        Set<ConstraintViolation<EventCreateRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("Location is required");
    }

    @Test
    @DisplayName("Should fail validation when location exceeds 255 characters")
    void testValidation_LocationExceeds255Characters_ProducesViolation() {
        EventCreateRequest request = createValidRequest();
        request.setLocation("B".repeat(256));

        Set<ConstraintViolation<EventCreateRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("Location must not exceed 255 characters");
    }

    @Test
    @DisplayName("Should fail validation when startDateTime is null")
    void testValidation_NullStartDateTime_ProducesViolation() {
        EventCreateRequest request = createValidRequest();
        request.setStartDateTime(null);

        Set<ConstraintViolation<EventCreateRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("Start date time is required");
    }

    @Test
    @DisplayName("Should fail validation when endDateTime is null")
    void testValidation_NullEndDateTime_ProducesViolation() {
        EventCreateRequest request = createValidRequest();
        request.setEndDateTime(null);

        Set<ConstraintViolation<EventCreateRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("End date time is required");
    }

    @Test
    @DisplayName("Should fail validation when registrationDeadline is null")
    void testValidation_NullRegistrationDeadline_ProducesViolation() {
        EventCreateRequest request = createValidRequest();
        request.setRegistrationDeadline(null);

        Set<ConstraintViolation<EventCreateRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("Registration deadline is required");
    }

    @Test
    @DisplayName("Should fail validation when maxCapacity is zero or negative")
    void testValidation_NonPositiveMaxCapacity_ProducesViolation() {
        EventCreateRequest zeroCapacity = createValidRequest();
        zeroCapacity.setMaxCapacity(0);
        assertThat(validator.validate(zeroCapacity))
                .extracting(ConstraintViolation::getMessage)
                .contains("Max capacity must be greater than zero");

        EventCreateRequest negativeCapacity = createValidRequest();
        negativeCapacity.setMaxCapacity(-10);
        assertThat(validator.validate(negativeCapacity))
                .extracting(ConstraintViolation::getMessage)
                .contains("Max capacity must be greater than zero");
    }

    @Test
    @DisplayName("Should allow null maxCapacity for unlimited capacity events")
    void testValidation_NullMaxCapacity_Allowed() {
        EventCreateRequest request = createValidRequest();
        request.setMaxCapacity(null);

        Set<ConstraintViolation<EventCreateRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Should fail validation when organizerName is blank")
    void testValidation_BlankOrganizerName_ProducesViolation() {
        EventCreateRequest request = createValidRequest();
        request.setOrganizerName("");

        Set<ConstraintViolation<EventCreateRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("Organizer name is required");
    }

    @Test
    @DisplayName("Should fail validation when organizerName exceeds 100 characters")
    void testValidation_OrganizerNameExceeds100Characters_ProducesViolation() {
        EventCreateRequest request = createValidRequest();
        request.setOrganizerName("O".repeat(101));

        Set<ConstraintViolation<EventCreateRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("Organizer name must not exceed 100 characters");
    }

    @Test
    @DisplayName("Should fail validation when contactEmail is blank")
    void testValidation_BlankContactEmail_ProducesViolation() {
        EventCreateRequest request = createValidRequest();
        request.setContactEmail("   ");

        Set<ConstraintViolation<EventCreateRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("Contact email is required");
    }

    @Test
    @DisplayName("Should fail validation when contactEmail is not a valid email address")
    void testValidation_InvalidContactEmailFormat_ProducesViolation() {
        EventCreateRequest request = createValidRequest();
        request.setContactEmail("not-an-email-at-all");

        Set<ConstraintViolation<EventCreateRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("Contact email must be a valid email address");
    }

    @Test
    @DisplayName("Should fail validation when contactEmail exceeds 150 characters")
    void testValidation_ContactEmailExceeds150Characters_ProducesViolation() {
        EventCreateRequest request = createValidRequest();
        request.setContactEmail("a".repeat(140) + "@college.edu"); // 152 chars

        Set<ConstraintViolation<EventCreateRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("Contact email must not exceed 150 characters");
    }

    @Test
    @DisplayName("Should fail validation when whatsappNumber exceeds 20 characters")
    void testValidation_WhatsAppNumberExceeds20Characters_ProducesViolation() {
        EventCreateRequest request = createValidRequest();
        request.setWhatsappNumber("+9198765432101234567890"); // 23 chars

        Set<ConstraintViolation<EventCreateRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("WhatsApp number must not exceed 20 characters");
    }

    @Test
    @DisplayName("Should fail validation when bannerUrl exceeds 500 characters")
    void testValidation_BannerUrlExceeds500Characters_ProducesViolation() {
        EventCreateRequest request = createValidRequest();
        request.setBannerUrl("https://example.com/" + "u".repeat(500));

        Set<ConstraintViolation<EventCreateRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("Banner URL must not exceed 500 characters");
    }
}
