package com.campuspulse.controller;

import com.campuspulse.dto.AdminProfileResponse;
import com.campuspulse.dto.CoordinatorRequestResponse;
import com.campuspulse.dto.CoordinatorRequestReviewDto;
import com.campuspulse.dto.EventResponse;
import com.campuspulse.entity.CoordinatorRequestStatus;
import com.campuspulse.service.CoordinatorRequestService;
import com.campuspulse.service.EventService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.Map;

/**
 * REST controller reserved exclusively for the designated Main Admin.
 * Handles coordinator applications, approvals, revocations, and event publishing governance.
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('MAIN_ADMIN', 'ADMIN')")
public class AdminController {

    private final CoordinatorRequestService coordinatorRequestService;
    private final EventService eventService;

    public AdminController(CoordinatorRequestService coordinatorRequestService,
                           EventService eventService) {
        this.coordinatorRequestService = coordinatorRequestService;
        this.eventService = eventService;
    }

    /**
     * GET /api/admin/coordinator-requests?status=PENDING - List coordinator requests filtered by status.
     */
    @GetMapping("/coordinator-requests")
    public ResponseEntity<List<CoordinatorRequestResponse>> getCoordinatorRequests(
            @RequestParam(required = false) CoordinatorRequestStatus status) {
        return ResponseEntity.ok(coordinatorRequestService.getRequests(status));
    }

    /**
     * GET /api/admin/coordinator-requests/{id} - Get a specific coordinator request.
     */
    @GetMapping("/coordinator-requests/{id}")
    public ResponseEntity<CoordinatorRequestResponse> getCoordinatorRequestById(@PathVariable Long id) {
        return ResponseEntity.ok(coordinatorRequestService.getRequestById(id));
    }

    /**
     * POST /api/admin/coordinator-requests/{id}/approve - Approves a coordinator request.
     */
    @PostMapping("/coordinator-requests/{id}/approve")
    public ResponseEntity<CoordinatorRequestResponse> approveCoordinatorRequest(
            @PathVariable Long id,
            @RequestBody(required = false) CoordinatorRequestReviewDto reviewDto,
            Principal principal) {
        String adminEmail = getAuthenticatedEmail(principal);
        CoordinatorRequestResponse response = coordinatorRequestService.approveRequest(id, adminEmail, reviewDto);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/admin/coordinator-requests/{id}/reject - Rejects a coordinator request.
     */
    @PostMapping("/coordinator-requests/{id}/reject")
    public ResponseEntity<CoordinatorRequestResponse> rejectCoordinatorRequest(
            @PathVariable Long id,
            @RequestBody(required = false) CoordinatorRequestReviewDto reviewDto,
            Principal principal) {
        String adminEmail = getAuthenticatedEmail(principal);
        CoordinatorRequestResponse response = coordinatorRequestService.rejectRequest(id, adminEmail, reviewDto);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/admin/coordinators/{id}/revoke - Revokes coordinator privileges from a user.
     */
    @PostMapping("/coordinators/{id}/revoke")
    public ResponseEntity<AdminProfileResponse> revokeCoordinator(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Principal principal) {
        String adminEmail = getAuthenticatedEmail(principal);
        String reason = body != null ? body.get("reason") : null;
        AdminProfileResponse response = coordinatorRequestService.revokeCoordinator(id, adminEmail, reason);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/admin/coordinators - List all active coordinators.
     */
    @GetMapping("/coordinators")
    public ResponseEntity<List<AdminProfileResponse>> getCoordinators() {
        return ResponseEntity.ok(coordinatorRequestService.getAllCoordinators());
    }

    /**
     * GET /api/admin/events - List all events across all lifecycle statuses.
     */
    @GetMapping("/events")
    public ResponseEntity<List<EventResponse>> getAllEvents() {
        return ResponseEntity.ok(eventService.getAllEventsAdmin());
    }

    /**
     * POST /api/admin/events/{id}/publish - Publishes an event submission.
     */
    @PostMapping("/events/{id}/publish")
    public ResponseEntity<EventResponse> publishEvent(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Principal principal) {
        String adminEmail = getAuthenticatedEmail(principal);
        String note = body != null ? body.get("note") : null;
        EventResponse response = eventService.publishEvent(id, adminEmail, note);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/admin/events/{id}/reject - Rejects an event submission.
     */
    @PostMapping("/events/{id}/reject")
    public ResponseEntity<EventResponse> rejectEvent(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Principal principal) {
        String adminEmail = getAuthenticatedEmail(principal);
        String note = body != null ? body.get("note") : null;
        EventResponse response = eventService.rejectEvent(id, adminEmail, note);
        return ResponseEntity.ok(response);
    }

    /**
     * DELETE /api/admin/events/{id} - Main Admin deletes any event.
     */
    @DeleteMapping("/events/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id, Principal principal) {
        String adminEmail = getAuthenticatedEmail(principal);
        eventService.deleteEventWithPrincipal(id, adminEmail);
        return ResponseEntity.noContent().build();
    }

    private String getAuthenticatedEmail(Principal principal) {
        if (principal == null || principal.getName() == null) {
            throw new BadCredentialsException("Not authenticated");
        }
        return principal.getName();
    }
}
