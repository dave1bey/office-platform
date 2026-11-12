-- ====================================================================
-- PostgreSQL Relational Database Schema (UTF-8 & Multilingual Ready)
-- Database: attendance_db
-- Encoding: UTF8, LC_COLLATE: en_US.UTF-8, LC_CTYPE: en_US.UTF-8
-- ====================================================================

-- 1. Teams / Sections (Supports Multilingual Names: English, Amharic, Tigrinya, Afaan Oromoo)
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    team_name VARCHAR(150) NOT NULL UNIQUE,
    team_name_am VARCHAR(150), -- Amharic (የልማት ቡድን)
    team_name_ti VARCHAR(150), -- Tigrinya (ናይ ምዕባለ ጋንታ)
    team_name_om VARCHAR(150), -- Afaan Oromoo (Garee Misoomaa)
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Employee Identity & Access Control
CREATE TABLE IF NOT EXISTS employees (
    id BIGSERIAL PRIMARY KEY,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    preferred_lang VARCHAR(10) NOT NULL DEFAULT 'en' CHECK (preferred_lang IN ('en', 'am', 'ti', 'om')),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE' CHECK (role IN ('ADMIN', 'MANAGER', 'EMPLOYEE')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Many-to-Many Team Memberships
CREATE TABLE IF NOT EXISTS employee_teams (
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    PRIMARY KEY (employee_id, team_id)
);

-- 4. Master Ingested Action Plans
CREATE TABLE IF NOT EXISTS action_plans (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(250) NOT NULL,
    source_filename VARCHAR(255) NOT NULL,
    uploaded_by BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Action Plan Deliverables (UTF-8 task titles & descriptions with Severity Weights)
CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    action_plan_id BIGINT REFERENCES action_plans(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    severity_weight INT NOT NULL DEFAULT 2 CHECK (severity_weight IN (1, 2, 3, 4)),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
    assigned_to BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Attendance and Absence Registry (Reason supports Ethiopic and Qubee text)
CREATE TABLE IF NOT EXISTS attendance_records (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LATE')),
    absence_category VARCHAR(50) CHECK (absence_category IN ('MEDICAL', 'EMERGENCY', 'OFFSITE', 'OTHER')),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_employee_attendance_date UNIQUE (employee_id, attendance_date)
);

-- Indices for rapid queries (<100ms)
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_due ON tasks(assigned_to, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance_records(employee_id, attendance_date);

