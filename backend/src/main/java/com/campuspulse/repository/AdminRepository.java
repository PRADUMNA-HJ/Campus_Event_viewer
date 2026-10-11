package com.campuspulse.repository;

import com.campuspulse.entity.Admin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data JPA repository for the {@link Admin} entity.
 * Provides standard CRUD operations and query methods for administrator account management.
 */
@Repository
public interface AdminRepository extends JpaRepository<Admin, Long> {

    /**
     * Finds an administrator by exact email address.
     *
     * @param email the administrator email to look up
     * @return an {@link Optional} containing the found Admin, or empty if not found
     */
    Optional<Admin> findByEmail(String email);

    /**
     * Finds an administrator by email address, ignoring case differences.
     *
     * @param email the administrator email to look up
     * @return an {@link Optional} containing the found Admin, or empty if not found
     */
    Optional<Admin> findByEmailIgnoreCase(String email);

    /**
     * Checks if an administrator account exists with the given exact email.
     *
     * @param email the email to verify
     * @return true if an account exists with this email, false otherwise
     */
    boolean existsByEmail(String email);

    /**
     * Checks if an administrator account exists with the given email, ignoring case differences.
     *
     * @param email the email to verify
     * @return true if an account exists with this email, false otherwise
     */
    boolean existsByEmailIgnoreCase(String email);
}
