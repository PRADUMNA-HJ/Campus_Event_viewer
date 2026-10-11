package com.campuspulse.service;

import com.campuspulse.dto.AdminLoginRequest;
import com.campuspulse.dto.AdminLoginResponse;
import com.campuspulse.dto.AdminProfileResponse;
import com.campuspulse.entity.Admin;
import com.campuspulse.repository.AdminRepository;
import com.campuspulse.security.JwtService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service managing administrator authentication.
 * Verifies credentials against persisted Admin records and issues JWT access tokens.
 */
@Service
public class AuthService {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(AdminRepository adminRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    /**
     * Authenticates an administrator using email and password.
     * Rejects invalid credentials with a uniform generic error message to prevent user enumeration.
     *
     * @param request the login credentials
     * @return {@link AdminLoginResponse} containing the generated JWT and token metadata
     * @throws BadCredentialsException if the email is not found or the password does not match
     */
    @Transactional(readOnly = true)
    public AdminLoginResponse login(AdminLoginRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim() : "";
        String rawPassword = request.getPassword() != null ? request.getPassword() : "";

        Admin admin = adminRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(rawPassword, admin.getPassword())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        String role = admin.getRole() != null ? admin.getRole().name() : "ADMIN";
        String token = jwtService.generateToken(admin.getEmail(), role);

        return new AdminLoginResponse(
                token,
                "Bearer",
                jwtService.getExpirationMs(),
                admin.getEmail(),
                role
        );
    }

    /**
     * Retrieves safe profile details for the currently authenticated administrator.
     *
     * @param email the authenticated administrator's email
     * @return {@link AdminProfileResponse} containing non-sensitive profile information
     */
    @Transactional(readOnly = true)
    public AdminProfileResponse getCurrentAdmin(String email) {
        if (email == null || email.isBlank()) {
            throw new BadCredentialsException("Not authenticated");
        }

        Admin admin = adminRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new BadCredentialsException("Admin account not found"));

        String role = admin.getRole() != null ? admin.getRole().name() : "ADMIN";
        return new AdminProfileResponse(admin.getId(), admin.getEmail(), role, admin.getCreatedAt());
    }
}
