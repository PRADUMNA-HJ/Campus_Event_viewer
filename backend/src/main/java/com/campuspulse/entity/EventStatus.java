package com.campuspulse.entity;

/**
 * Represents the current publication or lifecycle state of an event.
 * Coordinates the multi-step approval workflow between Coordinators and the Main Admin.
 */
public enum EventStatus {
    DRAFT,
    PENDING_REVIEW,
    PUBLISHED,
    REJECTED,
    ONGOING,
    COMPLETED,
    CANCELLED;

    /**
     * Determines whether an event in this state is visible to unauthenticated public visitors.
     */
    public boolean isPubliclyViewable() {
        return this == PUBLISHED || this == ONGOING || this == COMPLETED;
    }
}
