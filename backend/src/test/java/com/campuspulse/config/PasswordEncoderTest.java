package com.campuspulse.config;

import com.campuspulse.entity.Admin;
import com.campuspulse.entity.Role;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests for Spring Security {@link PasswordEncoder} configuration and behavior.
 * Verifies that passwords are cryptographic hashes and that plain texts are never exposed.
 */
@SpringBootTest
class PasswordEncoderTest {

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("Should hash passwords instead of storing raw plain-text")
    void testPasswordEncoder_HashesPasswordInsteadOfPlaintext() {
        String rawPassword = "SuperAdminPassword!2026";
        String encodedHash = passwordEncoder.encode(rawPassword);

        assertThat(encodedHash)
                .isNotNull()
                .isNotEqualTo(rawPassword)
                .startsWith("$2a$")
                .hasSizeGreaterThanOrEqualTo(60);
    }

    @Test
    @DisplayName("Should correctly match the raw password with its generated hash")
    void testPasswordEncoder_CorrectPasswordMatchesHash() {
        String rawPassword = "CorrectPassword#99";
        String encodedHash = passwordEncoder.encode(rawPassword);

        assertThat(passwordEncoder.matches(rawPassword, encodedHash)).isTrue();
    }

    @Test
    @DisplayName("Should reject incorrect passwords against the stored hash")
    void testPasswordEncoder_IncorrectPasswordFailsMatch() {
        String rawPassword = "RealSecretPassword";
        String encodedHash = passwordEncoder.encode(rawPassword);

        assertThat(passwordEncoder.matches("WrongSecretPassword", encodedHash)).isFalse();
        assertThat(passwordEncoder.matches("realsecretpassword", encodedHash)).isFalse();
        assertThat(passwordEncoder.matches("", encodedHash)).isFalse();
    }

    @Test
    @DisplayName("Should generate different salt hashes for identical raw passwords")
    void testPasswordEncoder_GeneratesUniqueSaltPerHash() {
        String rawPassword = "IdenticalRawPassword";

        String hash1 = passwordEncoder.encode(rawPassword);
        String hash2 = passwordEncoder.encode(rawPassword);

        assertThat(hash1).isNotEqualTo(hash2);
        assertThat(passwordEncoder.matches(rawPassword, hash1)).isTrue();
        assertThat(passwordEncoder.matches(rawPassword, hash2)).isTrue();
    }

    @Test
    @DisplayName("Should ensure Admin.toString() never leaks password hash or plain-text")
    void testAdminEntity_NeverExposesPasswordInToString() {
        String rawPassword = "HiddenPassword!456";
        String encodedHash = passwordEncoder.encode(rawPassword);

        Admin admin = new Admin("admin.audit@college.edu", encodedHash, Role.ADMIN);
        String stringRepresentation = admin.toString();

        assertThat(stringRepresentation).doesNotContain(rawPassword);
        assertThat(stringRepresentation).doesNotContain(encodedHash);
        assertThat(stringRepresentation).contains("admin.audit@college.edu");
        assertThat(stringRepresentation).contains("role=ADMIN");
    }
}
