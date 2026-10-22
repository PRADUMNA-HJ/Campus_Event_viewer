package com.campuspulse.service;

import com.campuspulse.dto.ImageUploadResult;
import org.springframework.web.multipart.MultipartFile;

/**
 * Service interface for persistent image storage operations.
 * Handles uploading banner and QR assets to cloud storage and safe cleanup.
 */
public interface ImageStorageService {

    /**
     * Uploads an event banner image asset.
     *
     * @param file the uploaded multipart file
     * @return upload result containing HTTPS URL and public ID
     */
    ImageUploadResult uploadBanner(MultipartFile file);

    /**
     * Uploads an event QR-code image asset, preserving sharp contrast and uncropped dimensions.
     *
     * @param file the uploaded multipart file
     * @return upload result containing HTTPS URL and public ID
     */
    ImageUploadResult uploadQrCode(MultipartFile file);

    /**
     * Deletes a stored asset by its provider identifier.
     * Safe to invoke even if the asset does not exist or has already been removed.
     *
     * @param publicId the provider asset identifier
     */
    void deleteImage(String publicId);

    /**
     * Checks whether the underlying storage provider is configured with credentials.
     *
     * @return true if credentials are validly configured, false otherwise
     */
    boolean isConfigured();
}
