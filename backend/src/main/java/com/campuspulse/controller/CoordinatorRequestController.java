package com.campuspulse.controller;

import com.campuspulse.dto.CoordinatorRequestCreateDto;
import com.campuspulse.dto.CoordinatorRequestResponse;
import com.campuspulse.service.CoordinatorRequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

/**
 * Controller allowing regular authenticated users to submit and view coordinator requests.
 */
@RestController
@RequestMapping("/api/coordinator-requests")
public class CoordinatorRequestController {

    private final CoordinatorRequestService coordinatorRequestService;

    public CoordinatorRequestController(CoordinatorRequestService coordinatorRequestService) {
        this.coordinatorRequestService = coordinatorRequestService;
    }

    /**
     * POST /api/coordinator-requests - Submits a coordinator request on behalf of the current user.
     */
    @PostMapping
    public ResponseEntity<CoordinatorRequestResponse> submitRequest(@Valid @RequestBody CoordinatorRequestCreateDto dto,
                                                                    Principal principal) {
        if (principal == null || principal.getName() == null) {
            throw new BadCredentialsException("Not authenticated");
        }
        CoordinatorRequestResponse response = coordinatorRequestService.submitRequest(principal.getName(), dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/coordinator-requests/me - Retrieves the authenticated user's latest coordinator request.
     */
    @GetMapping("/me")
    public ResponseEntity<CoordinatorRequestResponse> getMyRequest(Principal principal) {
        if (principal == null || principal.getName() == null) {
            throw new BadCredentialsException("Not authenticated");
        }
        CoordinatorRequestResponse response = coordinatorRequestService.getMyLatestRequest(principal.getName());
        return ResponseEntity.ok(response);
    }
}
