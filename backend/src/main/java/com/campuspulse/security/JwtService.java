package com.campuspulse.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Service for issuing, parsing, and validating JSON Web Tokens (JWT).
 * Reads the signing key from application configuration (or JWT_SECRET env var).
 */
@Service
public class JwtService {

    private final String secret;
    private final long expirationMs;

    public JwtService(
            @Value("${jwt.secret:campusPulseSuperSecretKeyForJwtSigningMustBeAtLeast256BitsLong2026}") String secret,
            @Value("${jwt.expiration-ms:86400000}") long expirationMs) {
        this.secret = secret;
        this.expirationMs = expirationMs;
    }

    /**
     * Builds HMAC-SHA SecretKey from secret bytes.
     */
    private SecretKey getSigningKey() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Generates a signed JWT with standard claims (subject, issuedAt, expiration) and custom role.
     *
     * @param email administrator email (token subject)
     * @param role  assigned role (e.g., ADMIN)
     * @return signed compact JWT string
     */
    public String generateToken(String email, String role) {
        return generateToken(email, role, this.expirationMs);
    }

    /**
     * Generates a signed JWT with a custom expiration duration (useful for test scenarios).
     */
    public String generateToken(String email, String role, long customExpirationMs) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + customExpirationMs);

        return Jwts.builder()
                .subject(email)
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Extracts all claims from a signed JWT after verifying the signature and validity.
     *
     * @param token compact JWT
     * @return parsed {@link Claims} payload
     * @throws JwtException if token is invalid, expired, or signature does not match
     */
    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Extracts the subject (email) from the token.
     */
    public String extractEmail(String token) {
        return extractAllClaims(token).getSubject();
    }

    /**
     * Extracts the role claim from the token.
     */
    public String extractRole(String token) {
        return extractAllClaims(token).get("role", String.class);
    }

    /**
     * Checks if a token is valid, unexpired, and correctly signed.
     *
     * @param token candidate JWT
     * @return true if valid and unexpired, false otherwise
     */
    public boolean validateToken(String token) {
        try {
            Claims claims = extractAllClaims(token);
            return claims.getExpiration() != null && claims.getExpiration().after(new Date());
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    public long getExpirationMs() {
        return expirationMs;
    }
}
