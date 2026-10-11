package com.campuspulse.config;

import com.campuspulse.security.JwtAccessDeniedHandler;
import com.campuspulse.security.JwtAuthenticationEntryPoint;
import com.campuspulse.security.JwtAuthenticationFilter;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Core security configuration for CampusPulse.
 * Configures stateless JWT-based authentication, explicit CORS policies,
 * fine-grained role-based endpoint access control, and password encoding.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final ObjectProvider<JwtAuthenticationFilter> jwtFilterProvider;
    private final ObjectProvider<JwtAuthenticationEntryPoint> entryPointProvider;
    private final ObjectProvider<JwtAccessDeniedHandler> accessDeniedHandlerProvider;
    private final String allowedOrigins;

    public SecurityConfig(ObjectProvider<JwtAuthenticationFilter> jwtFilterProvider,
                          ObjectProvider<JwtAuthenticationEntryPoint> entryPointProvider,
                          ObjectProvider<JwtAccessDeniedHandler> accessDeniedHandlerProvider,
                          @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}") String allowedOrigins) {
        this.jwtFilterProvider = jwtFilterProvider;
        this.entryPointProvider = entryPointProvider;
        this.accessDeniedHandlerProvider = accessDeniedHandlerProvider;
        this.allowedOrigins = allowedOrigins;
    }

    /**
     * Exposes a BCrypt password encoder for secure password hashing and verification.
     * Uses standard work factor (10).
     *
     * @return a {@link BCryptPasswordEncoder} instance
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Configures explicit CORS settings for the frontend application.
     * Prevents wildcards with credentials and restricts allowed methods and headers.
     *
     * @return configured {@link CorsConfigurationSource}
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();

        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L); // 1 hour preflight cache

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * Configures the HTTP security filter chain:
     * - Disables CSRF for stateless REST operations.
     * - Configures explicit CORS handling.
     * - Enforces stateless session management.
     * - Allows public access to POST /api/auth/login and GET /api/events/**.
     * - Restricts GET /api/auth/me to authenticated administrators (ROLE_ADMIN).
     * - Restricts mutating event endpoints (POST, PUT, DELETE) to authenticated administrators (ROLE_ADMIN).
     * - Denies all other endpoints by default.
     * - Integrates JWT authentication filter, entry point, and access denied handler.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        JwtAuthenticationEntryPoint entryPoint = entryPointProvider.getIfAvailable();
        JwtAccessDeniedHandler accessDeniedHandler = accessDeniedHandlerProvider.getIfAvailable();
        JwtAuthenticationFilter jwtFilter = jwtFilterProvider.getIfAvailable();

        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Preflight OPTIONS requests for CORS
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Public administrator login
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        // Public read-only event discovery for students and visitors
                        .requestMatchers(HttpMethod.GET, "/api/events", "/api/events/**").permitAll()
                        // Local development H2 Web Console
                        .requestMatchers("/h2-console/**").permitAll()
                        // Authenticated admin profile
                        .requestMatchers(HttpMethod.GET, "/api/auth/me").hasRole("ADMIN")
                        // Protected admin event management endpoints
                        .requestMatchers(HttpMethod.POST, "/api/events", "/api/events/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/events/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/events/**").hasRole("ADMIN")
                        // Deny all other routes by default
                        .anyRequest().denyAll()
                )
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()));

        if (entryPoint != null || accessDeniedHandler != null) {
            http.exceptionHandling(ex -> {
                if (entryPoint != null) {
                    ex.authenticationEntryPoint(entryPoint);
                }
                if (accessDeniedHandler != null) {
                    ex.accessDeniedHandler(accessDeniedHandler);
                }
            });
        }

        if (jwtFilter != null) {
            http.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        }

        return http.build();
    }
}
