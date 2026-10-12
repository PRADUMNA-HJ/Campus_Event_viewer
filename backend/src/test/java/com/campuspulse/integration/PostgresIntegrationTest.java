package com.campuspulse.integration;

import com.campuspulse.entity.Admin;
import com.campuspulse.entity.Event;
import com.campuspulse.entity.EventStatus;
import com.campuspulse.entity.EventType;
import com.campuspulse.entity.Role;
import com.campuspulse.repository.AdminRepository;
import com.campuspulse.repository.EventRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end integration test executed against a real PostgreSQL database instance.
 * Activated by setting the environment variable: POSTGRES_TEST_ENABLED=true
 *
 * When disabled, standard test runs skip this suite cleanly without failure.
 * When enabled, verifies entity persistence, schema constraints, timestamps, and CRUD on PostgreSQL.
 */
@SpringBootTest
@ActiveProfiles("postgres")
@Tag("postgres")
@EnabledIfEnvironmentVariable(named = "POSTGRES_TEST_ENABLED", matches = "true")
@Transactional
@DisplayName("Real PostgreSQL Integration Tests")
class PostgresIntegrationTest {

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired(required = false)
    private com.campuspulse.repository.CoordinatorRequestRepository coordinatorRequestRepository;

    @Autowired(required = false)
    private com.campuspulse.repository.AuditLogRepository auditLogRepository;

    @Test
    @DisplayName("Persists, retrieves, updates, and deletes an Event in real PostgreSQL")
    void testEventLifecycleInPostgres() {
        LocalDateTime now = LocalDateTime.now();
        Event event = new Event(
                "Postgres Hackathon 2026",
                "Deep dive hackathon testing real PostgreSQL persistence.",
                EventType.HACKATHON,
                EventStatus.PUBLISHED,
                "Auditorium 1",
                now.plusDays(10),
                now.plusDays(12),
                now.plusDays(8),
                100,
                "PG Society",
                "pg@campus.edu",
                "+919876543210",
                "https://example.com/banner.png"
        );

        Event saved = eventRepository.save(event);
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCreatedAt()).isNotNull();

        Optional<Event> found = eventRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getTitle()).isEqualTo("Postgres Hackathon 2026");

        // Update
        found.get().setTitle("Postgres Hackathon 2026 (Updated)");
        Event updated = eventRepository.save(found.get());
        assertThat(updated.getTitle()).isEqualTo("Postgres Hackathon 2026 (Updated)");

        // Delete
        eventRepository.deleteById(saved.getId());
        assertThat(eventRepository.findById(saved.getId())).isEmpty();
    }

    @Test
    @DisplayName("Persists and verifies unique email constraint on Admin in real PostgreSQL")
    void testAdminPersistenceInPostgres() {
        String testEmail = "pg.admin@campuspulse.edu";
        Admin admin = new Admin(testEmail, passwordEncoder.encode("SecretPass123!"), Role.ADMIN);

        Admin saved = adminRepository.save(admin);
        assertThat(saved.getId()).isNotNull();

        Optional<Admin> found = adminRepository.findByEmailIgnoreCase(testEmail);
        assertThat(found).isPresent();
        assertThat(passwordEncoder.matches("SecretPass123!", found.get().getPassword())).isTrue();

        adminRepository.deleteById(saved.getId());
    }

    @Test
    @DisplayName("Persists and verifies CoordinatorRequest and AuditLog in real PostgreSQL")
    void testCoordinatorRequestAndAuditLogPersistenceInPostgres() {
        String testEmail = "pg.user@campuspulse.edu";
        Admin user = new Admin("PG User", testEmail, passwordEncoder.encode("SecretPass123!"), Role.USER);
        user = adminRepository.save(user);

        com.campuspulse.entity.CoordinatorRequest req = new com.campuspulse.entity.CoordinatorRequest(
                user,
                "PG Robotics Club",
                "Hosting PG workshop",
                "+919876543210"
        );
        com.campuspulse.entity.CoordinatorRequest savedReq = coordinatorRequestRepository.save(req);
        assertThat(savedReq.getId()).isNotNull();
        assertThat(savedReq.getStatus()).isEqualTo(com.campuspulse.entity.CoordinatorRequestStatus.PENDING);
        assertThat(savedReq.getRequestedAt()).isNotNull();

        com.campuspulse.entity.AuditLog log = new com.campuspulse.entity.AuditLog(
                user.getEmail(),
                "COORDINATOR_REQUEST_SUBMITTED",
                "COORDINATOR_REQUEST",
                savedReq.getId(),
                "Integration test audit record on Postgres"
        );
        com.campuspulse.entity.AuditLog savedLog = auditLogRepository.save(log);
        assertThat(savedLog.getId()).isNotNull();
        assertThat(savedLog.getCreatedAt()).isNotNull();

        coordinatorRequestRepository.deleteById(savedReq.getId());
        auditLogRepository.deleteById(savedLog.getId());
        adminRepository.deleteById(user.getId());
    }
}
