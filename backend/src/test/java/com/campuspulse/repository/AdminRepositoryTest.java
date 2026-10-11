package com.campuspulse.repository;

import com.campuspulse.entity.Admin;
import com.campuspulse.entity.Role;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests for {@link AdminRepository} using the test database.
 * Verifies persistence, unique email constraints, query methods, and lifecycle callbacks.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class AdminRepositoryTest {

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private TestEntityManager entityManager;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private Admin createSampleAdmin(String email, String rawPassword) {
        String hashedPassword = passwordEncoder.encode(rawPassword);
        return new Admin(email, hashedPassword, Role.ADMIN);
    }

    @BeforeEach
    void setUp() {
        adminRepository.deleteAll();
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @DisplayName("Should persist and retrieve an Admin record with encrypted password")
    void testSaveAndRetrieveAdmin() {
        String rawPassword = "AdminSecretPassword!2026";
        Admin admin = createSampleAdmin("lead.admin@college.edu", rawPassword);

        Admin saved = adminRepository.saveAndFlush(admin);
        entityManager.clear();

        Optional<Admin> retrieved = adminRepository.findById(saved.getId());

        assertThat(retrieved).isPresent();
        assertThat(retrieved.get().getId()).isNotNull().isPositive();
        assertThat(retrieved.get().getEmail()).isEqualTo("lead.admin@college.edu");
        assertThat(retrieved.get().getRole()).isEqualTo(Role.ADMIN);
        assertThat(retrieved.get().getCreatedAt()).isNotNull();
        assertThat(retrieved.get().getUpdatedAt()).isNotNull();

        // Verify password is stored as hash, not plaintext
        assertThat(retrieved.get().getPassword()).isNotEqualTo(rawPassword);
        assertThat(passwordEncoder.matches(rawPassword, retrieved.get().getPassword())).isTrue();
    }

    @Test
    @DisplayName("Should find an Admin by exact email")
    void testFindByEmail() {
        Admin admin = createSampleAdmin("organizer.admin@college.edu", "Secret!123");
        entityManager.persistAndFlush(admin);
        entityManager.clear();

        Optional<Admin> found = adminRepository.findByEmail("organizer.admin@college.edu");

        assertThat(found).isPresent();
        assertThat(found.get().getEmail()).isEqualTo("organizer.admin@college.edu");
    }

    @Test
    @DisplayName("Should find an Admin by email ignoring case")
    void testFindByEmailIgnoreCase() {
        Admin admin = createSampleAdmin("CaseSensitive.Admin@College.Edu", "Secret!123");
        entityManager.persistAndFlush(admin);
        entityManager.clear();

        Optional<Admin> found = adminRepository.findByEmailIgnoreCase("casesensitive.admin@college.edu");

        assertThat(found).isPresent();
        assertThat(found.get().getEmail()).isEqualTo("CaseSensitive.Admin@College.Edu");
    }

    @Test
    @DisplayName("Should return empty Optional when email is not found")
    void testFindByEmail_NotFound() {
        Optional<Admin> found = adminRepository.findByEmail("nonexistent@college.edu");

        assertThat(found).isEmpty();
    }

    @Test
    @DisplayName("Should check existence by email and email ignoring case")
    void testExistsByEmail() {
        Admin admin = createSampleAdmin("exists.check@college.edu", "Secret!123");
        entityManager.persistAndFlush(admin);
        entityManager.clear();

        assertThat(adminRepository.existsByEmail("exists.check@college.edu")).isTrue();
        assertThat(adminRepository.existsByEmail("nonexistent@college.edu")).isFalse();
        assertThat(adminRepository.existsByEmailIgnoreCase("EXISTS.CHECK@COLLEGE.EDU")).isTrue();
    }

    @Test
    @DisplayName("Should reject duplicate email due to unique database constraint")
    void testDuplicateEmailRejectedByDatabaseConstraint() {
        Admin admin1 = createSampleAdmin("duplicate@college.edu", "Pass1!234");
        entityManager.persistAndFlush(admin1);

        Admin admin2 = createSampleAdmin("duplicate@college.edu", "Pass2!567");

        assertThatThrownBy(() -> {
            adminRepository.saveAndFlush(admin2);
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("Should automatically apply default Role.ADMIN and audit timestamps via @PrePersist")
    void testPrePersistDefaults() {
        Admin admin = new Admin();
        admin.setEmail("default.role@college.edu");
        admin.setPassword(passwordEncoder.encode("Secret!123"));
        admin.setRole(null); // Explicitly null to test pre-persist fallback

        Admin saved = adminRepository.saveAndFlush(admin);
        entityManager.clear();

        Admin retrieved = adminRepository.findById(saved.getId()).orElseThrow();

        assertThat(retrieved.getRole()).isEqualTo(Role.ADMIN);
        assertThat(retrieved.getCreatedAt()).isNotNull();
        assertThat(retrieved.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("Should update updatedAt timestamp on entity modification via @PreUpdate")
    void testPreUpdate_UpdatesTimestamp() throws InterruptedException {
        Admin admin = createSampleAdmin("update.test@college.edu", "Secret!123");
        Admin saved = adminRepository.saveAndFlush(admin);
        entityManager.clear();

        Admin loaded = adminRepository.findById(saved.getId()).orElseThrow();
        LocalDateTime initialUpdatedAt = loaded.getUpdatedAt();

        Thread.sleep(25); // Ensure time advances

        loaded.setPassword(passwordEncoder.encode("NewSecret!456"));
        Admin updated = adminRepository.saveAndFlush(loaded);
        entityManager.clear();

        Admin reloaded = adminRepository.findById(updated.getId()).orElseThrow();

        assertThat(reloaded.getUpdatedAt()).isAfter(initialUpdatedAt);
    }

    @Test
    @DisplayName("Should fail bean validation when email format is invalid")
    void testValidation_InvalidEmail_ThrowsException() {
        Admin admin = new Admin("not-a-valid-email", passwordEncoder.encode("Secret!123"), Role.ADMIN);

        assertThatThrownBy(() -> entityManager.persistAndFlush(admin))
                .isInstanceOf(ConstraintViolationException.class)
                .hasMessageContaining("Admin email must be a valid email address");
    }

    @Test
    @DisplayName("Should fail bean validation when email is blank")
    void testValidation_BlankEmail_ThrowsException() {
        Admin admin = new Admin("", passwordEncoder.encode("Secret!123"), Role.ADMIN);

        assertThatThrownBy(() -> entityManager.persistAndFlush(admin))
                .isInstanceOf(ConstraintViolationException.class)
                .hasMessageContaining("Admin email is required");
    }

    @Test
    @DisplayName("Should fail bean validation when password hash is blank")
    void testValidation_BlankPassword_ThrowsException() {
        Admin admin = new Admin("valid@college.edu", "", Role.ADMIN);

        assertThatThrownBy(() -> entityManager.persistAndFlush(admin))
                .isInstanceOf(ConstraintViolationException.class)
                .hasMessageContaining("Password hash is required");
    }
}
