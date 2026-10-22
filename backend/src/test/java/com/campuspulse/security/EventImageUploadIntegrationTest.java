package com.campuspulse.security;

import com.campuspulse.dto.EventCreateRequest;
import com.campuspulse.dto.ImageUploadResult;
import com.campuspulse.entity.Admin;
import com.campuspulse.entity.Event;
import com.campuspulse.entity.EventStatus;
import com.campuspulse.entity.EventType;
import com.campuspulse.entity.Role;
import com.campuspulse.repository.AdminRepository;
import com.campuspulse.repository.EventRepository;
import com.campuspulse.service.ImageStorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class EventImageUploadIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ImageStorageService imageStorageService;

    private Admin mainAdmin;
    private Admin coordinatorA;
    private Admin coordinatorB;
    private Admin regularUser;

    private String adminToken;
    private String coordAToken;
    private String coordBToken;
    private String userToken;

    private final LocalDateTime now = LocalDateTime.now();

    @BeforeEach
    void setUp() {
        eventRepository.deleteAll();
        adminRepository.deleteAll();

        mainAdmin = adminRepository.saveAndFlush(new Admin("Admin", "admin@college.edu", passwordEncoder.encode("Pass1!"), Role.MAIN_ADMIN));
        coordinatorA = adminRepository.saveAndFlush(new Admin("Coord A", "coorda@college.edu", passwordEncoder.encode("Pass1!"), Role.COORDINATOR));
        coordinatorB = adminRepository.saveAndFlush(new Admin("Coord B", "coordb@college.edu", passwordEncoder.encode("Pass1!"), Role.COORDINATOR));
        regularUser = adminRepository.saveAndFlush(new Admin("User", "user@college.edu", passwordEncoder.encode("Pass1!"), Role.USER));

        adminToken = jwtService.generateToken(mainAdmin.getEmail(), mainAdmin.getRole().name());
        coordAToken = jwtService.generateToken(coordinatorA.getEmail(), coordinatorA.getRole().name());
        coordBToken = jwtService.generateToken(coordinatorB.getEmail(), coordinatorB.getRole().name());
        userToken = jwtService.generateToken(regularUser.getEmail(), regularUser.getRole().name());
    }

    private Event createTestEvent(String title, Admin creator, EventStatus status) {
        Event event = new Event(
                title,
                "Description for " + title,
                EventType.HACKATHON,
                status,
                "Auditorium 1",
                now.plusDays(5),
                now.plusDays(7),
                now.plusDays(3),
                100,
                "Coding Society",
                "coding@college.edu",
                "+919876543210",
                null
        );
        event.setCreatedBy(creator);
        return eventRepository.saveAndFlush(event);
    }

    @Test
    @DisplayName("Coordinator uploads banner to their own event: 200 OK, sets status to PENDING_REVIEW")
    void testUploadBanner_OwnerCoordinator_Success() throws Exception {
        Event event = createTestEvent("Hackathon 2026", coordinatorA, EventStatus.PUBLISHED);

        MockMultipartFile file = new MockMultipartFile("file", "banner.png", "image/png", new byte[]{1, 2, 3});
        when(imageStorageService.uploadBanner(any())).thenReturn(
                new ImageUploadResult("https://res.cloudinary.com/test/banner.png", "campuspulse/banners/b1")
        );

        mockMvc.perform(multipart("/api/events/{id}/banner", event.getId())
                        .file(file)
                        .header("Authorization", "Bearer " + coordAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(event.getId().intValue())))
                .andExpect(jsonPath("$.bannerUrl", is("https://res.cloudinary.com/test/banner.png")))
                .andExpect(jsonPath("$.bannerPublicId", is("campuspulse/banners/b1")))
                .andExpect(jsonPath("$.status", is("PENDING_REVIEW")));
    }

    @Test
    @DisplayName("Coordinator cannot upload banner to another coordinator's event: 403 Forbidden")
    void testUploadBanner_OtherCoordinator_Forbidden() throws Exception {
        Event event = createTestEvent("Coord A Hackathon", coordinatorA, EventStatus.PUBLISHED);

        MockMultipartFile file = new MockMultipartFile("file", "banner.png", "image/png", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/events/{id}/banner", event.getId())
                        .file(file)
                        .header("Authorization", "Bearer " + coordBToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Unauthenticated upload attempt returns 401 Unauthorized")
    void testUploadBanner_Unauthenticated_Unauthorized() throws Exception {
        Event event = createTestEvent("Hackathon", coordinatorA, EventStatus.PUBLISHED);
        MockMultipartFile file = new MockMultipartFile("file", "banner.png", "image/png", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/events/{id}/banner", event.getId())
                        .file(file))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Main Admin can upload banner to any coordinator's event: 200 OK")
    void testUploadBanner_MainAdmin_Success() throws Exception {
        Event event = createTestEvent("Coord A Hackathon", coordinatorA, EventStatus.PUBLISHED);

        MockMultipartFile file = new MockMultipartFile("file", "admin_banner.png", "image/png", new byte[]{1, 2, 3});
        when(imageStorageService.uploadBanner(any())).thenReturn(
                new ImageUploadResult("https://res.cloudinary.com/test/admin_banner.png", "campuspulse/banners/b_admin")
        );

        mockMvc.perform(multipart("/api/events/{id}/banner", event.getId())
                        .file(file)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bannerUrl", is("https://res.cloudinary.com/test/admin_banner.png")))
                .andExpect(jsonPath("$.bannerPublicId", is("campuspulse/banners/b_admin")));
    }

    @Test
    @DisplayName("Owner coordinator uploads QR code: 200 OK, sets qrCodeUrl and qrCodePublicId")
    void testUploadQrCode_OwnerCoordinator_Success() throws Exception {
        Event event = createTestEvent("Hackathon 2026", coordinatorA, EventStatus.PUBLISHED);

        MockMultipartFile file = new MockMultipartFile("file", "qrcode.png", "image/png", new byte[]{1, 2, 3});
        when(imageStorageService.uploadQrCode(any())).thenReturn(
                new ImageUploadResult("https://res.cloudinary.com/test/qr.png", "campuspulse/qrcodes/qr1")
        );

        mockMvc.perform(multipart("/api/events/{id}/qr", event.getId())
                        .file(file)
                        .header("Authorization", "Bearer " + coordAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.qrCodeUrl", is("https://res.cloudinary.com/test/qr.png")))
                .andExpect(jsonPath("$.qrCodePublicId", is("campuspulse/qrcodes/qr1")));
    }

    @Test
    @DisplayName("Owner coordinator deletes banner: 200 OK, cleans up cloud storage asset")
    void testDeleteBanner_OwnerCoordinator_Success() throws Exception {
        Event event = createTestEvent("Hackathon 2026", coordinatorA, EventStatus.PUBLISHED);
        event.setBannerUrl("https://res.cloudinary.com/test/banner_del.png");
        event.setBannerPublicId("campuspulse/banners/del_1");
        eventRepository.saveAndFlush(event);

        mockMvc.perform(delete("/api/events/{id}/banner", event.getId())
                        .header("Authorization", "Bearer " + coordAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bannerUrl", nullValue()))
                .andExpect(jsonPath("$.bannerPublicId", nullValue()));

        verify(imageStorageService).deleteImage("campuspulse/banners/del_1");
    }

    @Test
    @DisplayName("Owner coordinator deletes QR code: 200 OK, cleans up cloud storage asset")
    void testDeleteQrCode_OwnerCoordinator_Success() throws Exception {
        Event event = createTestEvent("Hackathon 2026", coordinatorA, EventStatus.PUBLISHED);
        event.setQrCodeUrl("https://res.cloudinary.com/test/qr_del.png");
        event.setQrCodePublicId("campuspulse/qrcodes/del_qr");
        eventRepository.saveAndFlush(event);

        mockMvc.perform(delete("/api/events/{id}/qr", event.getId())
                        .header("Authorization", "Bearer " + coordAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.qrCodeUrl", nullValue()))
                .andExpect(jsonPath("$.qrCodePublicId", nullValue()));

        verify(imageStorageService).deleteImage("campuspulse/qrcodes/del_qr");
    }

    @Test
    @DisplayName("Banner replacement safely deletes old asset only after new upload succeeds")
    void testBannerReplacement_DeletesOldAsset() throws Exception {
        Event event = createTestEvent("Hackathon 2026", coordinatorA, EventStatus.PUBLISHED);
        event.setBannerUrl("https://res.cloudinary.com/test/old.png");
        event.setBannerPublicId("campuspulse/banners/old_asset");
        eventRepository.saveAndFlush(event);

        MockMultipartFile file = new MockMultipartFile("file", "new.png", "image/png", new byte[]{1, 2, 3});
        when(imageStorageService.uploadBanner(any())).thenReturn(
                new ImageUploadResult("https://res.cloudinary.com/test/new.png", "campuspulse/banners/new_asset")
        );

        mockMvc.perform(multipart("/api/events/{id}/banner", event.getId())
                        .file(file)
                        .header("Authorization", "Bearer " + coordAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bannerPublicId", is("campuspulse/banners/new_asset")));

        verify(imageStorageService).deleteImage("campuspulse/banners/old_asset");
    }

    @Test
    @DisplayName("Banner replacement does NOT delete old asset if referenced by another event")
    void testBannerReplacement_DoesNotDeleteIfShared() throws Exception {
        Event event1 = createTestEvent("Event 1", coordinatorA, EventStatus.PUBLISHED);
        event1.setBannerUrl("https://res.cloudinary.com/test/shared.png");
        event1.setBannerPublicId("campuspulse/banners/shared_asset");
        eventRepository.saveAndFlush(event1);

        Event event2 = createTestEvent("Event 2", coordinatorB, EventStatus.PUBLISHED);
        event2.setBannerUrl("https://res.cloudinary.com/test/shared.png");
        event2.setBannerPublicId("campuspulse/banners/shared_asset");
        eventRepository.saveAndFlush(event2);

        MockMultipartFile file = new MockMultipartFile("file", "new.png", "image/png", new byte[]{1, 2, 3});
        when(imageStorageService.uploadBanner(any())).thenReturn(
                new ImageUploadResult("https://res.cloudinary.com/test/new.png", "campuspulse/banners/new_asset")
        );

        mockMvc.perform(multipart("/api/events/{id}/banner", event1.getId())
                        .file(file)
                        .header("Authorization", "Bearer " + coordAToken))
                .andExpect(status().isOk());

        // Since event2 still references shared_asset, it must NOT be deleted
        verify(imageStorageService, never()).deleteImage("campuspulse/banners/shared_asset");
    }

    @Test
    @DisplayName("Deleting event cleans up cloud storage assets")
    void testDeleteEvent_CleansUpAssets() throws Exception {
        Event event = createTestEvent("Event to delete", coordinatorA, EventStatus.PUBLISHED);
        event.setBannerPublicId("campuspulse/banners/b_del");
        event.setQrCodePublicId("campuspulse/qrcodes/qr_del");
        eventRepository.saveAndFlush(event);

        mockMvc.perform(delete("/api/events/{id}", event.getId())
                        .header("Authorization", "Bearer " + coordAToken))
                .andExpect(status().isNoContent());

        verify(imageStorageService).deleteImage("campuspulse/banners/b_del");
        verify(imageStorageService).deleteImage("campuspulse/qrcodes/qr_del");
    }
}
