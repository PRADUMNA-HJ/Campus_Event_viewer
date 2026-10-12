package com.campuspulse.service;

import com.campuspulse.dto.AdminProfileResponse;
import com.campuspulse.dto.CoordinatorRequestCreateDto;
import com.campuspulse.dto.CoordinatorRequestResponse;
import com.campuspulse.dto.CoordinatorRequestReviewDto;
import com.campuspulse.entity.Admin;
import com.campuspulse.entity.CoordinatorRequest;
import com.campuspulse.entity.CoordinatorRequestStatus;
import com.campuspulse.entity.Role;
import com.campuspulse.exception.ConflictException;
import com.campuspulse.exception.ForbiddenException;
import com.campuspulse.exception.ResourceNotFoundException;
import com.campuspulse.repository.AdminRepository;
import com.campuspulse.repository.CoordinatorRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Service managing coordinator applications, Main Admin approvals, rejections, and revocations.
 */
@Service
public class CoordinatorRequestService {

    private final CoordinatorRequestRepository coordinatorRequestRepository;
    private final AdminRepository adminRepository;
    private final AuditLogService auditLogService;

    public CoordinatorRequestService(CoordinatorRequestRepository coordinatorRequestRepository,
                                     AdminRepository adminRepository,
                                     AuditLogService auditLogService) {
        this.coordinatorRequestRepository = coordinatorRequestRepository;
        this.adminRepository = adminRepository;
        this.auditLogService = auditLogService;
    }

    /**
     * Submits a new coordinator request on behalf of the authenticated user.
     * Enforces the single-pending-request rule.
     */
    @Transactional
    public CoordinatorRequestResponse submitRequest(String userEmail, CoordinatorRequestCreateDto dto) {
        Admin user = adminRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        if (user.getRole() == Role.COORDINATOR) {
            throw new ConflictException("You already have coordinator privileges");
        }
        if (user.getRole() == Role.MAIN_ADMIN || user.getRole() == Role.ADMIN) {
            throw new ConflictException("Main Admin already has full privileges");
        }

        if (coordinatorRequestRepository.existsByUserAndStatus(user, CoordinatorRequestStatus.PENDING)) {
            throw new ConflictException("You already have a pending coordinator request awaiting review");
        }

        CoordinatorRequest request = new CoordinatorRequest(
                user,
                dto.getOrganizationOrClub().trim(),
                dto.getReason().trim(),
                dto.getContactDetails() != null ? dto.getContactDetails().trim() : null
        );

        CoordinatorRequest saved = coordinatorRequestRepository.save(request);

        auditLogService.logAction(
                user.getEmail(),
                "COORDINATOR_REQUEST_SUBMITTED",
                "COORDINATOR_REQUEST",
                saved.getId(),
                "Organization: " + saved.getOrganizationOrClub()
        );

        return CoordinatorRequestResponse.fromEntity(saved);
    }

    /**
     * Retrieves the latest coordinator request for the authenticated user.
     */
    @Transactional(readOnly = true)
    public CoordinatorRequestResponse getMyLatestRequest(String userEmail) {
        Admin user = adminRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        return coordinatorRequestRepository.findTopByUserOrderByRequestedAtDesc(user)
                .map(CoordinatorRequestResponse::fromEntity)
                .orElse(null);
    }

    /**
     * Retrieves all coordinator requests submitted by the authenticated user.
     */
    @Transactional(readOnly = true)
    public List<CoordinatorRequestResponse> getMyRequests(String userEmail) {
        Admin user = adminRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        return coordinatorRequestRepository.findByUserOrderByRequestedAtDesc(user)
                .stream()
                .map(CoordinatorRequestResponse::fromEntity)
                .toList();
    }

    /**
     * Lists coordinator requests filtered optionally by status (Main Admin only).
     */
    @Transactional(readOnly = true)
    public List<CoordinatorRequestResponse> getRequests(CoordinatorRequestStatus status) {
        List<CoordinatorRequest> list = (status != null)
                ? coordinatorRequestRepository.findByStatusOrderByRequestedAtAsc(status)
                : coordinatorRequestRepository.findAllByOrderByRequestedAtDesc();

        return list.stream()
                .map(CoordinatorRequestResponse::fromEntity)
                .toList();
    }

    /**
     * Retrieves a single coordinator request by ID.
     */
    @Transactional(readOnly = true)
    public CoordinatorRequestResponse getRequestById(Long id) {
        CoordinatorRequest request = coordinatorRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Coordinator request not found with ID: " + id));
        return CoordinatorRequestResponse.fromEntity(request);
    }

