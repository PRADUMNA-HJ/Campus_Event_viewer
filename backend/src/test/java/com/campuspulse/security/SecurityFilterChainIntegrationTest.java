package com.campuspulse.security;

import com.campuspulse.entity.Admin;
import com.campuspulse.entity.Event;
import com.campuspulse.entity.EventStatus;
import com.campuspulse.entity.EventType;
import com.campuspulse.entity.Role;
import com.campuspulse.repository.AdminRepository;
import com.campuspulse.repository.EventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Date;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration tests verifying Spring Security filters, public access rules,
 * JWT authorization on protected endpoints, /api/auth/me profile retrieval, and CORS configuration.
 */
@SpringBootTest
@AutoConfigureMockMvc
class SecurityFilterChainIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private String validAdminToken;
    private String expiredAdminToken;
    private String foreignSignedToken;

    @BeforeEach
    void setUp() {
        eventRepository.deleteAll();
        adminRepository.deleteAll();

        Admin admin = new Admin("admin.security@college.edu", passwordEncoder.encode("Password123!"), Role.ADMIN);
        adminRepository.saveAndFlush(admin);

        validAdminToken = jwtService.generateToken("admin.security@college.edu", "ADMIN");
        expiredAdminToken = jwtService.generateToken("admin.security@college.edu", "ADMIN", -5000L);

        SecretKey foreignKey = Keys.hmacShaKeyFor("differentSecretKeyForJwtSigningMustBeAtLeast256BitsLong2026!".getBytes(StandardCharsets.UTF_8));
        foreignSignedToken = Jwts.builder()
                .subject("admin.security@college.edu")
                .claim("role", "ADMIN")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000L))
                .signWith(foreignKey)
                .compact();
    }

    @Test
    @DisplayName("Public Access: GET /api/events should be accessible without authentication")
    void testPublicAccess_GetEvents_AllowedWithoutToken() throws Exception {
        mockMvc.perform(get("/api/events"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Public Access: POST /api/auth/login should be accessible without authentication")
    void testPublicAccess_PostAuthLogin_AllowedWithoutToken() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nonexistent@college.edu\",\"password\":\"any\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", is("Invalid email or password")));
    }

    @Test
    @DisplayName("Protected Access: POST /api/events without token must return 401 Unauthorized")
    void testProtectedAccess_PostEvents_WithoutToken_Returns401() throws Exception {
        mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.error", is("Unauthorized")));
    }

    @Test
    @DisplayName("Protected Access: PUT /api/events/1 without token must return 401 Unauthorized")
    void testProtectedAccess_PutEvents_WithoutToken_Returns401() throws Exception {
        mockMvc.perform(put("/api/events/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    @DisplayName("Protected Access: DELETE /api/events/1 without token must return 401 Unauthorized")
    void testProtectedAccess_DeleteEvents_WithoutToken_Returns401() throws Exception {
        mockMvc.perform(delete("/api/events/1"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    @DisplayName("Protected Access: POST /api/events with expired token must return 401 Unauthorized")
    void testProtectedAccess_WithExpiredToken_Returns401() throws Exception {
        mockMvc.perform(post("/api/events")
                        .header("Authorization", "Bearer " + expiredAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    @DisplayName("Protected Access: POST /api/events with malformed token must return 401 Unauthorized")
    void testProtectedAccess_WithMalformedToken_Returns401() throws Exception {
        mockMvc.perform(post("/api/events")
                        .header("Authorization", "Bearer not.a.valid.jwt")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    @DisplayName("Protected Access: POST /api/events with valid Admin JWT passes security filter")
    void testProtectedAccess_WithValidAdminJwt_PassesSecurity() throws Exception {
        mockMvc.perform(post("/api/events")
                        .header("Authorization", "Bearer " + validAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")));
    }

    @Test
    @DisplayName("Current Admin: GET /api/auth/me with valid JWT returns safe profile")
    void testGetMe_WithValidJwt_ReturnsProfile() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + validAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("admin.security@college.edu")))
                .andExpect(jsonPath("$.role", is("ADMIN")))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.token").doesNotExist());
    }

    @Test
    @DisplayName("Current Admin: GET /api/auth/me without token returns 401 Unauthorized")
    void testGetMe_WithoutToken_Returns401() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    @DisplayName("Current Admin: GET /api/auth/me with expired token returns 401 Unauthorized")
    void testGetMe_WithExpiredToken_Returns401() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + expiredAdminToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    @DisplayName("Current Admin: GET /api/auth/me with incorrectly signed token returns 401 Unauthorized")
    void testGetMe_WithForeignSignedToken_Returns401() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + foreignSignedToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    @DisplayName("CORS: Preflight OPTIONS request from configured origin http://localhost:5173 is allowed")
    void testCors_PreflightFromConfiguredOrigin_Allowed() throws Exception {
        mockMvc.perform(options("/api/events")
                        .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization,Content-Type"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
    }

    @Test
    @DisplayName("CORS: Preflight request from unauthorized origin does not return allow-origin header")
    void testCors_PreflightFromUnauthorizedOrigin_Rejected() throws Exception {
        mockMvc.perform(options("/api/events")
                        .header(HttpHeaders.ORIGIN, "http://malicious-site.com")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    @Test
    @DisplayName("Deny by Default: Unmapped endpoint is rejected")
    void testDenyByDefault_UnmappedEndpoint_Denied() throws Exception {
        mockMvc.perform(get("/api/nonexistent-route"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("Public Access: GET /api/events/{id} should be accessible without authentication when event exists")
    void testPublicAccess_GetEventById_AllowedWithoutToken() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        Event event = new Event(
                "Public Discovery Event",
                "Description for public event",
                EventType.HACKATHON,
                EventStatus.PUBLISHED,
                "Auditorium B",
                now.plusDays(3),
                now.plusDays(4),
                now.plusDays(1),
                100,
                "Robotics Club",
                "robotics@college.edu",
                "+919876543210",
                null
        );
        Event saved = eventRepository.saveAndFlush(event);

        mockMvc.perform(get("/api/events/" + saved.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(saved.getId().intValue())))
                .andExpect(jsonPath("$.title", is("Public Discovery Event")))
                .andExpect(jsonPath("$.eventType", is("HACKATHON")));
    }

    @Test
    @DisplayName("Public Access: GET /api/events/{id} should return 404 when event does not exist without requiring authentication")
    void testPublicAccess_GetEventById_NotFound_WithoutToken() throws Exception {
        mockMvc.perform(get("/api/events/99999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.message", is("Event not found with id: 99999")));
    }

    @Test
    @DisplayName("Public Access: Expired past events are excluded from upcoming listing but accessible by direct ID")
    void testPublicAccess_ExpiredEventsBehavior() throws Exception {
        LocalDateTime now = LocalDateTime.now();

        // 1. Past completed event
        Event pastEvent = new Event(
                "Past Finished Hackathon",
                "Event from last month",
                EventType.HACKATHON,
                EventStatus.COMPLETED,
                "Lab 1",
                now.minusDays(10),
                now.minusDays(9),
                now.minusDays(12),
                50,
                "Past Club",
                "past@college.edu",
                null,
                null
        );
        Event savedPast = eventRepository.saveAndFlush(pastEvent);

        // 2. Upcoming published event
        Event upcomingEvent = new Event(
                "Upcoming Flagship Hackathon",
                "Event for next week",
                EventType.HACKATHON,
                EventStatus.PUBLISHED,
                "Hall 2",
                now.plusDays(5),
                now.plusDays(6),
                now.plusDays(3),
                100,
                "Future Club",
                "future@college.edu",
                null,
                null
        );
        Event savedUpcoming = eventRepository.saveAndFlush(upcomingEvent);

        // List endpoint should only return the upcoming event
        mockMvc.perform(get("/api/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(savedUpcoming.getId().intValue())))
                .andExpect(jsonPath("$[0].title", is("Upcoming Flagship Hackathon")));

        // Direct ID lookup on past event should still succeed
        mockMvc.perform(get("/api/events/" + savedPast.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(savedPast.getId().intValue())))
                .andExpect(jsonPath("$.title", is("Past Finished Hackathon")));
    }

    @Test
    @DisplayName("Full CRUD Lifecycle: Authenticated admin creates, updates, and deletes event end-to-end")
    void testProtectedAccess_FullEventCrudLifecycle_WithValidAdminJwt() throws Exception {
        LocalDateTime now = LocalDateTime.now();

        // 1. CREATE event via POST /api/events
        String createJson = String.format("""
                {
                    "title": "Full Lifecycle Hackathon",
                    "description": "Integration test event description.",
                    "eventType": "HACKATHON",
                    "status": "PUBLISHED",
                    "location": "Main Auditorium",
                    "startDateTime": "%s",
                    "endDateTime": "%s",
                    "registrationDeadline": "%s",
                    "maxCapacity": 120,
                    "organizerName": "Integration Society",
                    "contactEmail": "society@college.edu",
                    "whatsappNumber": "+919876543210"
                }
                """, now.plusDays(4), now.plusDays(6), now.plusDays(2));

        String createResponseStr = mockMvc.perform(post("/api/events")
                        .header("Authorization", "Bearer " + validAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.title", is("Full Lifecycle Hackathon")))
                .andReturn().getResponse().getContentAsString();

        Long createdId = objectMapper.readTree(createResponseStr).get("id").asLong();

        // 2. READ newly created event publicly
        mockMvc.perform(get("/api/events/" + createdId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Full Lifecycle Hackathon")));

        // 3. UPDATE event via PUT /api/events/{id}
        String updateJson = String.format("""
                {
                    "title": "Full Lifecycle Hackathon - Updated Title",
                    "description": "Updated integration test description.",
                    "eventType": "HACKATHON",
                    "status": "PUBLISHED",
                    "location": "Innovation Hub 2",
                    "startDateTime": "%s",
                    "endDateTime": "%s",
                    "registrationDeadline": "%s",
                    "maxCapacity": 150,
                    "organizerName": "Integration Society",
                    "contactEmail": "society@college.edu"
                }
                """, now.plusDays(4), now.plusDays(6), now.plusDays(2));

        mockMvc.perform(put("/api/events/" + createdId)
                        .header("Authorization", "Bearer " + validAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Full Lifecycle Hackathon - Updated Title")))
                .andExpect(jsonPath("$.location", is("Innovation Hub 2")));

        // 4. DELETE event via DELETE /api/events/{id}
        mockMvc.perform(delete("/api/events/" + createdId)
                        .header("Authorization", "Bearer " + validAdminToken))
                .andExpect(status().isNoContent());

        // 5. VERIFY deletion - public lookup should return 404 NOT_FOUND
        mockMvc.perform(get("/api/events/" + createdId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)));
    }

    @Test
    @DisplayName("Protected Access: Token for non-existent admin email is rejected with 401 Unauthorized")
    void testProtectedAccess_WithNonExistentAdminToken_Returns401() throws Exception {
        String orphanToken = jwtService.generateToken("ghost.admin@college.edu", "ADMIN");

        mockMvc.perform(post("/api/events")
                        .header("Authorization", "Bearer " + orphanToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.error", is("Unauthorized")));
    }

    @Test
    @WithMockUser(username = "student@college.edu", roles = {"STUDENT"})
    @DisplayName("Protected Access: User with non-ADMIN role is rejected with 403 Forbidden")
    void testProtectedAccess_NonAdminRole_Returns403() throws Exception {
        mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)))
                .andExpect(jsonPath("$.error", is("Forbidden")))
                .andExpect(jsonPath("$.message", is("Access denied: insufficient permissions to access this resource")));
    }
}
