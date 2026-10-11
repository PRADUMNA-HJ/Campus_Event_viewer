package com.campuspulse.dto;

import java.time.LocalDateTime;

/**
 * Data Transfer Object delivering safe administrator profile information.
 * Excludes sensitive fields like password hashes or credentials.
 */
public class AdminProfileResponse {

    private Long id;
    private String email;
    private String role;
    private LocalDateTime createdAt;

    public AdminProfileResponse() {
    }

    public AdminProfileResponse(Long id, String email, String role, LocalDateTime createdAt) {
        this.id = id;
        this.email = email;
        this.role = role;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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
