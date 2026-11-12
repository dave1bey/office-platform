package com.office.platform.dto;

public class AuthDto {

    public static class LoginRequest {
        private String email;
        private String password;

        public LoginRequest() {}
        public LoginRequest(String email, String password) {
            this.email = email;
            this.password = password;
        }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class AuthResponse {
        private String token;
        private Long userId;
        private String employeeCode;
        private String fullName;
        private String email;
        private String role;
        private String preferredLang;

        public AuthResponse() {}
        public AuthResponse(String token, Long userId, String employeeCode, String fullName, String email, String role, String preferredLang) {
            this.token = token;
            this.userId = userId;
            this.employeeCode = employeeCode;
            this.fullName = fullName;
            this.email = email;
            this.role = role;
            this.preferredLang = preferredLang;
        }

        public String getToken() { return token; }
        public void setToken(String token) { this.token = token; }

        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }

        public String getEmployeeCode() { return employeeCode; }
        public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }

        public String getPreferredLang() { return preferredLang; }
        public void setPreferredLang(String preferredLang) { this.preferredLang = preferredLang; }
    }
}

