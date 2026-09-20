package com.banking.accountservice.controller;

import com.banking.accountservice.dto.AuthResponse;
import com.banking.accountservice.dto.LoginRequest;
import com.banking.accountservice.dto.RegisterRequest;
import com.banking.accountservice.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/accounts/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // Public — not behind the gateway's JWT filter.
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    // Public — not behind the gateway's JWT filter.
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    // Behind the gateway's JWT filter, which sets X-User-Email once the
    // token has been validated.
    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me(
            @RequestHeader(value = "X-User-Email", required = false) String email) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        return ResponseEntity.ok(authService.getProfile(email));
    }
}
