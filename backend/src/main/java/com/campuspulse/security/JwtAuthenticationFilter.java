package com.campuspulse.security;

import com.campuspulse.entity.Admin;
import com.campuspulse.repository.AdminRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

/**
 * Filter that intercepts incoming HTTP requests to validate JWT Bearer tokens
 * and authenticate administrators into Spring Security's SecurityContext.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final ObjectProvider<JwtService> jwtServiceProvider;
    private final ObjectProvider<AdminRepository> adminRepositoryProvider;

    public JwtAuthenticationFilter(ObjectProvider<JwtService> jwtServiceProvider,
                                   ObjectProvider<AdminRepository> adminRepositoryProvider) {
        this.jwtServiceProvider = jwtServiceProvider;
        this.adminRepositoryProvider = adminRepositoryProvider;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        JwtService jwtService = jwtServiceProvider.getIfAvailable();
        AdminRepository adminRepository = adminRepositoryProvider.getIfAvailable();

        if (jwtService == null || adminRepository == null) {
            filterChain.doFilter(request, response);
            return;
        }

        final String token = authHeader.substring(7);

        if (jwtService.validateToken(token)) {
            String email = jwtService.extractEmail(token);

            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                Optional<Admin> adminOptional = adminRepository.findByEmailIgnoreCase(email);

                if (adminOptional.isPresent()) {
                    Admin admin = adminOptional.get();

                    if (!admin.isEnabled()) {
                        SecurityContextHolder.clearContext();
                        filterChain.doFilter(request, response);
                        return;
                    }

                    String roleName = admin.getRole() != null ? admin.getRole().name() : "USER";
                    List<SimpleGrantedAuthority> authorities;
                    if (admin.getRole() == com.campuspulse.entity.Role.MAIN_ADMIN || admin.getRole() == com.campuspulse.entity.Role.ADMIN) {
                        authorities = List.of(
                                new SimpleGrantedAuthority("ROLE_MAIN_ADMIN"),
                                new SimpleGrantedAuthority("ROLE_ADMIN")
                        );
                    } else {
                        authorities = List.of(
                                new SimpleGrantedAuthority("ROLE_" + roleName)
                        );
                    }

                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(admin.getEmail(), null, authorities);
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
