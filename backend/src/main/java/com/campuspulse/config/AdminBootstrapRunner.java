package com.campuspulse.config;

import com.campuspulse.entity.Admin;
import com.campuspulse.entity.Role;
import com.campuspulse.repository.AdminRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Idempotent application startup runner that safely bootstraps the initial designated Main Admin account.
 * Reads credentials strictly from environment/configuration properties (e.g. CAMPUSPULSE_ADMIN_*).
 * Enforces the single-Main-Admin policy and will never overwrite existing credentials,
 * silently promote ordinary accounts, or print credentials in logs.
 */
@Component
public class AdminBootstrapRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapRunner.class);

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final String bootstrapEmail;
    private final String bootstrapPassword;

    public AdminBootstrapRunner(AdminRepository adminRepository,
                                PasswordEncoder passwordEncoder,
                                @Value("${app.admin.bootstrap.email:}") String bootstrapEmail,
                                @Value("${app.admin.bootstrap.password:}") String bootstrapPassword) {
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
        this.bootstrapEmail = bootstrapEmail;
        this.bootstrapPassword = bootstrapPassword;
    }

    @Override
    public void run(String... args) {
        if (bootstrapEmail == null || bootstrapEmail.isBlank() ||
                bootstrapPassword == null || bootstrapPassword.isBlank()) {
            log.info("Main Admin bootstrap credentials not configured in environment (CAMPUSPULSE_ADMIN_EMAIL / CAMPUSPULSE_ADMIN_PASSWORD). Skipping initial Main Admin seeding.");
            return;
        }

        String email = bootstrapEmail.trim().toLowerCase();

        // Enforce single Main Admin policy
        long mainAdminCount = adminRepository.countByRoleIn(List.of(Role.MAIN_ADMIN, Role.ADMIN));
        if (mainAdminCount > 0) {
            log.info("A designated Main Admin account already exists (single Main Admin policy). Skipping bootstrap to preserve existing setup.");
            return;
        }

        // Do not silently promote an existing account
        if (adminRepository.existsByEmailIgnoreCase(email)) {
            log.warn("Account [{}] already exists with non-admin privileges. Will not silently promote an existing account to Main Admin.", email);
            return;
        }

        String hashedPassword = passwordEncoder.encode(bootstrapPassword);
        Admin admin = new Admin();
        admin.setName("Main Administrator");
        admin.setEmail(email);
        admin.setPassword(hashedPassword);
        admin.setRole(Role.ADMIN);
        admin.setEnabled(true);

        adminRepository.save(admin);
        log.info("Successfully bootstrapped initial designated Main Admin account: [{}]", email);
    }
}
