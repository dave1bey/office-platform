package com.office.platform.controller;

import com.office.platform.config.JwtTokenProvider;
import com.office.platform.dto.AuthDto.AuthResponse;
import com.office.platform.dto.AuthDto.LoginRequest;
import com.office.platform.model.Employee;
import com.office.platform.repository.EmployeeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthController(EmployeeRepository employeeRepository,
                          PasswordEncoder passwordEncoder,
                          JwtTokenProvider tokenProvider) {
        this.employeeRepository = employeeRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        Optional<Employee> empOpt = employeeRepository.findByEmail(loginRequest.getEmail().trim());

        if (empOpt.isEmpty()) {
            return ResponseEntity.status(401).body("Invalid email or password");
        }

        Employee emp = empOpt.get();
        // Allow password check, or demo fallback 'password123'
        boolean matches = passwordEncoder.matches(loginRequest.getPassword(), emp.getPasswordHash())
                || "password123".equals(loginRequest.getPassword());

        if (!matches) {
            return ResponseEntity.status(401).body("Invalid email or password");
        }

        String token = tokenProvider.generateToken(emp.getId(), emp.getEmail(), emp.getRole().name(), emp.getPreferredLang());

        AuthResponse response = new AuthResponse(
                token,
                emp.getId(),
                emp.getEmployeeCode(),
                emp.getFullName(),
                emp.getEmail(),
                emp.getRole().name(),
                emp.getPreferredLang()
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal Employee currentEmployee) {
        if (currentEmployee == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        return ResponseEntity.ok(currentEmployee);
    }

    @GetMapping("/employees")
    public ResponseEntity<List<Employee>> getActiveEmployees() {
        return ResponseEntity.ok(employeeRepository.findAll());
    }

    @GetMapping("/search")
    public ResponseEntity<List<Employee>> searchEmployees(@RequestParam("q") String query) {
        return ResponseEntity.ok(employeeRepository.searchEmployees(query));
    }
}

