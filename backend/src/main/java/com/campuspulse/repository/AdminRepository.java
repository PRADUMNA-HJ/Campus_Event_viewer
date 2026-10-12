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

    /**
     * Finds accounts with a specific role.
     *
     * @param role the role to filter by
     * @return list of matching accounts
     */
    java.util.List<Admin> findByRole(com.campuspulse.entity.Role role);

    /**
     * Finds accounts with a specific role, ordered by creation date descending.
     *
     * @param role the role to filter by
     * @return list of matching accounts
     */
    java.util.List<Admin> findByRoleOrderByCreatedAtDesc(com.campuspulse.entity.Role role);

    /**
     * Counts the number of accounts with the specified role.
     *
     * @param role the role to count
     * @return account count
     */
    long countByRole(com.campuspulse.entity.Role role);

    /**
     * Counts the number of accounts with any of the specified roles.
     *
     * @param roles collection of roles to match
     * @return account count
     */
    long countByRoleIn(java.util.Collection<com.campuspulse.entity.Role> roles);
}

