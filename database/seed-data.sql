-- Sample Seed Data for Demonstration & Initial Setup
-- Passwords are BCrypt hashes of 'password123'
-- Hash: $2a$10$w0f5Q0sZ76yVz.tXqW76ueK3Xf7jR3q31q82t2eA7mC1j1w/K3t5u (or we provide pre-hashed values)

INSERT INTO teams (team_name, team_name_am, team_name_ti, team_name_om, description) VALUES
('Development', 'የልማት ቡድን', 'ናይ ምዕባለ ጋንታ', 'Garee Misoomaa', 'Software development and engineering'),
('Quality Assurance', 'የጥራት ማረጋገጫ', 'ምርግጋጽ ጽሬት', 'Mirkaneessa Qulqullinaa', 'Testing and quality control'),
('Operations', 'ኦፕሬሽን', 'ኦፕሬሽን', 'Hojii Gaggeessituu', 'Office operations and infrastructure')
ON CONFLICT (team_name) DO NOTHING;

INSERT INTO employees (employee_code, full_name, email, preferred_lang, password_hash, role, is_active) VALUES
('EMP-001', 'Admin User', 'admin@office.lan', 'en', '$2a$10$7Z8lqYlJ5.v8P6P/q5e41eDkmvG.X.gK0XlI4U6jD4l6xX8.lZq0K', 'ADMIN', TRUE),
('EMP-002', 'Abebe Bikila', 'abebe@office.lan', 'am', '$2a$10$7Z8lqYlJ5.v8P6P/q5e41eDkmvG.X.gK0XlI4U6jD4l6xX8.lZq0K', 'MANAGER', TRUE),
('EMP-003', 'Hagos Berhe', 'hagos@office.lan', 'ti', '$2a$10$7Z8lqYlJ5.v8P6P/q5e41eDkmvG.X.gK0XlI4U6jD4l6xX8.lZq0K', 'EMPLOYEE', TRUE),
('EMP-004', 'Tolassa Chala', 'tolassa@office.lan', 'om', '$2a$10$7Z8lqYlJ5.v8P6P/q5e41eDkmvG.X.gK0XlI4U6jD4l6xX8.lZq0K', 'EMPLOYEE', TRUE),
('EMP-005', 'Sara Tesfaye', 'sara@office.lan', 'am', '$2a$10$7Z8lqYlJ5.v8P6P/q5e41eDkmvG.X.gK0XlI4U6jD4l6xX8.lZq0K', 'EMPLOYEE', TRUE)
ON CONFLICT (employee_code) DO NOTHING;

INSERT INTO employee_teams (employee_id, team_id) VALUES
(2, 1),
(3, 1),
(4, 2),
(5, 3)
ON CONFLICT DO NOTHING;

