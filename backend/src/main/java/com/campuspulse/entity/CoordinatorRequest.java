package com.campuspulse.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * JPA Entity representing a user's request for campus coordinator privileges.
 * Manages the governance workflow where the designated Main Admin reviews and approves/rejects requests.
 */
@Entity
@Table(
        name = "coordinator_requests",
        indexes = {
                @Index(name = "idx_coord_req_user", columnList = "user_id"),
                @Index(name = "idx_coord_req_status", columnList = "status"),
                @Index(name = "idx_coord_req_user_status", columnList = "user_id, status")
        }
)
public class CoordinatorRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Requester user is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.CASCADE)
    private Admin user;

    @NotBlank(message = "Organization or club name is required")
    @Size(max = 150, message = "Organization or club name must not exceed 150 characters")
    @Column(name = "organization_or_club", nullable = false, length = 150)
    private String organizationOrClub;

    @NotBlank(message = "Reason for coordinator request is required")
    @Size(max = 1000, message = "Reason must not exceed 1000 characters")
    @Column(nullable = false, length = 1000)
    private String reason;

    @Size(max = 150, message = "Contact details must not exceed 150 characters")
    @Column(name = "contact_details", length = 150)
    private String contactDetails;

    @NotNull(message = "Status is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CoordinatorRequestStatus status = CoordinatorRequestStatus.PENDING;

    @Column(name = "requested_at", nullable = false, updatable = false)
    private LocalDateTime requestedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.SET_NULL)
    private Admin reviewedBy;

    @Size(max = 1000, message = "Review note must not exceed 1000 characters")
    @Column(name = "review_note", length = 1000)
    private String reviewNote;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public CoordinatorRequest() {
    }

    public CoordinatorRequest(Admin user, String organizationOrClub, String reason, String contactDetails) {
        this.user = user;
        this.organizationOrClub = organizationOrClub;
        this.reason = reason;
        this.contactDetails = contactDetails;
        this.status = CoordinatorRequestStatus.PENDING;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.requestedAt = now;
        this.updatedAt = now;
        if (this.status == null) {
            this.status = CoordinatorRequestStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Admin getUser() {
        return user;
    }

    public void setUser(Admin user) {
        this.user = user;
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

    public Admin getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(Admin reviewedBy) {
        this.reviewedBy = reviewedBy;
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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CoordinatorRequest that = (CoordinatorRequest) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
