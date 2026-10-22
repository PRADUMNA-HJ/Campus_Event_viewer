package com.campuspulse.service;

import com.campuspulse.dto.ImageUploadResult;
import com.campuspulse.exception.InvalidEventException;
import com.campuspulse.util.ImageValidationUtils;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * Cloudinary-backed implementation of {@link ImageStorageService}.
 * Provides persistent HTTPS cloud asset management that survives server restarts.
 * Enforces strict binary image validation, format filtering, and size checks before upload.
 */
@Service
public class CloudinaryImageStorageService implements ImageStorageService {

    private static final Logger log = LoggerFactory.getLogger(CloudinaryImageStorageService.class);

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String apiKey;

    @Value("${cloudinary.api-secret:}")
    private String apiSecret;

    @Value("${cloudinary.url:}")
    private String cloudinaryUrl;

    @Value("${app.upload.max-file-size-bytes:5242880}")
    private long maxFileSizeBytes = ImageValidationUtils.DEFAULT_MAX_FILE_SIZE_BYTES;

    private Cloudinary cloudinary;

    public CloudinaryImageStorageService() {
    }

    // Constructor for testing or programmatic injection
    public CloudinaryImageStorageService(Cloudinary cloudinary, long maxFileSizeBytes) {
        this.cloudinary = cloudinary;
        this.maxFileSizeBytes = maxFileSizeBytes;
    }

    @PostConstruct
    public void init() {
        if (this.cloudinary != null) {
            return;
        }

        if (cloudinaryUrl != null && !cloudinaryUrl.isBlank()) {
            this.cloudinary = new Cloudinary(cloudinaryUrl.trim());
            log.info("Initialized Cloudinary client via CLOUDINARY_URL connection string");
        } else if (hasValue(cloudName) && hasValue(apiKey) && hasValue(apiSecret)) {
            this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", cloudName.trim(),
                    "api_key", apiKey.trim(),
                    "api_secret", apiSecret.trim(),
                    "secure", true
            ));
            log.info("Initialized Cloudinary client for cloud_name='{}'", cloudName.trim());
        } else {
            log.warn("Cloudinary credentials are not configured. Image uploads will be disabled until configured.");
        }
    }

    @Override
    public boolean isConfigured() {
        return this.cloudinary != null;
    }

    @Override
    public ImageUploadResult uploadBanner(MultipartFile file) {
        ImageValidationUtils.validateImageFile(file, maxFileSizeBytes);
        ensureConfigured();

        try {
            Map<?, ?> params = ObjectUtils.asMap(
                    "folder", "campuspulse/banners",
                    "resource_type", "image",
                    "use_filename", false,
                    "unique_filename", true,
                    "overwrite", false
            );
            Map<?, ?> uploadResult = cloudinary.uploader().upload(file.getBytes(), params);
            String secureUrl = (String) uploadResult.get("secure_url");
            String publicId = (String) uploadResult.get("public_id");

            log.info("Uploaded event banner to Cloudinary: publicId='{}'", publicId);
            return new ImageUploadResult(secureUrl, publicId);
        } catch (IOException e) {
            log.error("Cloudinary upload failed for banner: {}", e.getMessage(), e);
            throw new InvalidEventException("Failed to upload banner image to storage provider: " + e.getMessage());
        }
    }

    @Override
    public ImageUploadResult uploadQrCode(MultipartFile file) {
        ImageValidationUtils.validateImageFile(file, maxFileSizeBytes);
        ensureConfigured();

        try {
            // Quality and delivery settings tailored to preserve crisp QR code contrast and scannability
            Map<?, ?> params = ObjectUtils.asMap(
                    "folder", "campuspulse/qrcodes",
                    "resource_type", "image",
                    "use_filename", false,
                    "unique_filename", true,
                    "overwrite", false,
                    "quality", "auto:best"
            );
            Map<?, ?> uploadResult = cloudinary.uploader().upload(file.getBytes(), params);
            String secureUrl = (String) uploadResult.get("secure_url");
            String publicId = (String) uploadResult.get("public_id");

            log.info("Uploaded event QR code to Cloudinary: publicId='{}'", publicId);
            return new ImageUploadResult(secureUrl, publicId);
        } catch (IOException e) {
            log.error("Cloudinary upload failed for QR code: {}", e.getMessage(), e);
            throw new InvalidEventException("Failed to upload QR code image to storage provider: " + e.getMessage());
        }
    }

    @Override
    public void deleteImage(String publicId) {
        if (!isConfigured() || publicId == null || publicId.isBlank()) {
            return;
        }

        try {
            Map<?, ?> result = cloudinary.uploader().destroy(publicId.trim(), ObjectUtils.emptyMap());
            log.info("Requested deletion of Cloudinary asset '{}', result: {}", publicId, result);
        } catch (Exception e) {
            log.warn("Failed to delete asset '{}' from Cloudinary: {}", publicId, e.getMessage());
        }
    }

    private void ensureConfigured() {
        if (!isConfigured()) {
            throw new InvalidEventException("Image storage provider credentials are not configured on the server. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
        }
    }

    private boolean hasValue(String value) {
        return value != null && !value.isBlank();
    }
}
