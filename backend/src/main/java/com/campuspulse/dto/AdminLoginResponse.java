package com.campuspulse.dto;

/**
 * Data Transfer Object returned upon successful administrator authentication.
 * Delivers the JWT access token and associated metadata. Never contains password hashes.
 */
public class AdminLoginResponse {

    private String token;
    private String tokenType;
    private long expiresIn;
    private String email;
    private String role;

    public AdminLoginResponse() {
    }

    public AdminLoginResponse(String token, String tokenType, long expiresIn, String email, String role) {
        this.token = token;
        this.tokenType = tokenType;
        this.expiresIn = expiresIn;
        this.email = email;
        this.role = role;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getTokenType() {
        return tokenType;
    }

    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }

    public long getExpiresIn() {
        return expiresIn;
    }

    public void setExpiresIn(long expiresIn) {
        this.expiresIn = expiresIn;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    @Override
    public String toString() {
        return "AdminLoginResponse{" +
                "tokenType='" + tokenType + '\'' +
                ", expiresIn=" + expiresIn +
                ", email='" + email + '\'' +
                ", role='" + role + '\'' +
                '}';
    }
}
