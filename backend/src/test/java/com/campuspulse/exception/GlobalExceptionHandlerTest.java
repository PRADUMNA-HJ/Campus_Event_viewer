package com.campuspulse.exception;

import com.campuspulse.dto.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.lang.reflect.Method;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit and component tests for {@link GlobalExceptionHandler}.
 * Verifies HTTP status codes, structured response schemas, sanitization of error messages,
 * and prevention of sensitive detail leakage (e.g. stack traces or credentials).
 */
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
        request = new MockHttpServletRequest();
        request.setRequestURI("/api/events/test");
    }

    @Test
    @DisplayName("Should return 401 UNAUTHORIZED with sanitized message for BadCredentialsException")
    void testHandleAuthenticationException_BadCredentials() {
        BadCredentialsException ex = new BadCredentialsException("Raw sensitive auth error");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleAuthenticationException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(401);
        assertThat(response.getBody().getError()).isEqualTo("Unauthorized");
        assertThat(response.getBody().getMessage()).isEqualTo("Invalid email or password");
        assertThat(response.getBody().getPath()).isEqualTo("/api/events/test");
        assertThat(response.getBody().getTimestamp()).isNotNull();
    }

    @Test
    @DisplayName("Should return 401 UNAUTHORIZED with sanitized message for generic AuthenticationException")
    void testHandleAuthenticationException_GenericAuthException() {
        AuthenticationException ex = new AuthenticationException("Token verification failed") {};

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleAuthenticationException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("Invalid email or password");
    }

    @Test
    @DisplayName("Should return 404 NOT_FOUND with descriptive message for ResourceNotFoundException")
    void testHandleResourceNotFound() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Event not found with id: 123");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleResourceNotFound(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(404);
        assertThat(response.getBody().getError()).isEqualTo("Not Found");
        assertThat(response.getBody().getMessage()).isEqualTo("Event not found with id: 123");
        assertThat(response.getBody().getPath()).isEqualTo("/api/events/test");
    }

    @Test
    @DisplayName("Should return 400 BAD_REQUEST with domain message for InvalidEventException")
    void testHandleInvalidEvent() {
        InvalidEventException ex = new InvalidEventException("Event end date and time must be after the start date and time");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleInvalidEvent(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(400);
        assertThat(response.getBody().getError()).isEqualTo("Bad Request");
        assertThat(response.getBody().getMessage()).isEqualTo("Event end date and time must be after the start date and time");
        assertThat(response.getBody().getPath()).isEqualTo("/api/events/test");
    }

    @Test
    @DisplayName("Should return 400 BAD_REQUEST with field error map for MethodArgumentNotValidException")
    void testHandleValidationErrors() throws NoSuchMethodException {
        Object target = new Object();
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(target, "eventCreateRequest");
        bindingResult.addError(new FieldError("eventCreateRequest", "title", "Event title is required"));
        bindingResult.addError(new FieldError("eventCreateRequest", "contactEmail", "Contact email must be a valid email address"));

        Method dummyMethod = this.getClass().getDeclaredMethod("setUp");
        MethodParameter parameter = new MethodParameter(dummyMethod, -1);

        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(parameter, bindingResult);

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleValidationErrors(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(400);
        assertThat(response.getBody().getError()).isEqualTo("Bad Request");
        assertThat(response.getBody().getMessage()).isEqualTo("Validation failed for one or more fields");

        Map<String, String> fieldErrors = response.getBody().getValidationErrors();
        assertThat(fieldErrors).isNotNull();
        assertThat(fieldErrors).containsEntry("title", "Event title is required");
        assertThat(fieldErrors).containsEntry("contactEmail", "Contact email must be a valid email address");
    }

    @Test
    @DisplayName("Should return 400 BAD_REQUEST with safe message for HttpMessageNotReadableException (malformed JSON)")
    void testHandleMalformedJson() {
        HttpMessageNotReadableException ex = new HttpMessageNotReadableException(
                "JSON parse error: Unexpected character",
                new MockHttpInputMessage(new byte[0])
        );

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleMalformedJson(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(400);
        assertThat(response.getBody().getError()).isEqualTo("Bad Request");
        assertThat(response.getBody().getMessage()).isEqualTo("Malformed JSON request body or invalid value format");
        assertThat(response.getBody().getPath()).isEqualTo("/api/events/test");
    }

    @Test
    @DisplayName("Should return 400 BAD_REQUEST with parameter name for MethodArgumentTypeMismatchException")
    void testHandleTypeMismatch() throws NoSuchMethodException {
        Method dummyMethod = this.getClass().getDeclaredMethod("setUp");
        MethodParameter parameter = new MethodParameter(dummyMethod, -1);

        MethodArgumentTypeMismatchException ex = new MethodArgumentTypeMismatchException(
                "invalid-id",
                Long.class,
                "id",
                parameter,
                new IllegalArgumentException("Failed to convert")
        );

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleTypeMismatch(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(400);
        assertThat(response.getBody().getError()).isEqualTo("Bad Request");
        assertThat(response.getBody().getMessage()).isEqualTo("Parameter 'id' must be of type 'Long'");
        assertThat(response.getBody().getPath()).isEqualTo("/api/events/test");
    }

    @Test
    @DisplayName("Should return 500 INTERNAL_SERVER_ERROR without leaking stack trace or SQL details for unexpected exceptions")
    void testHandleGenericException_PreventsSensitiveLeakage() {
        RuntimeException ex = new RuntimeException("CRITICAL: Failed to connect to jdbc:postgresql://db:5432/secrets password=123");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleGenericException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(500);
        assertThat(response.getBody().getError()).isEqualTo("Internal Server Error");
        assertThat(response.getBody().getMessage()).isEqualTo("An unexpected internal server error occurred");

        // Verify sensitive string is NEVER exposed in the API response
        assertThat(response.getBody().getMessage()).doesNotContain("postgresql");
        assertThat(response.getBody().getMessage()).doesNotContain("password");
        assertThat(response.getBody().getMessage()).doesNotContain("secrets");
    }
}
