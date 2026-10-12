package com.campuspulse.dto;

import java.time.LocalDateTime;

/**
 * Data Transfer Object delivering safe administrator profile information.
 * Excludes sensitive fields like password hashes or credentials.
 */
public class AdminProfileResponse {

    private Long id;
    private String name;
    private String email;
    private String role;
    private boolean enabled = true;
    private String coordinatorRequestStatus;
    private LocalDateTime createdAt;

    public AdminProfileResponse() {
    }

    public AdminProfileResponse(Long id, String email, String role, LocalDateTime createdAt) {
        this.id = id;
        this.email = email;
        this.role = role;
        this.createdAt = createdAt;
    }

    public AdminProfileResponse(Long id, String name, String email, String role, boolean enabled, String coordinatorRequestStatus, LocalDateTime createdAt) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = role;
        this.enabled = enabled;
        this.coordinatorRequestStatus = coordinatorRequestStatus;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getCoordinatorRequestStatus() {
        return coordinatorRequestStatus;
    }

    public void setCoordinatorRequestStatus(String coordinatorRequestStatus) {
        this.coordinatorRequestStatus = coordinatorRequestStatus;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public String toString() {
        return "AdminProfileResponse{" +
                "id=" + id +
                ", email='" + email + '\'' +
                ", role='" + role + '\'' +
                '}';
    }
}
