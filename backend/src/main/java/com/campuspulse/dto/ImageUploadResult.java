package com.campuspulse.dto;

/**
 * Result DTO containing the public secure HTTPS URL and provider asset identifier (public ID)
 * returned after a successful image upload.
 */
public record ImageUploadResult(String secureUrl, String publicId) {
}
