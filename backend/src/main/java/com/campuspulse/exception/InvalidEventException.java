package com.campuspulse.exception;

/**
 * Thrown when an event fails business logic validation (e.g. invalid date range).
 */
public class InvalidEventException extends RuntimeException {
    public InvalidEventException(String message) {
        super(message);
    }
}
