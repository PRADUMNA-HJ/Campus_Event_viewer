package com.campuspulse.util;

import com.campuspulse.exception.InvalidEventException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ImageValidationUtilsTest {

    private byte[] createSampleRasterBytes(String format) throws IOException {
        BufferedImage img = new BufferedImage(50, 50, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.BLUE);
        g.fillRect(0, 0, 50, 50);
        g.dispose();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, format, baos);
        return baos.toByteArray();
    }

    @Test
    @DisplayName("Should accept valid JPEG file")
    void testValidate_ValidJpeg() throws Exception {
        byte[] bytes = createSampleRasterBytes("jpg");
        MockMultipartFile file = new MockMultipartFile("file", "banner.jpg", "image/jpeg", bytes);

        assertDoesNotThrow(() -> ImageValidationUtils.validateImageFile(file, 5 * 1024 * 1024));
    }

    @Test
    @DisplayName("Should accept valid PNG file")
    void testValidate_ValidPng() throws Exception {
        byte[] bytes = createSampleRasterBytes("png");
        MockMultipartFile file = new MockMultipartFile("file", "qr.png", "image/png", bytes);

        assertDoesNotThrow(() -> ImageValidationUtils.validateImageFile(file, 5 * 1024 * 1024));
    }

    @Test
    @DisplayName("Should accept valid GIF file")
    void testValidate_ValidGif() throws Exception {
        byte[] bytes = createSampleRasterBytes("gif");
        MockMultipartFile file = new MockMultipartFile("file", "anim.gif", "image/gif", bytes);

        assertDoesNotThrow(() -> ImageValidationUtils.validateImageFile(file, 5 * 1024 * 1024));
    }

    @Test
    @DisplayName("Should accept valid WebP file header")
    void testValidate_ValidWebp() {
        // Construct minimum valid RIFF....WEBP header
        byte[] webpBytes = new byte[32];
        webpBytes[0] = 'R'; webpBytes[1] = 'I'; webpBytes[2] = 'F'; webpBytes[3] = 'F';
        webpBytes[4] = 24;  webpBytes[5] = 0;   webpBytes[6] = 0;   webpBytes[7] = 0;
        webpBytes[8] = 'W'; webpBytes[9] = 'E'; webpBytes[10] = 'B'; webpBytes[11] = 'P';
        webpBytes[12] = 'V'; webpBytes[13] = 'P'; webpBytes[14] = '8'; webpBytes[15] = ' ';

        MockMultipartFile file = new MockMultipartFile("file", "test.webp", "image/webp", webpBytes);
        assertDoesNotThrow(() -> ImageValidationUtils.validateImageFile(file, 5 * 1024 * 1024));
    }

    @Test
    @DisplayName("Should reject empty or null file")
    void testValidate_EmptyFile() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "empty.jpg", "image/jpeg", new byte[0]);
        InvalidEventException ex = assertThrows(InvalidEventException.class,
                () -> ImageValidationUtils.validateImageFile(emptyFile, 5 * 1024 * 1024));
        assertTrue(ex.getMessage().contains("must not be empty"));
    }

    @Test
    @DisplayName("Should reject oversized file")
    void testValidate_OversizedFile() {
        byte[] bigBytes = new byte[100];
        MockMultipartFile file = new MockMultipartFile("file", "big.png", "image/png", bigBytes);

        InvalidEventException ex = assertThrows(InvalidEventException.class,
                () -> ImageValidationUtils.validateImageFile(file, 50)); // max limit 50 bytes
        assertTrue(ex.getMessage().contains("exceeds the maximum allowed limit"));
    }

    @Test
    @DisplayName("Should reject SVG active content disguised as PNG")
    void testValidate_RejectSvg() {
        String svgContent = "<svg xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"50\" cy=\"50\" r=\"40\"/></svg>";
        MockMultipartFile file = new MockMultipartFile("file", "malicious.png", "image/png",
                svgContent.getBytes(StandardCharsets.UTF_8));

        InvalidEventException ex = assertThrows(InvalidEventException.class,
                () -> ImageValidationUtils.validateImageFile(file, 5 * 1024 * 1024));
        assertTrue(ex.getMessage().contains("Active file types including SVG"));
    }

    @Test
    @DisplayName("Should reject HTML/Script payload disguised as image")
    void testValidate_RejectHtmlScript() {
        String htmlContent = "<html><script>alert('pwned')</script></html>";
        MockMultipartFile file = new MockMultipartFile("file", "fake.jpg", "image/jpeg",
                htmlContent.getBytes(StandardCharsets.UTF_8));

        InvalidEventException ex = assertThrows(InvalidEventException.class,
                () -> ImageValidationUtils.validateImageFile(file, 5 * 1024 * 1024));
        assertTrue(ex.getMessage().contains("Active file types"));
    }

    @Test
    @DisplayName("Should reject corrupt file with unsupported magic bytes")
    void testValidate_CorruptMagicBytes() {
        byte[] randomBytes = new byte[]{0x12, 0x34, 0x56, 0x78, 0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77};
        MockMultipartFile file = new MockMultipartFile("file", "corrupt.jpg", "image/jpeg", randomBytes);

        InvalidEventException ex = assertThrows(InvalidEventException.class,
                () -> ImageValidationUtils.validateImageFile(file, 5 * 1024 * 1024));
        assertTrue(ex.getMessage().contains("Unsupported file type"));
    }
}
