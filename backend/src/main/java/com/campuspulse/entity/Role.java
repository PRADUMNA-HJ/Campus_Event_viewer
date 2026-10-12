package com.campuspulse.entity;

/**
 * Represents the role assigned to a user or administrator in CampusPulse.
 * Enforces the least-privilege three-tier access control model:
 * - ROLE_MAIN_ADMIN: System administrator with full governance over coordinators and event publications.
 * - ROLE_COORDINATOR: Verified campus organizer authorized to submit and manage own events.
 * - ROLE_USER: Registered campus student or visitor capable of requesting coordinator status.
 *
 * Includes ADMIN for backward compatibility with initial test fixtures and legacy tokens.
 */
public enum Role {
    MAIN_ADMIN,
    COORDINATOR,
    USER,
    ADMIN; // Backward-compatibility alias for MAIN_ADMIN

    public boolean isMainAdmin() {
        return this == MAIN_ADMIN || this == ADMIN;
    }
}
