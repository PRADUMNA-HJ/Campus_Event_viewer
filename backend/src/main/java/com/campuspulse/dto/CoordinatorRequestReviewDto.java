package com.campuspulse.dto;

import jakarta.validation.constraints.Size;

/**
 * Data Transfer Object for Main Admin reviewing (approving/rejecting) a coordinator request.
 */
public class CoordinatorRequestReviewDto {

    @Size(max = 1000, message = "Review note must not exceed 1000 characters")
    private String reviewNote;

    public CoordinatorRequestReviewDto() {
    }

    public CoordinatorRequestReviewDto(String reviewNote) {
        this.reviewNote = reviewNote;
    }

    public String getReviewNote() {
        return reviewNote;
    }

    public void setReviewNote(String reviewNote) {
        this.reviewNote = reviewNote;
    }
}
