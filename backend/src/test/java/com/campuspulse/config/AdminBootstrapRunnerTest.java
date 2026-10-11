package com.campuspulse.config;

import com.campuspulse.entity.Admin;
import com.campuspulse.entity.Role;
import com.campuspulse.repository.AdminRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests verifying the initial administrator account bootstrap behavior.
 * Confirms single creation, idempotency, password hashing, and safe skipping on missing properties.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class AdminBootstrapRunnerTest {

    @Autowired
    private AdminRepository adminRepository;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @BeforeEach
    void setUp() {
        adminRepository.deleteAll();
    }

    @Test
    @DisplayName("Should create the initial admin account when configuration is complete and account does not exist")
    void testBootstrap_CreatesAdminWhenConfiguredAndNotPresent() {
        String email = "bootstrap.admin@college.edu";
        String rawPassword = "BootstrapSecurePassword!2026";

        AdminBootstrapRunner runner = new AdminBootstrapRunner(adminRepository, passwordEncoder, email, rawPassword);
        runner.run();

        Optional<Admin> created = adminRepository.findByEmailIgnoreCase(email);
        assertThat(created).isPresent();
        assertThat(created.get().getEmail()).isEqualTo(email);
        assertThat(created.get().getRole()).isEqualTo(Role.ADMIN);
        assertThat(created.get().getPassword()).isNotEqualTo(rawPassword);
        assertThat(passwordEncoder.matches(rawPassword, created.get().getPassword())).isTrue();
    }

    @Test
    @DisplayName("Should not overwrite existing admin password or create duplicates on application restart")
    void testBootstrap_Idempotent_DoesNotOverwriteExistingAdmin() {
        String email = "existing.admin@college.edu";
        String originalPassword = "OriginalPassword!123";

        // Seed initial admin with original password
        Admin existingAdmin = new Admin(email, passwordEncoder.encode(originalPassword), Role.ADMIN);
        adminRepository.saveAndFlush(existingAdmin);

        String originalHash = existingAdmin.getPassword();

        // Run bootstrap runner with the same email but attempting to supply a different password
        String newAttemptedPassword = "DifferentPassword!456";
        AdminBootstrapRunner runner = new AdminBootstrapRunner(adminRepository, passwordEncoder, email, newAttemptedPassword);
        runner.run();

        Admin preservedAdmin = adminRepository.findByEmailIgnoreCase(email).orElseThrow();

        // Password hash must be identical to original
        assertThat(preservedAdmin.getPassword()).isEqualTo(originalHash);
        assertThat(passwordEncoder.matches(originalPassword, preservedAdmin.getPassword())).isTrue();
        assertThat(passwordEncoder.matches(newAttemptedPassword, preservedAdmin.getPassword())).isFalse();
        assertThat(adminRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("Should skip bootstrap safely when email or password is missing or blank")
    void testBootstrap_SkipsWhenCredentialsMissingOrBlank() {
        AdminBootstrapRunner missingBoth = new AdminBootstrapRunner(adminRepository, passwordEncoder, "", "");
        missingBoth.run();
        assertThat(adminRepository.count()).isZero();

        AdminBootstrapRunner missingPassword = new AdminBootstrapRunner(adminRepository, passwordEncoder, "admin@college.edu", "   ");
        missingPassword.run();
        assertThat(adminRepository.count()).isZero();

        AdminBootstrapRunner missingEmail = new AdminBootstrapRunner(adminRepository, passwordEncoder, "   ", "Password123!");
        missingEmail.run();
        assertThat(adminRepository.count()).isZero();
    }
}
