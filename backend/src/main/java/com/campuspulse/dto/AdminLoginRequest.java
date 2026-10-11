package com.campuspulse.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Data Transfer Object for administrator login credentials.
 */
public class AdminLoginRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    public AdminLoginRequest() {
    }

    public AdminLoginRequest(String email, String password) {
        this.email = email;
        this.password = password;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    /**
     * Omit password in toString to avoid leaking plain text credentials in logs.
     */
    @Override
    public String toString() {
        return "AdminLoginRequest{" +
                "email='" + email + '\'' +
                '}';
    }
}
