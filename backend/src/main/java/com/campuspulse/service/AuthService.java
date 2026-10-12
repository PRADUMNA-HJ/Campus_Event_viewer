package com.campuspulse.service;

import com.campuspulse.dto.AdminLoginRequest;
import com.campuspulse.dto.AdminLoginResponse;
import com.campuspulse.dto.AdminProfileResponse;
import com.campuspulse.dto.RegisterRequest;
import com.campuspulse.entity.Admin;
import com.campuspulse.entity.CoordinatorRequest;
import com.campuspulse.entity.Role;
import com.campuspulse.exception.ConflictException;
import com.campuspulse.repository.AdminRepository;
import com.campuspulse.repository.CoordinatorRequestRepository;
import com.campuspulse.security.JwtService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Service managing user authentication, registration, and profile retrieval.
 * Verifies credentials, enforces role assignment rules, and issues JWT access tokens.
 */
@Service
public class AuthService {

    private final AdminRepository adminRepository;
    private final CoordinatorRequestRepository coordinatorRequestRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditLogService auditLogService;

    public AuthService(AdminRepository adminRepository,
                       CoordinatorRequestRepository coordinatorRequestRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AuditLogService auditLogService) {
        this.adminRepository = adminRepository;
        this.coordinatorRequestRepository = coordinatorRequestRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.auditLogService = auditLogService;
    }

    /**
     * Registers a new regular user account with ROLE_USER.
     * Prevents self-assignment of privileged roles.
     *
     * @param request the registration details
     * @return safe profile response of the created user
     */
    @Transactional
    public AdminProfileResponse register(RegisterRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        if (adminRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("Email is already registered");
        }

        Admin user = new Admin();
        user.setName(request.getName() != null ? request.getName().trim() : null);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.USER);
        user.setEnabled(true);

        Admin saved = adminRepository.save(user);

        auditLogService.logAction(
                email,
                "USER_REGISTERED",
                "ACCOUNT",
                saved.getId(),
                "Registered new user account with role " + saved.getRole().name()
        );

        return new AdminProfileResponse(
                saved.getId(),
                saved.getName(),
                saved.getEmail(),
                saved.getRole().name(),
                saved.isEnabled(),
                null,
                saved.getCreatedAt()
        );
    }

    /**
     * Authenticates an administrator or user using email and password.
     * Rejects invalid credentials or disabled accounts.
     *
     * @param request the login credentials
     * @return {@link AdminLoginResponse} containing the generated JWT and token metadata
     * @throws BadCredentialsException if the email is not found, password does not match, or account is disabled
     */
    @Transactional(readOnly = true)
    public AdminLoginResponse login(AdminLoginRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim() : "";
        String rawPassword = request.getPassword() != null ? request.getPassword() : "";

        Admin admin = adminRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!admin.isEnabled()) {
            throw new BadCredentialsException("Account is disabled");
        }

        if (!passwordEncoder.matches(rawPassword, admin.getPassword())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        String role = admin.getRole() != null ? admin.getRole().name() : "USER";
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
     * Retrieves safe profile details for the currently authenticated account.
     *
     * @param email the authenticated user's email
     * @return {@link AdminProfileResponse} containing non-sensitive profile information
     */
    @Transactional(readOnly = true)
    public AdminProfileResponse getCurrentAdmin(String email) {
        if (email == null || email.isBlank()) {
            throw new BadCredentialsException("Not authenticated");
        }

        Admin admin = adminRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new BadCredentialsException("Admin account not found"));

        if (!admin.isEnabled()) {
            throw new BadCredentialsException("Account is disabled");
        }

        String role = admin.getRole() != null ? admin.getRole().name() : "USER";

        Optional<CoordinatorRequest> latestReq = coordinatorRequestRepository.findTopByUserOrderByRequestedAtDesc(admin);
        String reqStatus = latestReq.map(r -> r.getStatus().name()).orElse(null);

        return new AdminProfileResponse(
                admin.getId(),
                admin.getName(),
                admin.getEmail(),
                role,
                admin.isEnabled(),
                reqStatus,
                admin.getCreatedAt()
        );
    }
}
