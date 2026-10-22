package com.campuspulse.util;

import com.campuspulse.exception.InvalidEventException;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Locale;

/**
 * Utility for strict validation of uploaded image files.
 * Validates actual binary content (magic bytes), raster format validity,
 * and rejects active formats like SVG and HTML to ensure system security.
 */
public final class ImageValidationUtils {

    public static final long DEFAULT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

    // Magic byte signatures
    private static final byte[] JPEG_MAGIC = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_MAGIC = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] GIF87A_MAGIC = new byte[]{0x47, 0x49, 0x46, 0x38, 0x37, 0x61};
    private static final byte[] GIF89A_MAGIC = new byte[]{0x47, 0x49, 0x46, 0x38, 0x39, 0x61};
    private static final byte[] RIFF_MAGIC = new byte[]{0x52, 0x49, 0x46, 0x46}; // "RIFF"
    private static final byte[] WEBP_MAGIC = new byte[]{0x57, 0x45, 0x42, 0x50}; // "WEBP"

    private ImageValidationUtils() {
    }

    /**
     * Validates an uploaded image file against size constraints, binary file signatures,
     * raster format decoding, and active script rejections.
     *
     * @param file             the uploaded multipart file
     * @param maxFileSizeBytes maximum allowable file size in bytes
     * @throws InvalidEventException if validation fails
     */
    public static void validateImageFile(MultipartFile file, long maxFileSizeBytes) {
        if (file == null || file.isEmpty()) {
            throw new InvalidEventException("Image file must not be empty");
        }

        long maxLimit = maxFileSizeBytes > 0 ? maxFileSizeBytes : DEFAULT_MAX_FILE_SIZE_BYTES;
        if (file.getSize() > maxLimit) {
            long maxMb = maxLimit / (1024 * 1024);
            throw new InvalidEventException("File size exceeds the maximum allowed limit of " + maxMb + " MB");
        }

        byte[] header = new byte[64];
        byte[] fullBytes;
        try {
            fullBytes = file.getBytes();
            if (fullBytes.length < 12) {
                throw new InvalidEventException("Corrupted or incomplete image file");
            }
            System.arraycopy(fullBytes, 0, header, 0, Math.min(header.length, fullBytes.length));
        } catch (IOException e) {
            throw new InvalidEventException("Unable to read uploaded file content");
        }

        // 1. Check for active/malicious XML/HTML/SVG content
        checkAgainstActiveContent(fullBytes);

        // 2. Validate magic bytes against allowed raster formats
        RasterFormat format = detectRasterFormat(header);
        if (format == null) {
            throw new InvalidEventException("Unsupported file type. Only JPEG, PNG, WebP, and GIF images are allowed.");
        }

        // 3. Decode raster image using ImageIO (except WebP which might not have native ImageIO plugin on all JVMs)
        if (format != RasterFormat.WEBP) {
            try {
                BufferedImage image = ImageIO.read(new ByteArrayInputStream(fullBytes));
                if (image == null) {
                    throw new InvalidEventException("Invalid or corrupt image content. Failed to decode image.");
                }
                if (image.getWidth() <= 0 || image.getHeight() <= 0) {
                    throw new InvalidEventException("Invalid image dimensions.");
                }
            } catch (IOException e) {
                throw new InvalidEventException("Invalid or corrupt image content: " + e.getMessage());
            }
        }
    }

    private static void checkAgainstActiveContent(byte[] bytes) {
        int sampleLength = Math.min(bytes.length, 1024);
        String headerSnippet = new String(bytes, 0, sampleLength, StandardCharsets.UTF_8).toLowerCase(Locale.ROOT);

        if (headerSnippet.contains("<svg")
                || headerSnippet.contains("<?xml")
                || headerSnippet.contains("<!doctype")
                || headerSnippet.contains("<html")
                || headerSnippet.contains("<script")) {
            throw new InvalidEventException("Active file types including SVG and HTML are not supported for security reasons.");
        }
    }

    public static RasterFormat detectRasterFormat(byte[] header) {
        if (header.length < 12) {
            return null;
        }

        // JPEG: FF D8 FF
        if ((header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF) {
            return RasterFormat.JPEG;
        }

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (Arrays.equals(Arrays.copyOfRange(header, 0, 8), PNG_MAGIC)) {
            return RasterFormat.PNG;
        }

        // GIF: GIF87a or GIF89a
        if (Arrays.equals(Arrays.copyOfRange(header, 0, 6), GIF87A_MAGIC)
                || Arrays.equals(Arrays.copyOfRange(header, 0, 6), GIF89A_MAGIC)) {
            return RasterFormat.GIF;
        }

        // WebP: "RIFF" (bytes 0-3) and "WEBP" (bytes 8-11)
        if (Arrays.equals(Arrays.copyOfRange(header, 0, 4), RIFF_MAGIC)
                && Arrays.equals(Arrays.copyOfRange(header, 8, 12), WEBP_MAGIC)) {
            return RasterFormat.WEBP;
        }

        return null;
    }

    public enum RasterFormat {
        JPEG("image/jpeg", "jpg"),
        PNG("image/png", "png"),
        WEBP("image/webp", "webp"),
        GIF("image/gif", "gif");

        private final String mimeType;
        private final String extension;

        RasterFormat(String mimeType, String extension) {
            this.mimeType = mimeType;
            this.extension = extension;
        }

        public String getMimeType() {
            return mimeType;
        }

        public String getExtension() {
            return extension;
        }
    }
}
