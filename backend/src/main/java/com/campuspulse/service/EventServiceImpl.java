package com.campuspulse.service;

import com.campuspulse.dto.EventCreateRequest;
import com.campuspulse.dto.EventResponse;
import com.campuspulse.entity.Admin;
import com.campuspulse.entity.Event;
import com.campuspulse.entity.EventStatus;
import com.campuspulse.entity.Role;
import com.campuspulse.exception.ForbiddenException;
import com.campuspulse.exception.InvalidEventException;
import com.campuspulse.exception.ResourceNotFoundException;
import com.campuspulse.repository.AdminRepository;
import com.campuspulse.repository.EventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Implementation of {@link EventService} managing business logic,
 * validation, RBAC ownership, and persistence interactions for campus events.
 */
@Service
@Transactional(readOnly = true)
public class EventServiceImpl implements EventService {

    private final EventRepository eventRepository;

    @Autowired(required = false)
    private AdminRepository adminRepository;

    @Autowired(required = false)
    private AuditLogService auditLogService;

    public EventServiceImpl(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @Autowired
    public EventServiceImpl(EventRepository eventRepository,
                            AdminRepository adminRepository,
                            AuditLogService auditLogService) {
        this.eventRepository = eventRepository;
        this.adminRepository = adminRepository;
        this.auditLogService = auditLogService;
    }

    @Override
    public List<EventResponse> getUpcomingEvents() {
        LocalDateTime now = LocalDateTime.now();
        return eventRepository.findByStartDateTimeAfterOrderByStartDateTimeAsc(now)
                .stream()
                .filter(event -> event.getStatus() == EventStatus.PUBLISHED)
                .map(EventResponse::fromEntity)
                .toList();
    }

    @Override
    public List<EventResponse> getTodayEvents() {
        return getTodayEvents(LocalDate.now());
    }

    /**
     * Retrieves published events that are active on the specified calendar date.
     * Package-private to facilitate deterministic date testing.
     */
    public List<EventResponse> getTodayEvents(LocalDate date) {
        if (date == null) {
            date = LocalDate.now();
        }
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.atTime(23, 59, 59, 999999999);

        return eventRepository.findByStatusOrderByStartDateTimeAsc(EventStatus.PUBLISHED)
                .stream()
                .filter(event -> event.getStartDateTime() != null && event.getEndDateTime() != null)
                .filter(event -> !event.getStartDateTime().isAfter(endOfDay) && !event.getEndDateTime().isBefore(startOfDay))
                .map(EventResponse::fromEntity)
                .toList();
    }

    @Override
    public EventResponse getEventById(Long id) {
        Event event = findEventOrThrow(id);
        if (event.getStatus() != null && !event.getStatus().isPubliclyViewable()) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isPrivileged = auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")
                    && (auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MAIN_ADMIN") || a.getAuthority().equals("ROLE_ADMIN"))
                    || (event.getCreatedBy() != null && event.getCreatedBy().getEmail().equalsIgnoreCase(auth.getName())));
            if (!isPrivileged) {
                throw new ResourceNotFoundException("Event not found with id: " + id);
            }
        }
        return EventResponse.fromEntity(event);
    }

