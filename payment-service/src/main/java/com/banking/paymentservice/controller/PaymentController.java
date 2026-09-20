package com.banking.paymentservice.controller;

import com.banking.paymentservice.dto.CreatePaymentRequest;
import com.banking.paymentservice.dto.PaymentOrderResponse;
import com.banking.paymentservice.service.PaymentService;
import com.razorpay.RazorpayException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;

    // Create Razorpay payment order
    @PostMapping("/create-order")
    public ResponseEntity<PaymentOrderResponse> createPaymentOrder(
            @Valid @RequestBody CreatePaymentRequest request)
            throws RazorpayException {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentService.createPaymentOrder(request));
    }

    // Poll payment status (e.g. after the Razorpay Checkout widget closes,
    // while waiting for the webhook to confirm the payment).
    @GetMapping("/{paymentId}")
    public ResponseEntity<com.banking.paymentservice.dto.PaymentResponse> getPayment(
            @PathVariable String paymentId) {
        return ResponseEntity.ok(paymentService.getPayment(paymentId));
    }

    // Payment history for an account
    @GetMapping("/account/{accountNumber}")
    public ResponseEntity<java.util.List<com.banking.paymentservice.dto.PaymentResponse>> getPaymentsByAccount(
            @PathVariable String accountNumber) {
        return ResponseEntity.ok(paymentService.getPaymentsByAccount(accountNumber));
    }

    // Razorpay webhook endpoint
    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestBody Map<String, Object> payload) {
        log.info("Webhook received from Razorpay");
        paymentService.handleWebhook(payload);
        return ResponseEntity.ok("Webhook processed");
    }
}
