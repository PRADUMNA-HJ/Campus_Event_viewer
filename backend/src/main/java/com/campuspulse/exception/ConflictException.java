package com.campuspulse.exception;

/**
 * Exception thrown when a requested operation conflicts with the current state of a resource
 * (e.g. duplicate email registration, duplicate pending coordinator request, invalid state transition).
 */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
