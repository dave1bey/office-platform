package com.office.platform.repository;

import com.office.platform.model.AttendanceRecord;
import com.office.platform.model.AttendanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    Optional<AttendanceRecord> findByEmployee_IdAndAttendanceDate(Long employeeId, LocalDate attendanceDate);
    
    List<AttendanceRecord> findByAttendanceDate(LocalDate attendanceDate);
    
    List<AttendanceRecord> findByEmployee_IdAndAttendanceDateBetween(Long employeeId, LocalDate startDate, LocalDate endDate);
    
    List<AttendanceRecord> findByAttendanceDateBetween(LocalDate startDate, LocalDate endDate);

    long countByEmployee_IdAndStatusAndAttendanceDateBetween(Long employeeId, AttendanceStatus status, LocalDate start, LocalDate end);
}

