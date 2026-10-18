package com.campuspulse.controller;

import com.campuspulse.dto.AdminProfileResponse;
import com.campuspulse.dto.CoordinatorRequestResponse;
import com.campuspulse.dto.CoordinatorRequestReviewDto;
import com.campuspulse.dto.EventResponse;
import com.campuspulse.entity.CoordinatorRequestStatus;
import com.campuspulse.entity.EventStatus;
import com.campuspulse.entity.EventType;
import com.campuspulse.exception.ConflictException;
import com.campuspulse.exception.ForbiddenException;
import com.campuspulse.exception.GlobalExceptionHandler;
import com.campuspulse.exception.ResourceNotFoundException;
import com.campuspulse.service.CoordinatorRequestService;
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

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web layer integration tests for {@link AdminController} using MockMvc.
 * Verifies event publishing governance, coordinator application review workflows,
 * coordinator privilege revocations, lifecycle state transition guards, and authentication enforcement.
 */
@WebMvcTest(controllers = AdminController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CoordinatorRequestService coordinatorRequestService;

    @MockitoBean
    private EventService eventService;

    private final Principal adminPrincipal = () -> "admin@campuspulse.edu";
    private final LocalDateTime testTime = LocalDateTime.of(2026, 10, 18, 12, 0);

    // -----------------------------------------------------------------------
    // Event Publishing & Governance Tests
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("POST /api/admin/events/{id}/publish: Successfully publishes an event with admin principal and review note")
    void testPublishEvent_Success() throws Exception {
        EventResponse response = new EventResponse();
        response.setId(10L);
        response.setTitle("AI Symposium 2026");
        response.setStatus(EventStatus.PUBLISHED);
        response.setReviewNote("Approved for campus exhibition");

        when(eventService.publishEvent(eq(10L), eq("admin@campuspulse.edu"), eq("Approved for campus exhibition")))
                .thenReturn(response);

        mockMvc.perform(post("/api/admin/events/10/publish")
                        .principal(adminPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("note", "Approved for campus exhibition"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(10)))
                .andExpect(jsonPath("$.title", is("AI Symposium 2026")))
                .andExpect(jsonPath("$.status", is("PUBLISHED")))
                .andExpect(jsonPath("$.reviewNote", is("Approved for campus exhibition")));

        verify(eventService).publishEvent(10L, "admin@campuspulse.edu", "Approved for campus exhibition");
    }

    @Test
    @DisplayName("POST /api/admin/events/{id}/publish: Returns 404 when event ID is not found")
    void testPublishEvent_NotFound() throws Exception {
        when(eventService.publishEvent(eq(999L), eq("admin@campuspulse.edu"), any()))
                .thenThrow(new ResourceNotFoundException("Event not found with id: 999"));

        mockMvc.perform(post("/api/admin/events/999/publish")
                        .principal(adminPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("note", "Approve"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", is("Event not found with id: 999")));
    }

    @Test
    @DisplayName("POST /api/admin/events/{id}/publish: Returns 401 when request is not authenticated")
    void testPublishEvent_Unauthenticated() throws Exception {
        mockMvc.perform(post("/api/admin/events/10/publish")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("note", "Approve"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/admin/events/{id}/reject: Successfully rejects an event submission with feedback note")
    void testRejectEvent_Success() throws Exception {
        EventResponse response = new EventResponse();
        response.setId(12L);
        response.setTitle("Late Night Jam");
        response.setStatus(EventStatus.REJECTED);
        response.setReviewNote("Venue safety clearance missing");

        when(eventService.rejectEvent(eq(12L), eq("admin@campuspulse.edu"), eq("Venue safety clearance missing")))
                .thenReturn(response);

        mockMvc.perform(post("/api/admin/events/12/reject")
                        .principal(adminPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("note", "Venue safety clearance missing"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(12)))
                .andExpect(jsonPath("$.status", is("REJECTED")))
                .andExpect(jsonPath("$.reviewNote", is("Venue safety clearance missing")));

        verify(eventService).rejectEvent(12L, "admin@campuspulse.edu", "Venue safety clearance missing");
    }

    @Test
    @DisplayName("POST /api/admin/events/{id}/reject: Returns 404 when event to reject does not exist")
    void testRejectEvent_NotFound() throws Exception {
        when(eventService.rejectEvent(eq(999L), eq("admin@campuspulse.edu"), any()))
                .thenThrow(new ResourceNotFoundException("Event not found with id: 999"));

        mockMvc.perform(post("/api/admin/events/999/reject")
                        .principal(adminPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("note", "Rejection reason"))))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/admin/events/{id}/reject: Returns 401 when rejecting event without authentication")
    void testRejectEvent_Unauthenticated() throws Exception {
        mockMvc.perform(post("/api/admin/events/12/reject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("note", "Reject"))))
                .andExpect(status().isUnauthorized());
    }

    // -----------------------------------------------------------------------
    // Coordinator Access Approval & Rejection Tests
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("POST /api/admin/coordinator-requests/{id}/approve: Approves request and elevates user")
    void testApproveCoordinatorRequest_Success() throws Exception {
        CoordinatorRequestReviewDto reviewDto = new CoordinatorRequestReviewDto("Verified club faculty endorsement");
        CoordinatorRequestResponse response = new CoordinatorRequestResponse(
                5L, 20L, "John Doe", "john@campus.edu", "Robotics Club",
                "President", "ext-404", CoordinatorRequestStatus.APPROVED,
                testTime.minusDays(2), testTime, "admin@campuspulse.edu",
                "Verified club faculty endorsement", testTime
        );

        when(coordinatorRequestService.approveRequest(eq(5L), eq("admin@campuspulse.edu"), any(CoordinatorRequestReviewDto.class)))
                .thenReturn(response);

        mockMvc.perform(post("/api/admin/coordinator-requests/5/approve")
                        .principal(adminPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(5)))
                .andExpect(jsonPath("$.status", is("APPROVED")))
                .andExpect(jsonPath("$.userEmail", is("john@campus.edu")))
                .andExpect(jsonPath("$.reviewNote", is("Verified club faculty endorsement")));
    }

    @Test
    @DisplayName("POST /api/admin/coordinator-requests/{id}/approve: Returns 409 Conflict on invalid state transition")
    void testApproveCoordinatorRequest_Conflict_AlreadyReviewed() throws Exception {
        CoordinatorRequestReviewDto reviewDto = new CoordinatorRequestReviewDto("Approve again");

        when(coordinatorRequestService.approveRequest(eq(5L), eq("admin@campuspulse.edu"), any()))
                .thenThrow(new ConflictException("Only PENDING requests can be approved. Current status: APPROVED"));

        mockMvc.perform(post("/api/admin/coordinator-requests/5/approve")
                        .principal(adminPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewDto)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", is("Only PENDING requests can be approved. Current status: APPROVED")));
    }

    @Test
    @DisplayName("POST /api/admin/coordinator-requests/{id}/approve: Returns 403 Forbidden when Main Admin tries self-approval")
    void testApproveCoordinatorRequest_Forbidden_SelfApproval() throws Exception {
        when(coordinatorRequestService.approveRequest(eq(5L), eq("admin@campuspulse.edu"), any()))
                .thenThrow(new ForbiddenException("Main Admin cannot approve their own coordinator request"));

        mockMvc.perform(post("/api/admin/coordinator-requests/5/approve")
                        .principal(adminPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CoordinatorRequestReviewDto("Self approve"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", is("Main Admin cannot approve their own coordinator request")));
    }

    @Test
    @DisplayName("POST /api/admin/coordinator-requests/{id}/approve: Returns 401 when unauthenticated")
    void testApproveCoordinatorRequest_Unauthenticated() throws Exception {
        mockMvc.perform(post("/api/admin/coordinator-requests/5/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CoordinatorRequestReviewDto("Approve"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/admin/coordinator-requests/{id}/reject: Rejects coordinator request with reason")
    void testRejectCoordinatorRequest_Success() throws Exception {
        CoordinatorRequestReviewDto reviewDto = new CoordinatorRequestReviewDto("Incomplete verification documentation");
        CoordinatorRequestResponse response = new CoordinatorRequestResponse(
                6L, 21L, "Jane Student", "jane@campus.edu", "Debate Society",
                "Member", null, CoordinatorRequestStatus.REJECTED,
                testTime.minusDays(1), testTime, "admin@campuspulse.edu",
                "Incomplete verification documentation", testTime
        );

        when(coordinatorRequestService.rejectRequest(eq(6L), eq("admin@campuspulse.edu"), any(CoordinatorRequestReviewDto.class)))
                .thenReturn(response);

        mockMvc.perform(post("/api/admin/coordinator-requests/6/reject")
                        .principal(adminPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(6)))
                .andExpect(jsonPath("$.status", is("REJECTED")))
                .andExpect(jsonPath("$.reviewNote", is("Incomplete verification documentation")));
    }

    @Test
    @DisplayName("POST /api/admin/coordinator-requests/{id}/reject: Returns 409 Conflict when request is not PENDING")
    void testRejectCoordinatorRequest_Conflict_NotPending() throws Exception {
        when(coordinatorRequestService.rejectRequest(eq(6L), eq("admin@campuspulse.edu"), any()))
                .thenThrow(new ConflictException("Only PENDING requests can be rejected. Current status: REJECTED"));

        mockMvc.perform(post("/api/admin/coordinator-requests/6/reject")
                        .principal(adminPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CoordinatorRequestReviewDto("Reject"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", is("Only PENDING requests can be rejected. Current status: REJECTED")));
    }

    @Test
    @DisplayName("POST /api/admin/coordinator-requests/{id}/reject: Returns 401 when unauthenticated")
    void testRejectCoordinatorRequest_Unauthenticated() throws Exception {
        mockMvc.perform(post("/api/admin/coordinator-requests/6/reject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CoordinatorRequestReviewDto("Reject"))))
                .andExpect(status().isUnauthorized());
    }

    // -----------------------------------------------------------------------
    // Coordinator Access Revocation Tests
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("POST /api/admin/coordinators/{id}/revoke: Revokes privileges and demotes user to ROLE_USER")
    void testRevokeCoordinator_Success() throws Exception {
        AdminProfileResponse response = new AdminProfileResponse(
                15L, "Former Coordinator", "former@campus.edu", "ROLE_USER",
                true, "REVOKED", testTime.minusMonths(3)
        );

        when(coordinatorRequestService.revokeCoordinator(eq(15L), eq("admin@campuspulse.edu"), eq("Graduated from institution")))
                .thenReturn(response);

        mockMvc.perform(post("/api/admin/coordinators/15/revoke")
                        .principal(adminPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("reason", "Graduated from institution"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(15)))
                .andExpect(jsonPath("$.role", is("ROLE_USER")))
                .andExpect(jsonPath("$.coordinatorRequestStatus", is("REVOKED")));

        verify(coordinatorRequestService).revokeCoordinator(15L, "admin@campuspulse.edu", "Graduated from institution");
    }

    @Test
    @DisplayName("POST /api/admin/coordinators/{id}/revoke: Returns 409 Conflict when target user is not a coordinator")
    void testRevokeCoordinator_Conflict_NotCoordinator() throws Exception {
        when(coordinatorRequestService.revokeCoordinator(eq(15L), eq("admin@campuspulse.edu"), any()))
                .thenThrow(new ConflictException("User is not an active coordinator"));

        mockMvc.perform(post("/api/admin/coordinators/15/revoke")
                        .principal(adminPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("reason", "Not a coordinator"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", is("User is not an active coordinator")));
    }

    @Test
    @DisplayName("POST /api/admin/coordinators/{id}/revoke: Returns 404 when target user is not found")
    void testRevokeCoordinator_NotFound() throws Exception {
        when(coordinatorRequestService.revokeCoordinator(eq(999L), eq("admin@campuspulse.edu"), any()))
                .thenThrow(new ResourceNotFoundException("User not found with ID: 999"));

        mockMvc.perform(post("/api/admin/coordinators/999/revoke")
                        .principal(adminPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("reason", "Revoke"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", is("User not found with ID: 999")));
    }

    @Test
    @DisplayName("POST /api/admin/coordinators/{id}/revoke: Returns 401 when unauthenticated")
    void testRevokeCoordinator_Unauthenticated() throws Exception {
        mockMvc.perform(post("/api/admin/coordinators/15/revoke")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("reason", "Revoke"))))
                .andExpect(status().isUnauthorized());
    }

    // -----------------------------------------------------------------------
    // Overview Queries & Event Deletion
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("GET /api/admin/events: Retrieves all events regardless of status for admin overview")
    void testGetAllEvents_Success() throws Exception {
        EventResponse e1 = new EventResponse();
        e1.setId(1L);
        e1.setTitle("Published Event");
        e1.setStatus(EventStatus.PUBLISHED);

        EventResponse e2 = new EventResponse();
        e2.setId(2L);
        e2.setTitle("Pending Event");
        e2.setStatus(EventStatus.PENDING_REVIEW);

        when(eventService.getAllEventsAdmin()).thenReturn(List.of(e1, e2));

        mockMvc.perform(get("/api/admin/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].title", is("Published Event")))
                .andExpect(jsonPath("$[1].status", is("PENDING_REVIEW")));
    }

    @Test
    @DisplayName("GET /api/admin/coordinator-requests: Retrieves requests filtered by status")
    void testGetCoordinatorRequests_Filtered() throws Exception {
        CoordinatorRequestResponse r1 = new CoordinatorRequestResponse();
        r1.setId(10L);
        r1.setStatus(CoordinatorRequestStatus.PENDING);

        when(coordinatorRequestService.getRequests(eq(CoordinatorRequestStatus.PENDING)))
                .thenReturn(List.of(r1));

        mockMvc.perform(get("/api/admin/coordinator-requests")
                        .param("status", "PENDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(10)))
                .andExpect(jsonPath("$[0].status", is("PENDING")));
    }

    @Test
    @DisplayName("GET /api/admin/coordinator-requests/{id}: Retrieves single request by ID")
    void testGetCoordinatorRequestById_Success() throws Exception {
        CoordinatorRequestResponse r1 = new CoordinatorRequestResponse();
        r1.setId(5L);
        r1.setUserEmail("applicant@campus.edu");
        r1.setStatus(CoordinatorRequestStatus.PENDING);

        when(coordinatorRequestService.getRequestById(5L)).thenReturn(r1);

        mockMvc.perform(get("/api/admin/coordinator-requests/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(5)))
                .andExpect(jsonPath("$.userEmail", is("applicant@campus.edu")));
    }

    @Test
    @DisplayName("GET /api/admin/coordinator-requests/{id}: Returns 404 when request does not exist")
    void testGetCoordinatorRequestById_NotFound() throws Exception {
        when(coordinatorRequestService.getRequestById(999L))
                .thenThrow(new ResourceNotFoundException("Coordinator request not found with ID: 999"));

        mockMvc.perform(get("/api/admin/coordinator-requests/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", is("Coordinator request not found with ID: 999")));
    }

    @Test
    @DisplayName("GET /api/admin/coordinators: Lists all active coordinators")
    void testGetCoordinators_Success() throws Exception {
        AdminProfileResponse p1 = new AdminProfileResponse(1L, "Coord One", "coord1@campus.edu", "ROLE_COORDINATOR", true, "APPROVED", testTime);
        AdminProfileResponse p2 = new AdminProfileResponse(2L, "Coord Two", "coord2@campus.edu", "ROLE_COORDINATOR", true, "APPROVED", testTime);

        when(coordinatorRequestService.getAllCoordinators()).thenReturn(List.of(p1, p2));

        mockMvc.perform(get("/api/admin/coordinators"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].email", is("coord1@campus.edu")))
                .andExpect(jsonPath("$[1].email", is("coord2@campus.edu")));
    }

    @Test
    @DisplayName("DELETE /api/admin/events/{id}: Main admin deletes an event successfully returning 204 No Content")
    void testDeleteEvent_Success() throws Exception {
        doNothing().when(eventService).deleteEventWithPrincipal(eq(42L), eq("admin@campuspulse.edu"));

        mockMvc.perform(delete("/api/admin/events/42")
                        .principal(adminPrincipal))
                .andExpect(status().isNoContent());

        verify(eventService).deleteEventWithPrincipal(42L, "admin@campuspulse.edu");
    }

    @Test
    @DisplayName("DELETE /api/admin/events/{id}: Returns 401 when deleting event unauthenticated")
    void testDeleteEvent_Unauthenticated() throws Exception {
        mockMvc.perform(delete("/api/admin/events/42"))
                .andExpect(status().isUnauthorized());
    }
}
