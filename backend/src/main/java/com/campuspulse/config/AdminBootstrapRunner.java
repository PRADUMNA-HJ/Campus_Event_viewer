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

/**
 * Idempotent application startup runner that safely bootstraps the initial administrator account.
 * Reads credentials strictly from environment/configuration properties.
 * Will not overwrite existing administrator accounts or passwords on restart.
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
            log.info("Admin bootstrap credentials not provided in environment (ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD). Skipping initial admin seeding.");
            return;
        }

        String email = bootstrapEmail.trim();

        if (adminRepository.existsByEmailIgnoreCase(email)) {
            log.info("Admin account [{}] already exists. Skipping bootstrap to preserve existing credentials.", email);
            return;
        }

        String hashedPassword = passwordEncoder.encode(bootstrapPassword);
        Admin admin = new Admin(email, hashedPassword, Role.ADMIN);
        adminRepository.save(admin);
        log.info("Successfully bootstrapped initial administrator account: [{}]", email);
    }
}
