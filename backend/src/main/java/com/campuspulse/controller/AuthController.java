package com.campuspulse.controller;

import com.campuspulse.dto.AdminLoginRequest;
import com.campuspulse.dto.AdminLoginResponse;
import com.campuspulse.dto.AdminProfileResponse;
import com.campuspulse.dto.RegisterRequest;
import com.campuspulse.service.AuthService;
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
 * Controller exposing authentication, registration, and account profile endpoints for CampusPulse.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * POST /api/auth/register - Registers a new regular user account (always ROLE_USER).
     *
     * @param request user registration details
     * @return 201 Created with safe user profile response
     */
    @PostMapping("/register")
    public ResponseEntity<AdminProfileResponse> register(@Valid @RequestBody RegisterRequest request) {
        AdminProfileResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * POST /api/auth/login - Authenticates a user/admin and returns a JWT access token.
     *
     * @param request credentials (email and password)
     * @return 200 OK with AdminLoginResponse containing JWT token
     */
    @PostMapping("/login")
    public ResponseEntity<AdminLoginResponse> login(@Valid @RequestBody AdminLoginRequest request) {
        AdminLoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/auth/me - Returns safe profile information for the currently authenticated account.
     *
     * @param principal current security principal
     * @return 200 OK with AdminProfileResponse
     */
    @GetMapping("/me")
    public ResponseEntity<AdminProfileResponse> getCurrentAdmin(Principal principal) {
        if (principal == null || principal.getName() == null) {
            throw new BadCredentialsException("Not authenticated");
        }
        AdminProfileResponse profile = authService.getCurrentAdmin(principal.getName());
        return ResponseEntity.ok(profile);
    }
}
