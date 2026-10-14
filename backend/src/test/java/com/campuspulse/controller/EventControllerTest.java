package com.campuspulse.controller;

import com.campuspulse.dto.EventCreateRequest;
import com.campuspulse.dto.EventResponse;
import com.campuspulse.entity.EventStatus;
import com.campuspulse.entity.EventType;
import com.campuspulse.exception.GlobalExceptionHandler;
import com.campuspulse.exception.InvalidEventException;
import com.campuspulse.exception.ResourceNotFoundException;
import com.campuspulse.service.EventService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web layer integration tests for {@link EventController} using MockMvc.
 * Verifies HTTP response codes, JSON mapping, validation errors, and exception handling.
 */
@WebMvcTest(controllers = EventController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class EventControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private EventService eventService;

    private final LocalDateTime now = LocalDateTime.of(2026, 10, 10, 12, 0);

    private EventCreateRequest createSampleRequest() {
        return new EventCreateRequest(
                "HackPulse 2026",
                "Flagship college hackathon",
                EventType.HACKATHON,
                EventStatus.PUBLISHED,
                "Auditorium 1",
                now.plusDays(5),
                now.plusDays(7),
                now.plusDays(3),
                100,
                "Coding Club",
                "club@college.edu",
                "+919876543210",
                "https://example.com/banner.png"
        );
    }

    private EventResponse createSampleResponse(Long id) {
        return new EventResponse(
                id,
                "HackPulse 2026",
                "Flagship college hackathon",
                EventType.HACKATHON,
                EventStatus.PUBLISHED,
                "Auditorium 1",
                now.plusDays(5),
                now.plusDays(7),
                now.plusDays(3),
                100,
                "Coding Club",
                "club@college.edu",
                "+919876543210",
                "https://example.com/banner.png",
                now.minusDays(1),
                now.minusDays(1)
        );
    }

    @Test
    @DisplayName("GET /api/events: Should return 200 OK and list of upcoming events")
    void testGetUpcomingEvents_Success() throws Exception {
        when(eventService.getUpcomingEvents()).thenReturn(List.of(
                createSampleResponse(1L),
                createSampleResponse(2L)
        ));

        mockMvc.perform(get("/api/events")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is(1)))
                .andExpect(jsonPath("$[0].title", is("HackPulse 2026")))
                .andExpect(jsonPath("$[0].eventType", is("HACKATHON")));
    }

    @Test
    @DisplayName("GET /api/events/today: Should return 200 OK and list of today's events")
    void testGetTodayEvents_Success() throws Exception {
        when(eventService.getTodayEvents()).thenReturn(List.of(
                createSampleResponse(1L),
                createSampleResponse(2L)
        ));

        mockMvc.perform(get("/api/events/today")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is(1)))
                .andExpect(jsonPath("$[0].title", is("HackPulse 2026")))
                .andExpect(jsonPath("$[0].eventType", is("HACKATHON")));
    }

    @Test
    @DisplayName("GET /api/events/{id}: Should return 200 OK when event exists")
    void testGetEventById_Success() throws Exception {
        when(eventService.getEventById(1L)).thenReturn(createSampleResponse(1L));

        mockMvc.perform(get("/api/events/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.title", is("HackPulse 2026")))
                .andExpect(jsonPath("$.whatsappNumber", is("+919876543210")));
    }

    @Test
    @DisplayName("GET /api/events/{id}: Should return 404 NOT_FOUND when event does not exist")
    void testGetEventById_NotFound() throws Exception {
        when(eventService.getEventById(99L)).thenThrow(new ResourceNotFoundException("Event not found with id: 99"));

        mockMvc.perform(get("/api/events/99")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", is("Event not found with id: 99")));
    }

    @Test
    @DisplayName("POST /api/events: Should return 201 CREATED when payload is valid")
    void testCreateEvent_Success() throws Exception {
        EventCreateRequest request = createSampleRequest();
        when(eventService.createEvent(any(EventCreateRequest.class))).thenReturn(createSampleResponse(1L));

        mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.title", is("HackPulse 2026")));
    }

    @Test
    @DisplayName("POST /api/events: Should return 400 BAD_REQUEST when validation fails (e.g., blank title, bad email)")
    void testCreateEvent_ValidationError() throws Exception {
        EventCreateRequest request = createSampleRequest();
        request.setTitle(""); // Violates @NotBlank
        request.setContactEmail("invalid-email"); // Violates @Email

        mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.validationErrors.title").exists())
                .andExpect(jsonPath("$.validationErrors.contactEmail").exists());
    }

    @Test
    @DisplayName("POST /api/events: Should return 400 BAD_REQUEST when service throws InvalidEventException")
    void testCreateEvent_BusinessLogicError() throws Exception {
        EventCreateRequest request = createSampleRequest();
        when(eventService.createEvent(any(EventCreateRequest.class)))
                .thenThrow(new InvalidEventException("Event end date and time must be after the start date and time"));

        mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.message", is("Event end date and time must be after the start date and time")));
    }

    @Test
    @DisplayName("PUT /api/events/{id}: Should return 200 OK when update succeeds")
    void testUpdateEvent_Success() throws Exception {
        EventCreateRequest request = createSampleRequest();
        EventResponse updatedResponse = createSampleResponse(1L);
        updatedResponse.setTitle("Updated HackPulse 2026");

        when(eventService.updateEvent(eq(1L), any(EventCreateRequest.class))).thenReturn(updatedResponse);

        mockMvc.perform(put("/api/events/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.title", is("Updated HackPulse 2026")));
    }

    @Test
    @DisplayName("PUT /api/events/{id}: Should return 404 NOT_FOUND when updating non-existent event")
    void testUpdateEvent_NotFound() throws Exception {
        EventCreateRequest request = createSampleRequest();
        when(eventService.updateEvent(eq(99L), any(EventCreateRequest.class)))
                .thenThrow(new ResourceNotFoundException("Event not found with id: 99"));

        mockMvc.perform(put("/api/events/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.message", is("Event not found with id: 99")));
    }

    @Test
    @DisplayName("DELETE /api/events/{id}: Should return 204 NO_CONTENT on successful deletion")
    void testDeleteEvent_Success() throws Exception {
        doNothing().when(eventService).deleteEvent(1L);

        mockMvc.perform(delete("/api/events/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("DELETE /api/events/{id}: Should return 404 NOT_FOUND when event does not exist")
    void testDeleteEvent_NotFound() throws Exception {
        doThrow(new ResourceNotFoundException("Event not found with id: 99")).when(eventService).deleteEvent(99L);

        mockMvc.perform(delete("/api/events/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.message", is("Event not found with id: 99")));
    }

    @Test
    @DisplayName("GET /api/events/{id}: Should return 400 BAD_REQUEST when ID is not a numeric Long")
    void testGetEventById_TypeMismatch_Returns400() throws Exception {
        mockMvc.perform(get("/api/events/not-a-number")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.message", is("Parameter 'id' must be of type 'Long'")));
    }

    @Test
    @DisplayName("POST /api/events: Should return 400 BAD_REQUEST when JSON body is malformed syntax")
    void testCreateEvent_MalformedJson_Returns400() throws Exception {
        mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{invalid-json-content"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.message", is("Malformed JSON request body or invalid value format")));
    }

    @Test
    @DisplayName("POST /api/events: Should return 400 BAD_REQUEST when enum value is invalid")
    void testCreateEvent_InvalidEnumValue_Returns400() throws Exception {
        String invalidEnumJson = """
                {
                    "title": "Hackathon",
                    "description": "Description",
                    "eventType": "INVALID_ENUM_TYPE",
                    "status": "PUBLISHED",
                    "location": "Auditorium",
                    "startDateTime": "2026-11-10T10:00:00",
                    "endDateTime": "2026-11-12T10:00:00",
                    "registrationDeadline": "2026-11-08T10:00:00",
                    "organizerName": "Org",
                    "contactEmail": "org@college.edu"
                }
                """;

        mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidEnumJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.message", is("Malformed JSON request body or invalid value format")));
    }

    @Test
    @DisplayName("GET /api/events: Should return 500 INTERNAL_SERVER_ERROR without leaking internals on unhandled exception")
    void testGetUpcomingEvents_UnhandledException_ReturnsSafe500() throws Exception {
        when(eventService.getUpcomingEvents())
                .thenThrow(new RuntimeException("Simulated internal db error with sensitive credentials db_pass=secret123"));

        mockMvc.perform(get("/api/events")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status", is(500)))
                .andExpect(jsonPath("$.error", is("Internal Server Error")))
                .andExpect(jsonPath("$.message", is("An unexpected internal server error occurred")))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("secret123"))));
    }
}
