package com.campuspulse.security;

import com.campuspulse.entity.Admin;
import com.campuspulse.entity.Role;
import com.campuspulse.repository.AdminRepository;
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
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

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
    private PasswordEncoder passwordEncoder;

    private String validAdminToken;
    private String expiredAdminToken;
    private String foreignSignedToken;

    @BeforeEach
    void setUp() {
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
}