    /**
     * Approves a pending coordinator request, elevating the user to ROLE_COORDINATOR.
     */
    @Transactional
    public CoordinatorRequestResponse approveRequest(Long requestId, String reviewerEmail, CoordinatorRequestReviewDto reviewDto) {
        Admin reviewer = adminRepository.findByEmailIgnoreCase(reviewerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer not found: " + reviewerEmail));

        CoordinatorRequest request = coordinatorRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Coordinator request not found with ID: " + requestId));

        if (request.getStatus() != CoordinatorRequestStatus.PENDING) {
            throw new ConflictException("Only PENDING requests can be approved. Current status: " + request.getStatus());
        }

        Admin requester = request.getUser();
        if (requester.equals(reviewer)) {
            throw new ForbiddenException("Main Admin cannot approve their own coordinator request");
        }

        request.setStatus(CoordinatorRequestStatus.APPROVED);
        request.setReviewedBy(reviewer);
        request.setReviewedAt(LocalDateTime.now());
        if (reviewDto != null && reviewDto.getReviewNote() != null) {
            request.setReviewNote(reviewDto.getReviewNote().trim());
        }

        requester.setRole(Role.COORDINATOR);
        adminRepository.save(requester);
        CoordinatorRequest saved = coordinatorRequestRepository.save(request);

        auditLogService.logAction(
                reviewer.getEmail(),
                "COORDINATOR_REQUEST_APPROVED",
                "COORDINATOR_REQUEST",
                saved.getId(),
                "Approved coordinator privileges for user " + requester.getEmail()
        );

        return CoordinatorRequestResponse.fromEntity(saved);
    }

    /**
     * Rejects a pending coordinator request. The requester remains ROLE_USER.
     */
    @Transactional
    public CoordinatorRequestResponse rejectRequest(Long requestId, String reviewerEmail, CoordinatorRequestReviewDto reviewDto) {
        Admin reviewer = adminRepository.findByEmailIgnoreCase(reviewerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer not found: " + reviewerEmail));

        CoordinatorRequest request = coordinatorRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Coordinator request not found with ID: " + requestId));

        if (request.getStatus() != CoordinatorRequestStatus.PENDING) {
            throw new ConflictException("Only PENDING requests can be rejected. Current status: " + request.getStatus());
        }

        request.setStatus(CoordinatorRequestStatus.REJECTED);
        request.setReviewedBy(reviewer);
        request.setReviewedAt(LocalDateTime.now());
        if (reviewDto != null && reviewDto.getReviewNote() != null) {
            request.setReviewNote(reviewDto.getReviewNote().trim());
        }

        CoordinatorRequest saved = coordinatorRequestRepository.save(request);

        auditLogService.logAction(
                reviewer.getEmail(),
                "COORDINATOR_REQUEST_REJECTED",
                "COORDINATOR_REQUEST",
                saved.getId(),
                "Rejected coordinator request for user " + request.getUser().getEmail()
        );

        return CoordinatorRequestResponse.fromEntity(saved);
    }

    /**
     * Revokes coordinator privileges from an active coordinator, immediately reverting them to ROLE_USER.
     */
    @Transactional
    public AdminProfileResponse revokeCoordinator(Long userId, String adminEmail, String reason) {
        Admin admin = adminRepository.findByEmailIgnoreCase(adminEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found: " + adminEmail));

        Admin targetUser = adminRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        if (targetUser.getRole() == Role.MAIN_ADMIN || targetUser.getRole() == Role.ADMIN) {
            throw new ConflictException("Cannot revoke privileges of Main Admin");
        }
        if (targetUser.getRole() != Role.COORDINATOR) {
            throw new ConflictException("User is not an active coordinator");
        }

        targetUser.setRole(Role.USER);
        adminRepository.save(targetUser);

        // Update latest approved request to REVOKED
        Optional<CoordinatorRequest> latestApproved = coordinatorRequestRepository
                .findTopByUserAndStatusOrderByRequestedAtDesc(targetUser, CoordinatorRequestStatus.APPROVED);

        latestApproved.ifPresent(req -> {
            req.setStatus(CoordinatorRequestStatus.REVOKED);
            String note = "Revoked by " + admin.getEmail();
            if (reason != null && !reason.isBlank()) {
                note += ": " + reason.trim();
            }
            req.setReviewNote(note);
            coordinatorRequestRepository.save(req);
        });

        auditLogService.logAction(
                admin.getEmail(),
                "COORDINATOR_REVOKED",
                "ACCOUNT",
                targetUser.getId(),
                "Revoked coordinator privileges for user " + targetUser.getEmail() + ". Reason: " + reason
        );

        return new AdminProfileResponse(
                targetUser.getId(),
                targetUser.getName(),
                targetUser.getEmail(),
                targetUser.getRole().name(),
                targetUser.isEnabled(),
                CoordinatorRequestStatus.REVOKED.name(),
                targetUser.getCreatedAt()
        );
    }

    /**
     * Lists all active coordinators.
     */
    @Transactional(readOnly = true)
    public List<AdminProfileResponse> getAllCoordinators() {
        return adminRepository.findByRoleOrderByCreatedAtDesc(Role.COORDINATOR)
                .stream()
                .map(c -> new AdminProfileResponse(
                        c.getId(),
                        c.getName(),
                        c.getEmail(),
                        c.getRole().name(),
                        c.isEnabled(),
                        CoordinatorRequestStatus.APPROVED.name(),
                        c.getCreatedAt()
                ))
                .toList();
    }
}
