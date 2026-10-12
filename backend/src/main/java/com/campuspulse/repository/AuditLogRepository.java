package com.campuspulse.repository;

import com.campuspulse.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for {@link AuditLog} entities.
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /**
     * Retrieves all audit logs ordered most recent first.
     */
    List<AuditLog> findAllByOrderByCreatedAtDesc();

    /**
     * Retrieves audit logs for a specific actor email.
     */
    List<AuditLog> findByActorEmailOrderByCreatedAtDesc(String actorEmail);

    /**
     * Retrieves audit logs by target type (e.g. EVENT, COORDINATOR_REQUEST).
     */
    List<AuditLog> findByTargetTypeOrderByCreatedAtDesc(String targetType);
}
