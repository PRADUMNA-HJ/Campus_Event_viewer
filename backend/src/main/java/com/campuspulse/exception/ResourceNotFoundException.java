package com.campuspulse.exception;

/**
 * Thrown when a requested entity/resource (such as an Event) cannot be found.
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
