package com.campuspulse.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Data Transfer Object for regular users requesting coordinator privileges.
 */
public class CoordinatorRequestCreateDto {

    @NotBlank(message = "Organization or club name is required")
    @Size(max = 150, message = "Organization or club name must not exceed 150 characters")
    private String organizationOrClub;

    @NotBlank(message = "Reason is required")
    @Size(max = 1000, message = "Reason must not exceed 1000 characters")
    private String reason;

    @Size(max = 150, message = "Contact details must not exceed 150 characters")
    private String contactDetails;

    public CoordinatorRequestCreateDto() {
    }

    public CoordinatorRequestCreateDto(String organizationOrClub, String reason, String contactDetails) {
        this.organizationOrClub = organizationOrClub;
        this.reason = reason;
        this.contactDetails = contactDetails;
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
}
