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

    @Autowired(required = false)
    private ImageStorageService imageStorageService;

    public EventServiceImpl(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    public EventServiceImpl(EventRepository eventRepository,
                            AdminRepository adminRepository,
                            AuditLogService auditLogService) {
        this.eventRepository = eventRepository;
        this.adminRepository = adminRepository;
        this.auditLogService = auditLogService;
    }

    @Autowired
    public EventServiceImpl(EventRepository eventRepository,
                            AdminRepository adminRepository,
                            AuditLogService auditLogService,
                            ImageStorageService imageStorageService) {
        this.eventRepository = eventRepository;
        this.adminRepository = adminRepository;
        this.auditLogService = auditLogService;
        this.imageStorageService = imageStorageService;
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

        String oldBanner = existing.getBannerPublicId();
        String oldQr = existing.getQrCodePublicId();

        mapRequestToEntity(request, existing);

        Event updated = eventRepository.save(existing);

        if (oldBanner != null && !oldBanner.equals(updated.getBannerPublicId())) {
            cleanUpOrphanedAssetIfUnreferenced(oldBanner, id);
        }
        if (oldQr != null && !oldQr.equals(updated.getQrCodePublicId())) {
            cleanUpOrphanedAssetIfUnreferenced(oldQr, id);
        }

        return EventResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public void deleteEvent(Long id) {
        Event existing = findEventOrThrow(id);
        String bannerPublicId = existing.getBannerPublicId();
        String qrPublicId = existing.getQrCodePublicId();

        eventRepository.delete(existing);

        cleanUpOrphanedAssetIfUnreferenced(bannerPublicId, id);
        cleanUpOrphanedAssetIfUnreferenced(qrPublicId, id);
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

        assertCanModifyEvent(existing, actor);

        if (actor.getRole() == Role.COORDINATOR) {
            existing.setStatus(EventStatus.PENDING_REVIEW);
        } else if (actor.getRole() == Role.MAIN_ADMIN || actor.getRole() == Role.ADMIN) {
            if (request.getStatus() != null) {
                existing.setStatus(request.getStatus());
            }
        }

        String oldBanner = existing.getBannerPublicId();
        String oldQr = existing.getQrCodePublicId();

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

        if (Boolean.TRUE.equals(request.getRemoveBanner())) {
            existing.setBannerUrl(null);
            existing.setBannerPublicId(null);
        } else if (request.getBannerUrl() != null) {
            existing.setBannerUrl(request.getBannerUrl());
            if (request.getBannerPublicId() != null) {
                existing.setBannerPublicId(request.getBannerPublicId());
            } else if (oldBanner != null && !request.getBannerUrl().equals(existing.getBannerUrl())) {
                existing.setBannerPublicId(null);
            }
        }

        if (Boolean.TRUE.equals(request.getRemoveQrCode())) {
            existing.setQrCodeUrl(null);
            existing.setQrCodePublicId(null);
        } else if (request.getQrCodeUrl() != null) {
            existing.setQrCodeUrl(request.getQrCodeUrl());
            if (request.getQrCodePublicId() != null) {
                existing.setQrCodePublicId(request.getQrCodePublicId());
            } else if (oldQr != null && !request.getQrCodeUrl().equals(existing.getQrCodeUrl())) {
                existing.setQrCodePublicId(null);
            }
        }

        if (request.getRegistrationUrl() != null) {
            existing.setRegistrationUrl(request.getRegistrationUrl());
        }

        Event updated = eventRepository.save(existing);

        if (oldBanner != null && !oldBanner.equals(updated.getBannerPublicId())) {
            cleanUpOrphanedAssetIfUnreferenced(oldBanner, id);
        }
        if (oldQr != null && !oldQr.equals(updated.getQrCodePublicId())) {
            cleanUpOrphanedAssetIfUnreferenced(oldQr, id);
        }

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

        assertCanModifyEvent(existing, actor);

        String bannerPublicId = existing.getBannerPublicId();
        String qrPublicId = existing.getQrCodePublicId();

        eventRepository.delete(existing);

        cleanUpOrphanedAssetIfUnreferenced(bannerPublicId, id);
        cleanUpOrphanedAssetIfUnreferenced(qrPublicId, id);

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

    @Override
    @Transactional
    public EventResponse createEventWithImages(EventCreateRequest request,
                                               org.springframework.web.multipart.MultipartFile bannerFile,
                                               org.springframework.web.multipart.MultipartFile qrFile,
                                               String principalEmail) {
        validateEventDates(
                request.getStartDateTime(),
                request.getEndDateTime(),
                request.getRegistrationDeadline()
        );

        String newBannerPublicId = null;
        String newQrPublicId = null;

        try {
            if (bannerFile != null && !bannerFile.isEmpty()) {
                if (imageStorageService == null) {
                    throw new InvalidEventException("Image storage service is not available");
                }
                com.campuspulse.dto.ImageUploadResult bannerRes = imageStorageService.uploadBanner(bannerFile);
                request.setBannerUrl(bannerRes.secureUrl());
                request.setBannerPublicId(bannerRes.publicId());
                newBannerPublicId = bannerRes.publicId();
            }

            if (qrFile != null && !qrFile.isEmpty()) {
                if (imageStorageService == null) {
                    throw new InvalidEventException("Image storage service is not available");
                }
                com.campuspulse.dto.ImageUploadResult qrRes = imageStorageService.uploadQrCode(qrFile);
                request.setQrCodeUrl(qrRes.secureUrl());
                request.setQrCodePublicId(qrRes.publicId());
                newQrPublicId = qrRes.publicId();
            }

            if (principalEmail != null) {
                return createEventWithPrincipal(request, principalEmail);
            } else {
                return createEvent(request);
            }
        } catch (Exception ex) {
            if (newBannerPublicId != null && imageStorageService != null) {
                imageStorageService.deleteImage(newBannerPublicId);
            }
            if (newQrPublicId != null && imageStorageService != null) {
                imageStorageService.deleteImage(newQrPublicId);
            }
            throw ex;
        }
    }

    @Override
    @Transactional
    public EventResponse updateEventWithImages(Long id,
                                               EventCreateRequest request,
                                               org.springframework.web.multipart.MultipartFile bannerFile,
                                               org.springframework.web.multipart.MultipartFile qrFile,
                                               String principalEmail) {
        Event existing = findEventOrThrow(id);
        Admin actor = (principalEmail != null) ? findAdminOrThrow(principalEmail) : null;
        if (actor != null) {
            assertCanModifyEvent(existing, actor);
        }

        validateEventDates(
                request.getStartDateTime(),
                request.getEndDateTime(),
                request.getRegistrationDeadline()
        );

        String oldBannerPublicId = existing.getBannerPublicId();
        String oldQrPublicId = existing.getQrCodePublicId();
        String newBannerPublicId = null;
        String newQrPublicId = null;

        try {
            if (bannerFile != null && !bannerFile.isEmpty()) {
                if (imageStorageService == null) {
                    throw new InvalidEventException("Image storage service is not available");
                }
                com.campuspulse.dto.ImageUploadResult bannerRes = imageStorageService.uploadBanner(bannerFile);
                request.setBannerUrl(bannerRes.secureUrl());
                request.setBannerPublicId(bannerRes.publicId());
                newBannerPublicId = bannerRes.publicId();
            }

            if (qrFile != null && !qrFile.isEmpty()) {
                if (imageStorageService == null) {
                    throw new InvalidEventException("Image storage service is not available");
                }
                com.campuspulse.dto.ImageUploadResult qrRes = imageStorageService.uploadQrCode(qrFile);
                request.setQrCodeUrl(qrRes.secureUrl());
                request.setQrCodePublicId(qrRes.publicId());
                newQrPublicId = qrRes.publicId();
            }

            EventResponse updatedResponse = (principalEmail != null)
                    ? updateEventWithPrincipal(id, request, principalEmail)
                    : updateEvent(id, request);

            if (newBannerPublicId != null || Boolean.TRUE.equals(request.getRemoveBanner())) {
                cleanUpOrphanedAssetIfUnreferenced(oldBannerPublicId, id);
            }
            if (newQrPublicId != null || Boolean.TRUE.equals(request.getRemoveQrCode())) {
                cleanUpOrphanedAssetIfUnreferenced(oldQrPublicId, id);
            }

            return updatedResponse;
        } catch (Exception ex) {
            if (newBannerPublicId != null && imageStorageService != null) {
                imageStorageService.deleteImage(newBannerPublicId);
            }
            if (newQrPublicId != null && imageStorageService != null) {
                imageStorageService.deleteImage(newQrPublicId);
            }
            throw ex;
        }
    }

    @Override
    @Transactional
    public EventResponse uploadBanner(Long id, org.springframework.web.multipart.MultipartFile file, String principalEmail) {
        Event existing = findEventOrThrow(id);
        Admin actor = findAdminOrThrow(principalEmail);
        assertCanModifyEvent(existing, actor);

        if (imageStorageService == null) {
            throw new InvalidEventException("Image storage service is not available");
        }

        String oldBannerPublicId = existing.getBannerPublicId();
        com.campuspulse.dto.ImageUploadResult result = imageStorageService.uploadBanner(file);

        existing.setBannerUrl(result.secureUrl());
        existing.setBannerPublicId(result.publicId());

        if (actor.getRole() == Role.COORDINATOR) {
            existing.setStatus(EventStatus.PENDING_REVIEW);
        }

        Event updated = eventRepository.save(existing);

        if (oldBannerPublicId != null && !oldBannerPublicId.equals(result.publicId())) {
            cleanUpOrphanedAssetIfUnreferenced(oldBannerPublicId, id);
        }

        if (auditLogService != null) {
            auditLogService.logAction(
                    actor.getEmail(),
                    "EVENT_BANNER_UPLOADED",
                    "EVENT",
                    updated.getId(),
                    "Uploaded banner for event '" + updated.getTitle() + "'"
            );
        }

        return EventResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public EventResponse deleteBanner(Long id, String principalEmail) {
        Event existing = findEventOrThrow(id);
        Admin actor = findAdminOrThrow(principalEmail);
        assertCanModifyEvent(existing, actor);

        String oldBannerPublicId = existing.getBannerPublicId();
        existing.setBannerUrl(null);
        existing.setBannerPublicId(null);

        if (actor.getRole() == Role.COORDINATOR) {
            existing.setStatus(EventStatus.PENDING_REVIEW);
        }

        Event updated = eventRepository.save(existing);
        cleanUpOrphanedAssetIfUnreferenced(oldBannerPublicId, id);

        if (auditLogService != null) {
            auditLogService.logAction(
                    actor.getEmail(),
                    "EVENT_BANNER_DELETED",
                    "EVENT",
                    updated.getId(),
                    "Deleted banner for event '" + updated.getTitle() + "'"
            );
        }

        return EventResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public EventResponse uploadQrCode(Long id, org.springframework.web.multipart.MultipartFile file, String principalEmail) {
        Event existing = findEventOrThrow(id);
        Admin actor = findAdminOrThrow(principalEmail);
        assertCanModifyEvent(existing, actor);

        if (imageStorageService == null) {
            throw new InvalidEventException("Image storage service is not available");
        }

        String oldQrPublicId = existing.getQrCodePublicId();
        com.campuspulse.dto.ImageUploadResult result = imageStorageService.uploadQrCode(file);

        existing.setQrCodeUrl(result.secureUrl());
        existing.setQrCodePublicId(result.publicId());

        if (actor.getRole() == Role.COORDINATOR) {
            existing.setStatus(EventStatus.PENDING_REVIEW);
        }

        Event updated = eventRepository.save(existing);

        if (oldQrPublicId != null && !oldQrPublicId.equals(result.publicId())) {
            cleanUpOrphanedAssetIfUnreferenced(oldQrPublicId, id);
        }

        if (auditLogService != null) {
            auditLogService.logAction(
                    actor.getEmail(),
                    "EVENT_QR_UPLOADED",
                    "EVENT",
                    updated.getId(),
                    "Uploaded QR code for event '" + updated.getTitle() + "'"
            );
        }

        return EventResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public EventResponse deleteQrCode(Long id, String principalEmail) {
        Event existing = findEventOrThrow(id);
        Admin actor = findAdminOrThrow(principalEmail);
        assertCanModifyEvent(existing, actor);

        String oldQrPublicId = existing.getQrCodePublicId();
        existing.setQrCodeUrl(null);
        existing.setQrCodePublicId(null);

        if (actor.getRole() == Role.COORDINATOR) {
            existing.setStatus(EventStatus.PENDING_REVIEW);
        }

        Event updated = eventRepository.save(existing);
        cleanUpOrphanedAssetIfUnreferenced(oldQrPublicId, id);

        if (auditLogService != null) {
            auditLogService.logAction(
                    actor.getEmail(),
                    "EVENT_QR_DELETED",
                    "EVENT",
                    updated.getId(),
                    "Deleted QR code for event '" + updated.getTitle() + "'"
            );
        }

        return EventResponse.fromEntity(updated);
    }

    private void cleanUpOrphanedAssetIfUnreferenced(String publicId, Long eventId) {
        if (publicId == null || publicId.isBlank() || imageStorageService == null) {
            return;
        }
        boolean isReferencedByOther = eventRepository.existsByBannerPublicIdAndIdNot(publicId, eventId)
                || eventRepository.existsByQrCodePublicIdAndIdNot(publicId, eventId);
        if (!isReferencedByOther) {
            imageStorageService.deleteImage(publicId);
        }
    }

    private void assertCanModifyEvent(Event event, Admin actor) {
        if (actor.getRole() == Role.COORDINATOR) {
            if (event.getCreatedBy() == null || !event.getCreatedBy().getId().equals(actor.getId())) {
                throw new ForbiddenException("You can only modify events you created");
            }
        } else if (actor.getRole() != Role.MAIN_ADMIN && actor.getRole() != Role.ADMIN) {
            throw new ForbiddenException("You do not have permission to modify events");
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

        if (Boolean.TRUE.equals(request.getRemoveBanner())) {
            event.setBannerUrl(null);
            event.setBannerPublicId(null);
        } else {
            if (request.getBannerUrl() != null) {
                event.setBannerUrl(request.getBannerUrl());
            }
            if (request.getBannerPublicId() != null) {
                event.setBannerPublicId(request.getBannerPublicId());
            }
        }

        if (Boolean.TRUE.equals(request.getRemoveQrCode())) {
            event.setQrCodeUrl(null);
            event.setQrCodePublicId(null);
        } else {
            if (request.getQrCodeUrl() != null) {
                event.setQrCodeUrl(request.getQrCodeUrl());
            }
            if (request.getQrCodePublicId() != null) {
                event.setQrCodePublicId(request.getQrCodePublicId());
            }
        }

        if (request.getRegistrationUrl() != null) {
            event.setRegistrationUrl(request.getRegistrationUrl());
        }
    }
}
