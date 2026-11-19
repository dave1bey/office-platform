-- Sample Seed Data for Demonstration & Initial Setup
-- Passwords are BCrypt hashes of 'password123'
-- Hash: $2a$10$w0f5Q0sZ76yVz.tXqW76ueK3Xf7jR3q31q82t2eA7mC1j1w/K3t5u (or we provide pre-hashed values)

-- Placeholder groups removed: new groups are created dynamically by the administrator.

INSERT INTO employees (employee_code, full_name, email, preferred_lang, password_hash, role, is_active) VALUES
('EMP-001', 'Admin User', 'admin@office.lan', 'en', '$2a$10$7Z8lqYlJ5.v8P6P/q5e41eDkmvG.X.gK0XlI4U6jD4l6xX8.lZq0K', 'ADMIN', TRUE),
('EMP-002', 'Abebe Bikila', 'abebe@office.lan', 'am', '$2a$10$7Z8lqYlJ5.v8P6P/q5e41eDkmvG.X.gK0XlI4U6jD4l6xX8.lZq0K', 'MANAGER', TRUE),
('EMP-003', 'Hagos Berhe', 'hagos@office.lan', 'ti', '$2a$10$7Z8lqYlJ5.v8P6P/q5e41eDkmvG.X.gK0XlI4U6jD4l6xX8.lZq0K', 'EMPLOYEE', TRUE),
('EMP-004', 'Tolassa Chala', 'tolassa@office.lan', 'om', '$2a$10$7Z8lqYlJ5.v8P6P/q5e41eDkmvG.X.gK0XlI4U6jD4l6xX8.lZq0K', 'EMPLOYEE', TRUE),
('EMP-005', 'Sara Tesfaye', 'sara@office.lan', 'am', '$2a$10$7Z8lqYlJ5.v8P6P/q5e41eDkmvG.X.gK0XlI4U6jD4l6xX8.lZq0K', 'EMPLOYEE', TRUE)
ON CONFLICT (employee_code) DO NOTHING;

