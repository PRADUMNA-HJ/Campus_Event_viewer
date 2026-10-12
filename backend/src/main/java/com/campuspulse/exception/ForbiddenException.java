package com.campuspulse.exception;

/**
 * Exception thrown when an authenticated user attempts an operation they do not have permission for.
 */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
