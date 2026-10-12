package com.campuspulse.security;

import com.campuspulse.entity.Admin;
import com.campuspulse.entity.Role;
import com.campuspulse.repository.AdminRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for Role-Based Authentication, Registration, and Account Status verification.
 */
@SpringBootTest
@AutoConfigureMockMvc
class RbacAuthenticationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        adminRepository.deleteAll();
    }

    @Test
    @DisplayName("POST /api/auth/register: Public registration always creates ROLE_USER accounts")
    void testRegister_AlwaysCreatesRoleUser() throws Exception {
        String payload = """
                {
                    "name": "Jane Student",
                    "email": "jane.student@college.edu",
                    "password": "Password123!"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email", is("jane.student@college.edu")))
                .andExpect(jsonPath("$.role", is("USER")))
                .andExpect(jsonPath("$.enabled", is(true)))
                .andExpect(jsonPath("$.password").doesNotExist());

        Admin saved = adminRepository.findByEmailIgnoreCase("jane.student@college.edu").orElseThrow();
        assertThat(saved.getRole()).isEqualTo(Role.USER);
        assertThat(passwordEncoder.matches("Password123!", saved.getPassword())).isTrue();
    }

    @Test
    @DisplayName("POST /api/auth/register: Public request cannot assign privileged role (payload role ignored)")
    void testRegister_CannotAssignPrivilegedRole() throws Exception {
        String payload = """
                {
                    "name": "Attacker",
                    "email": "attacker@college.edu",
                    "password": "Password123!",
                    "role": "MAIN_ADMIN"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role", is("USER")));

        Admin saved = adminRepository.findByEmailIgnoreCase("attacker@college.edu").orElseThrow();
        assertThat(saved.getRole()).isEqualTo(Role.USER);
    }

    @Test
    @DisplayName("POST /api/auth/register: Duplicate email registration returns 409 Conflict")
    void testRegister_DuplicateEmail_Returns409() throws Exception {
        Admin existing = new Admin("Jane Student", "jane.student@college.edu", passwordEncoder.encode("Pass123!"), Role.USER);
        adminRepository.saveAndFlush(existing);

        String payload = """
                {
                    "name": "Jane Imposter",
                    "email": "JANE.STUDENT@COLLEGE.EDU",
                    "password": "AnotherPassword123!"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.message", is("Email is already registered")));
    }

    @Test
    @DisplayName("POST /api/auth/login: Valid login succeeds and returns JWT with user role")
    void testLogin_ValidCredentials_Success() throws Exception {
        Admin user = new Admin("Regular User", "user@college.edu", passwordEncoder.encode("SecretPassword123!"), Role.USER);
        adminRepository.saveAndFlush(user);

        String loginPayload = """
                {
                    "email": "user@college.edu",
                    "password": "SecretPassword123!"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.tokenType", is("Bearer")))
                .andExpect(jsonPath("$.role", is("USER")))
                .andExpect(jsonPath("$.email", is("user@college.edu")));
    }

    @Test
    @DisplayName("POST /api/auth/login: Invalid credentials returns 401 with generic error")
    void testLogin_InvalidCredentials_Returns401() throws Exception {
        Admin user = new Admin("Regular User", "user@college.edu", passwordEncoder.encode("SecretPassword123!"), Role.USER);
        adminRepository.saveAndFlush(user);

        String loginPayload = """
                {
                    "email": "user@college.edu",
                    "password": "WrongPassword!"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginPayload))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.message", is("Invalid email or password")));
    }

    @Test
    @DisplayName("Disabled account cannot log in or access protected APIs")
    void testDisabledAccount_CannotLoginOrAccessApis() throws Exception {
        Admin disabledUser = new Admin("Disabled User", "disabled@college.edu", passwordEncoder.encode("Pass123!"), Role.COORDINATOR);
        disabledUser.setEnabled(false);
        adminRepository.saveAndFlush(disabledUser);

        // 1. Login attempt fails
        String loginPayload = """
                {
                    "email": "disabled@college.edu",
                    "password": "Pass123!"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginPayload))
                .andExpect(status().isUnauthorized());

        // 2. Protected request using a previously issued valid token fails immediately
        String token = jwtService.generateToken("disabled@college.edu", "COORDINATOR");

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }
}
