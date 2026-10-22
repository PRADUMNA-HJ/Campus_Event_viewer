package com.campuspulse.service;

import com.campuspulse.dto.ImageUploadResult;
import com.campuspulse.exception.InvalidEventException;
import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CloudinaryImageStorageServiceTest {

    @Mock
    private Cloudinary cloudinary;

    @Mock
    private Uploader uploader;

    private byte[] createSamplePng() throws IOException {
        BufferedImage img = new BufferedImage(30, 30, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.RED);
        g.fillRect(0, 0, 30, 30);
        g.dispose();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "png", baos);
        return baos.toByteArray();
    }

    @Test
    @DisplayName("Should report not configured when Cloudinary instance is null")
    void testIsConfigured_FalseWhenNull() {
        CloudinaryImageStorageService service = new CloudinaryImageStorageService();
        assertFalse(service.isConfigured());
    }

    @Test
    @DisplayName("Should throw clear error when uploading without credentials")
    void testUpload_ThrowsWhenNotConfigured() throws Exception {
        CloudinaryImageStorageService service = new CloudinaryImageStorageService();
        MockMultipartFile file = new MockMultipartFile("file", "test.png", "image/png", createSamplePng());

        InvalidEventException ex = assertThrows(InvalidEventException.class, () -> service.uploadBanner(file));
        assertTrue(ex.getMessage().contains("Image storage provider credentials are not configured"));
    }

    @Test
    @DisplayName("Should upload banner successfully to campuspulse/banners folder")
    void testUploadBanner_Success() throws Exception {
        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.upload(any(byte[].class), anyMap())).thenReturn(Map.of(
                "secure_url", "https://res.cloudinary.com/test/image/upload/v1/campuspulse/banners/sample.png",
                "public_id", "campuspulse/banners/sample"
        ));

        CloudinaryImageStorageService service = new CloudinaryImageStorageService(cloudinary, 5 * 1024 * 1024);
        assertTrue(service.isConfigured());

        MockMultipartFile file = new MockMultipartFile("file", "banner.png", "image/png", createSamplePng());
        ImageUploadResult result = service.uploadBanner(file);

        assertNotNull(result);
        assertEquals("https://res.cloudinary.com/test/image/upload/v1/campuspulse/banners/sample.png", result.secureUrl());
        assertEquals("campuspulse/banners/sample", result.publicId());
    }

    @Test
    @DisplayName("Should upload QR code successfully to campuspulse/qrcodes folder")
    void testUploadQrCode_Success() throws Exception {
        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.upload(any(byte[].class), anyMap())).thenReturn(Map.of(
                "secure_url", "https://res.cloudinary.com/test/image/upload/v1/campuspulse/qrcodes/qr123.png",
                "public_id", "campuspulse/qrcodes/qr123"
        ));

        CloudinaryImageStorageService service = new CloudinaryImageStorageService(cloudinary, 5 * 1024 * 1024);
        MockMultipartFile file = new MockMultipartFile("file", "qr.png", "image/png", createSamplePng());
        ImageUploadResult result = service.uploadQrCode(file);

        assertNotNull(result);
        assertEquals("https://res.cloudinary.com/test/image/upload/v1/campuspulse/qrcodes/qr123.png", result.secureUrl());
        assertEquals("campuspulse/qrcodes/qr123", result.publicId());
    }

    @Test
    @DisplayName("Should delete image asset via Cloudinary destroy")
    void testDeleteImage_Success() throws Exception {
        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.destroy(eq("campuspulse/banners/sample"), anyMap())).thenReturn(Map.of("result", "ok"));

        CloudinaryImageStorageService service = new CloudinaryImageStorageService(cloudinary, 5 * 1024 * 1024);
        service.deleteImage("campuspulse/banners/sample");

        verify(uploader).destroy(eq("campuspulse/banners/sample"), anyMap());
    }
}
