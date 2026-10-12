package com.campuspulse.security;

import com.campuspulse.entity.Admin;
import com.campuspulse.entity.Event;
import com.campuspulse.entity.EventStatus;
import com.campuspulse.entity.EventType;
import com.campuspulse.entity.Role;
import com.campuspulse.repository.AdminRepository;
import com.campuspulse.repository.EventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration tests for Event Ownership, Multi-Coordinator Isolation,
 * Main Admin approval workflow, and public visibility rules.
 */
@SpringBootTest
@AutoConfigureMockMvc
class EventApprovalAndOwnershipIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    private Admin mainAdmin;
    private Admin coordinatorA;
    private Admin coordinatorB;
    private Admin regularUser;

    private String adminToken;
    private String coordAToken;
    private String coordBToken;
    private String userToken;

    private final LocalDateTime now = LocalDateTime.now();

    @BeforeEach
    void setUp() {
        eventRepository.deleteAll();
        adminRepository.deleteAll();

        mainAdmin = adminRepository.saveAndFlush(new Admin("Admin", "admin@college.edu", passwordEncoder.encode("Pass1!"), Role.MAIN_ADMIN));
        coordinatorA = adminRepository.saveAndFlush(new Admin("Coord A", "coorda@college.edu", passwordEncoder.encode("Pass1!"), Role.COORDINATOR));
        coordinatorB = adminRepository.saveAndFlush(new Admin("Coord B", "coordb@college.edu", passwordEncoder.encode("Pass1!"), Role.COORDINATOR));
        regularUser = adminRepository.saveAndFlush(new Admin("User", "user@college.edu", passwordEncoder.encode("Pass1!"), Role.USER));

        adminToken = jwtService.generateToken(mainAdmin.getEmail(), "MAIN_ADMIN");
        coordAToken = jwtService.generateToken(coordinatorA.getEmail(), "COORDINATOR");
        coordBToken = jwtService.generateToken(coordinatorB.getEmail(), "COORDINATOR");
        userToken = jwtService.generateToken(regularUser.getEmail(), "USER");
    }

    @org.junit.jupiter.api.AfterEach
    void tearDown() {
        eventRepository.deleteAll();
        adminRepository.deleteAll();
    }

    private String buildEventPayload(String title, String status) {
        return String.format("""
                {
                    "title": "%s",
                    "description": "Event description for testing",
                    "eventType": "HACKATHON",
                    "status": "%s",
                    "location": "Auditorium A",
                    "startDateTime": "%s",
                    "endDateTime": "%s",
                    "registrationDeadline": "%s",
                    "maxCapacity": 100,
                    "organizerName": "Tech Club",
                    "contactEmail": "tech@college.edu",
                    "whatsappNumber": "+919876543210",
                    "registrationUrl": "https://campuspulse.edu/register"
                }
                """, title, status, now.plusDays(5), now.plusDays(6), now.plusDays(2));
    }

    @Test
    @DisplayName("Coordinator Creation: Coordinator event is always created with status PENDING_REVIEW")
    void testCreateEvent_ByCoordinator_ForcesPendingReview() throws Exception {
        // Coordinator attempts to supply status PUBLISHED
        String payload = buildEventPayload("Hackathon by Coord A", "PUBLISHED");

        String respStr = mockMvc.perform(post("/api/events")
                        .header("Authorization", "Bearer " + coordAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("PENDING_REVIEW")))
                .andExpect(jsonPath("$.createdById", is(coordinatorA.getId().intValue())))
                .andReturn().getResponse().getContentAsString();

        Long eventId = objectMapper.readTree(respStr).get("id").asLong();
        Event saved = eventRepository.findById(eventId).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(EventStatus.PENDING_REVIEW);
        assertThat(saved.getCreatedBy().getId()).isEqualTo(coordinatorA.getId());
    }

    @Test
    @DisplayName("Regular User: Cannot create events (403 Forbidden)")
    void testCreateEvent_ByRegularUser_Returns403() throws Exception {
        String payload = buildEventPayload("Illegal Event", "PENDING_REVIEW");

        mockMvc.perform(post("/api/events")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Public Isolation: Anonymous user cannot view PENDING_REVIEW event directly (404 Not Found)")
    void testPublicAccess_PendingEvent_HiddenFromPublic() throws Exception {
        Event pendingEvent = new Event("Pending Hackathon", "Desc", EventType.HACKATHON, EventStatus.PENDING_REVIEW,
                "Auditorium", now.plusDays(5), now.plusDays(6), now.plusDays(2), 100, "Club", "club@college.edu", null, null);
        pendingEvent.setCreatedBy(coordinatorA);
        pendingEvent = eventRepository.saveAndFlush(pendingEvent);

        // 1. Not visible in public list
        mockMvc.perform(get("/api/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        // 2. Direct ID fetch returns 404
        mockMvc.perform(get("/api/events/" + pendingEvent.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Ownership Isolation: Coordinator A cannot edit Coordinator B's event (403 Forbidden)")
    void testOwnership_CoordinatorACannotEditCoordinatorBEvent() throws Exception {
        Event eventB = new Event("Event by Coord B", "Desc", EventType.HACKATHON, EventStatus.PENDING_REVIEW,
                "Auditorium", now.plusDays(5), now.plusDays(6), now.plusDays(2), 100, "Club B", "b@college.edu", null, null);
        eventB.setCreatedBy(coordinatorB);
        eventB = eventRepository.saveAndFlush(eventB);

        String updatePayload = buildEventPayload("Hacked Title", "PENDING_REVIEW");

        mockMvc.perform(put("/api/events/" + eventB.getId())
                        .header("Authorization", "Bearer " + coordAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatePayload))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)));
    }

    @Test
    @DisplayName("Ownership Isolation: Coordinator A cannot delete Coordinator B's event (403 Forbidden)")
    void testOwnership_CoordinatorACannotDeleteCoordinatorBEvent() throws Exception {
        Event eventB = new Event("Event by Coord B", "Desc", EventType.HACKATHON, EventStatus.PENDING_REVIEW,
                "Auditorium", now.plusDays(5), now.plusDays(6), now.plusDays(2), 100, "Club B", "b@college.edu", null, null);
        eventB.setCreatedBy(coordinatorB);
        eventB = eventRepository.saveAndFlush(eventB);

        mockMvc.perform(delete("/api/events/" + eventB.getId())
                        .header("Authorization", "Bearer " + coordAToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)));

        // Verify event was NOT deleted
        assertThat(eventRepository.existsById(eventB.getId())).isTrue();
    }

    @Test
    @DisplayName("Approval Workflow: Main Admin publishes pending event -> becomes publicly visible")
    void testAdminPublishEvent_BecomesPublic() throws Exception {
        Event event = new Event("Tech Symposium", "Desc", EventType.WORKSHOP, EventStatus.PENDING_REVIEW,
                "Hall A", now.plusDays(5), now.plusDays(6), now.plusDays(2), 50, "Club", "c@college.edu", null, null);
        event.setCreatedBy(coordinatorA);
        event = eventRepository.saveAndFlush(event);

        // 1. Admin publishes
        mockMvc.perform(post("/api/admin/events/" + event.getId() + "/publish")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"Looks great. Approved for publication.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("PUBLISHED")))
                .andExpect(jsonPath("$.reviewNote", is("Looks great. Approved for publication.")));

        // 2. Now public listing returns the published event
        mockMvc.perform(get("/api/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title", is("Tech Symposium")));
    }

    @Test
    @DisplayName("Review Cycle: Coordinator edits to published event revert it to PENDING_REVIEW")
    void testCoordinatorEditPublishedEvent_RevertsToPendingReview() throws Exception {
        Event event = new Event("Original Published Title", "Desc", EventType.HACKATHON, EventStatus.PUBLISHED,
                "Hall A", now.plusDays(5), now.plusDays(6), now.plusDays(2), 50, "Club", "c@college.edu", null, null);
        event.setCreatedBy(coordinatorA);
        event = eventRepository.saveAndFlush(event);

        // Coordinator updates event details
        String updatePayload = buildEventPayload("Modified Event Title", "PUBLISHED");

        mockMvc.perform(put("/api/events/" + event.getId())
                        .header("Authorization", "Bearer " + coordAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("PENDING_REVIEW")))
                .andExpect(jsonPath("$.title", is("Modified Event Title")));

        // Event is now hidden from public list until reviewed again by Main Admin
        mockMvc.perform(get("/api/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Admin Reject: Main Admin rejects event -> marked REJECTED with note")
    void testAdminRejectEvent_Success() throws Exception {
        Event event = new Event("Spam Event", "Desc", EventType.HACKATHON, EventStatus.PENDING_REVIEW,
                "Hall A", now.plusDays(5), now.plusDays(6), now.plusDays(2), 50, "Club", "c@college.edu", null, null);
        event.setCreatedBy(coordinatorA);
        event = eventRepository.saveAndFlush(event);

        mockMvc.perform(post("/api/admin/events/" + event.getId() + "/reject")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"Does not meet campus policy.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("REJECTED")))
                .andExpect(jsonPath("$.reviewNote", is("Does not meet campus policy.")));
    }

    @Test
    @DisplayName("Admin Delete: Main Admin can delete any coordinator's event")
    void testAdminDeleteEvent_Success() throws Exception {
        Event event = new Event("Event to Delete", "Desc", EventType.HACKATHON, EventStatus.PUBLISHED,
                "Hall A", now.plusDays(5), now.plusDays(6), now.plusDays(2), 50, "Club", "c@college.edu", null, null);
        event.setCreatedBy(coordinatorB);
        event = eventRepository.saveAndFlush(event);

        mockMvc.perform(delete("/api/admin/events/" + event.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        assertThat(eventRepository.existsById(event.getId())).isFalse();
    }
}
