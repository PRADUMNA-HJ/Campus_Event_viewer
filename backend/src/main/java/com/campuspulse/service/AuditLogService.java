package com.campuspulse.service;

import com.campuspulse.entity.AuditLog;
import com.campuspulse.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service for lightweight audit logging.
 * Captures lifecycle and authorization events without storing passwords, tokens, or sensitive payloads.
 */
@Service
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Records an audit event asynchronously or with REQUIRES_NEW transaction
     * to avoid interrupting primary business logic if logging encounters issues.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAction(String actorEmail, String action, String targetType, Long targetId, String details) {
        try {
            AuditLog auditLog = new AuditLog(actorEmail != null ? actorEmail : "SYSTEM", action, targetType, targetId, details);
            auditLogRepository.save(auditLog);
            log.info("Audit: actor='{}' action='{}' targetType='{}' targetId={}",
                    actorEmail, action, targetType, targetId);
        } catch (Exception ex) {
            log.warn("Failed to record audit log for action: {}", action, ex);
        }
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getRecentLogs() {
        return auditLogRepository.findAllByOrderByCreatedAtDesc();
    }
}
