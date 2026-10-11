package com.campuspulse.controller;

import com.campuspulse.dto.AdminLoginRequest;
import com.campuspulse.dto.AdminLoginResponse;
import com.campuspulse.dto.AdminProfileResponse;
import com.campuspulse.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

/**
 * Controller exposing authentication and administrator profile endpoints for CampusPulse.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * POST /api/auth/login - Authenticates an administrator and returns a JWT access token.
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
     * GET /api/auth/me - Returns safe profile information for the currently authenticated administrator.
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
