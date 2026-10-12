package com.campuspulse.repository;

import com.campuspulse.entity.Admin;
import com.campuspulse.entity.CoordinatorRequest;
import com.campuspulse.entity.CoordinatorRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link CoordinatorRequest} entities.
 */
@Repository
public interface CoordinatorRequestRepository extends JpaRepository<CoordinatorRequest, Long> {

    /**
     * Retrieves all coordinator requests submitted by a specific user, ordered most recent first.
     */
    List<CoordinatorRequest> findByUserOrderByRequestedAtDesc(Admin user);

    /**
     * Retrieves the most recent coordinator request submitted by a user.
     */
    Optional<CoordinatorRequest> findTopByUserOrderByRequestedAtDesc(Admin user);

    /**
     * Retrieves requests by status, ordered chronologically (first submitted first).
     */
    List<CoordinatorRequest> findByStatusOrderByRequestedAtAsc(CoordinatorRequestStatus status);

    /**
     * Retrieves all requests ordered most recent first.
     */
    List<CoordinatorRequest> findAllByOrderByRequestedAtDesc();

    /**
     * Checks if a user has any existing request with the given status.
     * Crucial for preventing multiple simultaneous PENDING requests.
     */
    boolean existsByUserAndStatus(Admin user, CoordinatorRequestStatus status);

    /**
     * Finds the latest request for a user with the given status.
     */
    Optional<CoordinatorRequest> findTopByUserAndStatusOrderByRequestedAtDesc(Admin user, CoordinatorRequestStatus status);
}
