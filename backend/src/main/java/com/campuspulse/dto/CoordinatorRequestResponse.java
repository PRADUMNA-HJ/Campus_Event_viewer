package com.campuspulse.dto;

import com.campuspulse.entity.CoordinatorRequest;
import com.campuspulse.entity.CoordinatorRequestStatus;

import java.time.LocalDateTime;

/**
 * Data Transfer Object returning coordinator request details to API clients.
 */
public class CoordinatorRequestResponse {

    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;
    private String organizationOrClub;
    private String reason;
    private String contactDetails;
    private CoordinatorRequestStatus status;
    private LocalDateTime requestedAt;
    private LocalDateTime reviewedAt;
    private String reviewedByEmail;
    private String reviewNote;
    private LocalDateTime updatedAt;

    public CoordinatorRequestResponse() {
    }

    public CoordinatorRequestResponse(Long id,
                                      Long userId,
                                      String userName,
                                      String userEmail,
                                      String organizationOrClub,
                                      String reason,
                                      String contactDetails,
                                      CoordinatorRequestStatus status,
                                      LocalDateTime requestedAt,
                                      LocalDateTime reviewedAt,
                                      String reviewedByEmail,
                                      String reviewNote,
                                      LocalDateTime updatedAt) {
        this.id = id;
        this.userId = userId;
        this.userName = userName;
        this.userEmail = userEmail;
        this.organizationOrClub = organizationOrClub;
        this.reason = reason;
        this.contactDetails = contactDetails;
        this.status = status;
        this.requestedAt = requestedAt;
        this.reviewedAt = reviewedAt;
        this.reviewedByEmail = reviewedByEmail;
        this.reviewNote = reviewNote;
        this.updatedAt = updatedAt;
    }

    public static CoordinatorRequestResponse fromEntity(CoordinatorRequest req) {
        if (req == null) {
            return null;
        }
        Long uId = req.getUser() != null ? req.getUser().getId() : null;
        String uName = req.getUser() != null ? req.getUser().getName() : null;
        String uEmail = req.getUser() != null ? req.getUser().getEmail() : null;
        String revEmail = req.getReviewedBy() != null ? req.getReviewedBy().getEmail() : null;

        return new CoordinatorRequestResponse(
                req.getId(),
                uId,
                uName,
                uEmail,
                req.getOrganizationOrClub(),
                req.getReason(),
                req.getContactDetails(),
                req.getStatus(),
                req.getRequestedAt(),
                req.getReviewedAt(),
                revEmail,
                req.getReviewNote(),
                req.getUpdatedAt()
        );
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public String getOrganizationOrClub() {
        return organizationOrClub;
    }

    public void setOrganizationOrClub(String organizationOrClub) {
        this.organizationOrClub = organizationOrClub;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getContactDetails() {
        return contactDetails;
    }

    public void setContactDetails(String contactDetails) {
        this.contactDetails = contactDetails;
    }

    public CoordinatorRequestStatus getStatus() {
        return status;
    }

    public void setStatus(CoordinatorRequestStatus status) {
        this.status = status;
    }

    public LocalDateTime getRequestedAt() {
        return requestedAt;
    }

    public void setRequestedAt(LocalDateTime requestedAt) {
        this.requestedAt = requestedAt;
    }

    public LocalDateTime getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(LocalDateTime reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public String getReviewedByEmail() {
        return reviewedByEmail;
    }

    public void setReviewedByEmail(String reviewedByEmail) {
        this.reviewedByEmail = reviewedByEmail;
    }

    public String getReviewNote() {
        return reviewNote;
    }

    public void setReviewNote(String reviewNote) {
        this.reviewNote = reviewNote;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
