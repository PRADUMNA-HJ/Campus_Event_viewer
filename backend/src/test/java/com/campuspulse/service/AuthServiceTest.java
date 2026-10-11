package com.campuspulse.service;

import com.campuspulse.dto.AdminLoginRequest;
import com.campuspulse.dto.AdminLoginResponse;
import com.campuspulse.entity.Admin;
import com.campuspulse.entity.Role;
import com.campuspulse.repository.AdminRepository;
import com.campuspulse.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link AuthService}.
 * Verifies authentication logic, credential verification, and generic error handling.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AdminRepository adminRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    private Admin sampleAdmin;

    @BeforeEach
    void setUp() {
        sampleAdmin = new Admin("admin@campuspulse.edu", "$2a$10$hashedPasswordHere", Role.ADMIN);
        sampleAdmin.setId(1L);
    }

    @Test
    @DisplayName("Should successfully authenticate admin and return JWT response")
    void testLogin_Success() {
        AdminLoginRequest request = new AdminLoginRequest("admin@campuspulse.edu", "CorrectPassword123!");

        when(adminRepository.findByEmailIgnoreCase("admin@campuspulse.edu")).thenReturn(Optional.of(sampleAdmin));
        when(passwordEncoder.matches("CorrectPassword123!", sampleAdmin.getPassword())).thenReturn(true);
        when(jwtService.generateToken("admin@campuspulse.edu", "ADMIN")).thenReturn("mock.jwt.token");
        when(jwtService.getExpirationMs()).thenReturn(86400000L);

        AdminLoginResponse response = authService.login(request);

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("mock.jwt.token");
        assertThat(response.getTokenType()).isEqualTo("Bearer");
        assertThat(response.getEmail()).isEqualTo("admin@campuspulse.edu");
        assertThat(response.getRole()).isEqualTo("ADMIN");
        assertThat(response.getExpiresIn()).isEqualTo(86400000L);

        verify(jwtService).generateToken("admin@campuspulse.edu", "ADMIN");
    }

    @Test
    @DisplayName("Should throw BadCredentialsException when email is not found")
    void testLogin_UnknownEmail_ThrowsBadCredentials() {
        AdminLoginRequest request = new AdminLoginRequest("unknown@campuspulse.edu", "AnyPassword");

        when(adminRepository.findByEmailIgnoreCase("unknown@campuspulse.edu")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Invalid email or password");

        verify(passwordEncoder, never()).matches(anyString(), anyString());
        verify(jwtService, never()).generateToken(anyString(), anyString());
    }

    @Test
    @DisplayName("Should throw BadCredentialsException when password does not match")
    void testLogin_IncorrectPassword_ThrowsBadCredentials() {
        AdminLoginRequest request = new AdminLoginRequest("admin@campuspulse.edu", "WrongPassword");

        when(adminRepository.findByEmailIgnoreCase("admin@campuspulse.edu")).thenReturn(Optional.of(sampleAdmin));
        when(passwordEncoder.matches("WrongPassword", sampleAdmin.getPassword())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Invalid email or password");

        verify(jwtService, never()).generateToken(anyString(), anyString());
    }

    @Test
    @DisplayName("Should perform case-insensitive lookup for admin email")
    void testLogin_CaseInsensitiveEmailLookup() {
        AdminLoginRequest request = new AdminLoginRequest("ADMIN@CAMPUSPULSE.EDU", "CorrectPassword123!");

        when(adminRepository.findByEmailIgnoreCase("ADMIN@CAMPUSPULSE.EDU")).thenReturn(Optional.of(sampleAdmin));
        when(passwordEncoder.matches("CorrectPassword123!", sampleAdmin.getPassword())).thenReturn(true);
        when(jwtService.generateToken("admin@campuspulse.edu", "ADMIN")).thenReturn("mock.jwt.token");
        when(jwtService.getExpirationMs()).thenReturn(86400000L);

        AdminLoginResponse response = authService.login(request);

        assertThat(response.getToken()).isEqualTo("mock.jwt.token");
        verify(adminRepository).findByEmailIgnoreCase("ADMIN@CAMPUSPULSE.EDU");
    }
}
