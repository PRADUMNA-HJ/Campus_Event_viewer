package com.campuspulse.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link JwtService}.
 * Verifies token generation, claims extraction, expiration, signature verification, and tamper rejection.
 */
class JwtServiceTest {

    private static final String TEST_SECRET = "testSecretKeyForJwtSigningMustBeAtLeast256BitsLong2026SecureKey!";
    private static final long TEST_EXPIRATION_MS = 60_000L; // 1 minute

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(TEST_SECRET, TEST_EXPIRATION_MS);
    }

    @Test
    @DisplayName("Should generate a valid token and correctly extract subject and role")
    void testGenerateAndExtractClaims() {
        String email = "admin@campuspulse.edu";
        String role = "ADMIN";

        String token = jwtService.generateToken(email, role);

        assertThat(token).isNotBlank();
        assertThat(jwtService.extractEmail(token)).isEqualTo(email);
        assertThat(jwtService.extractRole(token)).isEqualTo(role);
        assertThat(jwtService.validateToken(token)).isTrue();
    }

    @Test
    @DisplayName("Should successfully validate an active, unexpired token")
    void testValidateToken_ValidTokenReturnsTrue() {
        String token = jwtService.generateToken("organizer@college.edu", "ADMIN");

        boolean isValid = jwtService.validateToken(token);

        assertThat(isValid).isTrue();
    }

    @Test
    @DisplayName("Should reject an expired token")
    void testValidateToken_ExpiredTokenReturnsFalse() {
        // Generate token with negative expiration duration (-1000 ms)
        String expiredToken = jwtService.generateToken("expired@college.edu", "ADMIN", -1000L);

        boolean isValid = jwtService.validateToken(expiredToken);

        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Should reject a malformed or corrupted token string")
    void testValidateToken_MalformedTokenReturnsFalse() {
        assertThat(jwtService.validateToken("not.a.valid.jwt")).isFalse();
        assertThat(jwtService.validateToken("random-string-token")).isFalse();
        assertThat(jwtService.validateToken("")).isFalse();
        assertThat(jwtService.validateToken(null)).isFalse();
    }

    @Test
    @DisplayName("Should reject a token signed with a different secret key")
    void testValidateToken_IncorrectlySignedTokenReturnsFalse() {
        String foreignSecret = "differentSecretKeyForJwtSigningMustBeAtLeast256BitsLong2026!";
        SecretKey foreignKey = Keys.hmacShaKeyFor(foreignSecret.getBytes(StandardCharsets.UTF_8));

        String foreignToken = Jwts.builder()
                .subject("tampered@college.edu")
                .claim("role", "ADMIN")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000L))
                .signWith(foreignKey)
                .compact();

        boolean isValid = jwtService.validateToken(foreignToken);

        assertThat(isValid).isFalse();
    }
}
