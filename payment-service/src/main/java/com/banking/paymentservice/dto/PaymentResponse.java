package com.banking.paymentservice.dto;

import com.banking.paymentservice.model.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PaymentResponse {
    private String id;
    private String razorpayOrderId;
    private String razorpayPaymentId;
    private String accountNumber;
    private BigDecimal amount;
    private String currency;
    private PaymentStatus status;
    private String description;
    private String failureReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
