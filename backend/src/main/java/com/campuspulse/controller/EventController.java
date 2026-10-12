package com.campuspulse.controller;

import com.campuspulse.dto.EventCreateRequest;
import com.campuspulse.dto.EventResponse;
import com.campuspulse.service.EventService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

/**
 * REST controller exposing API endpoints for managing and discovering campus events.
 * Public users can browse published events; coordinators and admins manage their events.
 */
@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    /**
     * GET /api/events - List all upcoming published events. Publicly accessible.
     */
    @GetMapping
    public ResponseEntity<List<EventResponse>> getUpcomingEvents() {
        List<EventResponse> events = eventService.getUpcomingEvents();
        return ResponseEntity.ok(events);
    }

    /**
     * GET /api/events/{id} - Get details of a single event by ID.
     * Non-published events are accessible only to their creator or Main Admin.
     */
    @GetMapping("/{id}")
    public ResponseEntity<EventResponse> getEventById(@PathVariable Long id) {
        EventResponse event = eventService.getEventById(id);
        return ResponseEntity.ok(event);
    }

    /**
     * GET /api/events/my - List events created by the authenticated coordinator.
     */
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'MAIN_ADMIN', 'ADMIN')")
    public ResponseEntity<List<EventResponse>> getMyEvents(Principal principal) {
        if (principal == null) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(eventService.getMyCoordinatorEvents(principal.getName()));
    }

    /**
     * POST /api/events - Create a new event.
     * Coordinators create events with status PENDING_REVIEW.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('COORDINATOR', 'MAIN_ADMIN', 'ADMIN')")
    public ResponseEntity<EventResponse> createEvent(@Valid @RequestBody EventCreateRequest request,
                                                     Principal principal) {
        if (principal != null) {
            EventResponse created = eventService.createEventWithPrincipal(request, principal.getName());
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        }
        EventResponse createdEvent = eventService.createEvent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdEvent);
    }

    /**
     * PUT /api/events/{id} - Update an existing event.
     * Coordinators can only update their own events; updates return published events to PENDING_REVIEW.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'MAIN_ADMIN', 'ADMIN')")
    public ResponseEntity<EventResponse> updateEvent(@PathVariable Long id,
                                                     @Valid @RequestBody EventCreateRequest request,
                                                     Principal principal) {
        if (principal != null) {
            EventResponse updated = eventService.updateEventWithPrincipal(id, request, principal.getName());
            return ResponseEntity.ok(updated);
        }
        EventResponse updatedEvent = eventService.updateEvent(id, request);
        return ResponseEntity.ok(updatedEvent);
    }

    /**
     * DELETE /api/events/{id} - Delete an event.
     * Coordinators can only delete their own events; Main Admin can delete any event.
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('COORDINATOR', 'MAIN_ADMIN', 'ADMIN')")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id, Principal principal) {
        if (principal != null) {
            eventService.deleteEventWithPrincipal(id, principal.getName());
            return ResponseEntity.noContent().build();
        }
        eventService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }
}
