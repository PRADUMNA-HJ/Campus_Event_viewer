package com.campuspulse.controller;

import com.campuspulse.dto.AdminLoginRequest;
import com.campuspulse.dto.AdminLoginResponse;
import com.campuspulse.dto.AdminProfileResponse;
import com.campuspulse.exception.GlobalExceptionHandler;
import com.campuspulse.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web layer integration tests for {@link AuthController}.
 * Verifies HTTP response codes, JSON mapping, validation errors, and 401 Unauthorized handling.
 */
@WebMvcTest(controllers = AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AuthService authService;

    @Test
    @DisplayName("POST /api/auth/login: Should return 200 OK and JWT response on valid credentials")
    void testLogin_Success() throws Exception {
        AdminLoginRequest request = new AdminLoginRequest("admin@campuspulse.edu", "Password123!");
        AdminLoginResponse response = new AdminLoginResponse(
                "sample.jwt.token",
                "Bearer",
                86400000L,
                "admin@campuspulse.edu",
                "ADMIN"
        );

        when(authService.login(any(AdminLoginRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", is("sample.jwt.token")))
                .andExpect(jsonPath("$.tokenType", is("Bearer")))
                .andExpect(jsonPath("$.email", is("admin@campuspulse.edu")))
                .andExpect(jsonPath("$.role", is("ADMIN")))
                .andExpect(jsonPath("$.expiresIn", is(86400000)));
    }

    @Test
    @DisplayName("POST /api/auth/login: Should return 401 UNAUTHORIZED when credentials are bad")
    void testLogin_InvalidCredentials_Returns401() throws Exception {
        AdminLoginRequest request = new AdminLoginRequest("admin@campuspulse.edu", "WrongPassword");

        when(authService.login(any(AdminLoginRequest.class)))
                .thenThrow(new BadCredentialsException("Invalid email or password"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.error", is("Unauthorized")))
                .andExpect(jsonPath("$.message", is("Invalid email or password")));
    }

    @Test
    @DisplayName("POST /api/auth/login: Should return 400 BAD_REQUEST when email is blank")
    void testLogin_BlankEmail_Returns400() throws Exception {
        AdminLoginRequest request = new AdminLoginRequest("", "Password123!");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.validationErrors.email").exists());
    }

    @Test
    @DisplayName("POST /api/auth/login: Should return 400 BAD_REQUEST when email format is invalid")
    void testLogin_InvalidEmail_Returns400() throws Exception {
        AdminLoginRequest request = new AdminLoginRequest("not-an-email", "Password123!");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.validationErrors.email").exists());
    }

    @Test
    @DisplayName("POST /api/auth/login: Should return 400 BAD_REQUEST when password is blank")
    void testLogin_BlankPassword_Returns400() throws Exception {
        AdminLoginRequest request = new AdminLoginRequest("admin@campuspulse.edu", "");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.validationErrors.password").exists());
    }

    @Test
    @DisplayName("GET /api/auth/me: Should return 200 OK and safe profile for authenticated admin")
    void testGetMe_Success() throws Exception {
        AdminProfileResponse profile = new AdminProfileResponse(
                1L,
                "admin@campuspulse.edu",
                "ADMIN",
                LocalDateTime.of(2026, 10, 10, 10, 0)
        );

        when(authService.getCurrentAdmin("admin@campuspulse.edu")).thenReturn(profile);

        mockMvc.perform(get("/api/auth/me")
                        .principal(() -> "admin@campuspulse.edu"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.email", is("admin@campuspulse.edu")))
                .andExpect(jsonPath("$.role", is("ADMIN")))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.token").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/auth/me: Should return 401 UNAUTHORIZED when principal is null")
    void testGetMe_Unauthenticated_Returns401() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.message", is("Invalid email or password")));
    }
}