    @Override
    @Transactional
    public EventResponse createEvent(EventCreateRequest request) {
        validateEventDates(
                request.getStartDateTime(),
                request.getEndDateTime(),
                request.getRegistrationDeadline()
        );

        Event event = new Event();
        mapRequestToEntity(request, event);

        Event saved = eventRepository.save(event);
        return EventResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public EventResponse updateEvent(Long id, EventCreateRequest request) {
        Event existing = findEventOrThrow(id);

        validateEventDates(
                request.getStartDateTime(),
                request.getEndDateTime(),
                request.getRegistrationDeadline()
        );

        mapRequestToEntity(request, existing);

        Event updated = eventRepository.save(existing);
        return EventResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public void deleteEvent(Long id) {
        Event existing = findEventOrThrow(id);
        eventRepository.delete(existing);
    }

    @Override
    @Transactional
    public EventResponse createEventWithPrincipal(EventCreateRequest request, String principalEmail) {
        validateEventDates(
                request.getStartDateTime(),
                request.getEndDateTime(),
                request.getRegistrationDeadline()
        );

        Admin actor = findAdminOrThrow(principalEmail);

        Event event = new Event();
        mapRequestToEntity(request, event);
        event.setCreatedBy(actor);

        if (actor.getRole() == Role.COORDINATOR) {
            event.setStatus(EventStatus.PENDING_REVIEW);
        } else if (actor.getRole() == Role.MAIN_ADMIN || actor.getRole() == Role.ADMIN) {
            event.setStatus(request.getStatus() != null ? request.getStatus() : EventStatus.PUBLISHED);
        } else {
            throw new ForbiddenException("Regular users are not allowed to create events");
        }

        Event saved = eventRepository.save(event);

        if (auditLogService != null) {
            auditLogService.logAction(
                    actor.getEmail(),
                    "EVENT_CREATED",
                    "EVENT",
                    saved.getId(),
                    "Created event '" + saved.getTitle() + "' with status " + saved.getStatus()
            );
        }

        return EventResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public EventResponse updateEventWithPrincipal(Long id, EventCreateRequest request, String principalEmail) {
        Event existing = findEventOrThrow(id);
        Admin actor = findAdminOrThrow(principalEmail);

        validateEventDates(
                request.getStartDateTime(),
                request.getEndDateTime(),
                request.getRegistrationDeadline()
        );

        if (actor.getRole() == Role.COORDINATOR) {
            if (existing.getCreatedBy() == null || !existing.getCreatedBy().getId().equals(actor.getId())) {
                throw new ForbiddenException("You can only update events you created");
            }
            existing.setStatus(EventStatus.PENDING_REVIEW);
        } else if (actor.getRole() == Role.MAIN_ADMIN || actor.getRole() == Role.ADMIN) {
            if (request.getStatus() != null) {
                existing.setStatus(request.getStatus());
            }
        } else {
            throw new ForbiddenException("You do not have permission to update events");
        }

        existing.setTitle(request.getTitle());
        existing.setDescription(request.getDescription());
        existing.setEventType(request.getEventType());
        existing.setLocation(request.getLocation());
        existing.setStartDateTime(request.getStartDateTime());
        existing.setEndDateTime(request.getEndDateTime());
        existing.setRegistrationDeadline(request.getRegistrationDeadline());
        existing.setMaxCapacity(request.getMaxCapacity());
        existing.setOrganizerName(request.getOrganizerName());
        existing.setContactEmail(request.getContactEmail());
        existing.setWhatsappNumber(request.getWhatsappNumber());
        existing.setBannerUrl(request.getBannerUrl());
        if (request.getRegistrationUrl() != null) {
            existing.setRegistrationUrl(request.getRegistrationUrl());
        }

        Event updated = eventRepository.save(existing);

        if (auditLogService != null) {
            auditLogService.logAction(
                    actor.getEmail(),
                    "EVENT_UPDATED",
                    "EVENT",
                    updated.getId(),
                    "Updated event '" + updated.getTitle() + "', status now: " + updated.getStatus()
            );
        }

        return EventResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public void deleteEventWithPrincipal(Long id, String principalEmail) {
        Event existing = findEventOrThrow(id);
        Admin actor = findAdminOrThrow(principalEmail);

        if (actor.getRole() == Role.COORDINATOR) {
            if (existing.getCreatedBy() == null || !existing.getCreatedBy().getId().equals(actor.getId())) {
                throw new ForbiddenException("You can only delete events you created");
            }
        } else if (actor.getRole() != Role.MAIN_ADMIN && actor.getRole() != Role.ADMIN) {
            throw new ForbiddenException("You do not have permission to delete events");
        }

        eventRepository.delete(existing);

        if (auditLogService != null) {
            auditLogService.logAction(
                    actor.getEmail(),
                    "EVENT_DELETED",
                    "EVENT",
                    id,
                    "Deleted event '" + existing.getTitle() + "'"
            );
        }
    }

    @Override
    public List<EventResponse> getMyCoordinatorEvents(String coordinatorEmail) {
        Admin coordinator = findAdminOrThrow(coordinatorEmail);
        return eventRepository.findByCreatedByOrderByStartDateTimeAsc(coordinator)
                .stream()
                .map(EventResponse::fromEntity)
                .toList();
    }

    @Override
    public List<EventResponse> getAllEventsAdmin() {
        return eventRepository.findAllByOrderByStartDateTimeAsc()
                .stream()
                .map(EventResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public EventResponse publishEvent(Long id, String adminEmail, String note) {
        Admin admin = findAdminOrThrow(adminEmail);
        Event event = findEventOrThrow(id);

        event.setStatus(EventStatus.PUBLISHED);
        event.setReviewedBy(admin);
        event.setReviewedAt(LocalDateTime.now());
        if (note != null && !note.isBlank()) {
            event.setReviewNote(note.trim());
        }

        Event saved = eventRepository.save(event);

        if (auditLogService != null) {
            auditLogService.logAction(
                    admin.getEmail(),
                    "EVENT_PUBLISHED",
                    "EVENT",
                    saved.getId(),
                    "Published event '" + saved.getTitle() + "'"
            );
        }

        return EventResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public EventResponse rejectEvent(Long id, String adminEmail, String note) {
        Admin admin = findAdminOrThrow(adminEmail);
        Event event = findEventOrThrow(id);

        event.setStatus(EventStatus.REJECTED);
        event.setReviewedBy(admin);
        event.setReviewedAt(LocalDateTime.now());
        if (note != null && !note.isBlank()) {
            event.setReviewNote(note.trim());
        }

        Event saved = eventRepository.save(event);

        if (auditLogService != null) {
            auditLogService.logAction(
                    admin.getEmail(),
                    "EVENT_REJECTED",
                    "EVENT",
                    saved.getId(),
                    "Rejected event '" + saved.getTitle() + "'" + (note != null ? ". Reason: " + note : "")
            );
        }

        return EventResponse.fromEntity(saved);
    }

    private Admin findAdminOrThrow(String email) {
        if (adminRepository == null) {
            throw new ResourceNotFoundException("User repository unavailable");
        }
        return adminRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    private Event findEventOrThrow(Long id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with id: " + id));
    }

    private void validateEventDates(LocalDateTime start, LocalDateTime end, LocalDateTime deadline) {
        if (start == null || end == null) {
            throw new InvalidEventException("Event start and end date/time must not be null");
        }
        if (!end.isAfter(start)) {
            throw new InvalidEventException("Event end date and time must be after the start date and time");
        }
        if (deadline != null && deadline.isAfter(start)) {
            throw new InvalidEventException("Registration deadline must not be after the event start date and time");
        }
    }

    private void mapRequestToEntity(EventCreateRequest request, Event event) {
        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setEventType(request.getEventType());
        event.setStatus(request.getStatus() != null ? request.getStatus() : EventStatus.DRAFT);
        event.setLocation(request.getLocation());
        event.setStartDateTime(request.getStartDateTime());
        event.setEndDateTime(request.getEndDateTime());
        event.setRegistrationDeadline(request.getRegistrationDeadline());
        event.setMaxCapacity(request.getMaxCapacity());
        event.setOrganizerName(request.getOrganizerName());
        event.setContactEmail(request.getContactEmail());
        event.setWhatsappNumber(request.getWhatsappNumber());
        event.setBannerUrl(request.getBannerUrl());
        if (request.getRegistrationUrl() != null) {
            event.setRegistrationUrl(request.getRegistrationUrl());
        }
    }
}
