package com.office.platform.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "attendance_records", uniqueConstraints = {
    @UniqueConstraint(name = "uq_employee_attendance_date", columnNames = {"employee_id", "attendance_date"})
})
public class AttendanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Column(name = "check_in")
    private OffsetDateTime checkIn;

    @Column(name = "check_out")
    private OffsetDateTime checkOut;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttendanceStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "absence_category", length = 50)
    private AbsenceCategory absenceCategory;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public AttendanceRecord() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

    public LocalDate getAttendanceDate() { return attendanceDate; }
    public void setAttendanceDate(LocalDate attendanceDate) { this.attendanceDate = attendanceDate; }

    public OffsetDateTime getCheckIn() { return checkIn; }
    public void setCheckIn(OffsetDateTime checkIn) { this.checkIn = checkIn; }

    public OffsetDateTime getCheckOut() { return checkOut; }
    public void setCheckOut(OffsetDateTime checkOut) { this.checkOut = checkOut; }

    public AttendanceStatus getStatus() { return status; }
    public void setStatus(AttendanceStatus status) { this.status = status; }

    public AbsenceCategory getAbsenceCategory() { return absenceCategory; }
    public void setAbsenceCategory(AbsenceCategory absenceCategory) { this.absenceCategory = absenceCategory; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}

