package com.office.platform.controller;

import com.office.platform.dto.RealTimeDtos.AbsenceAlertDto;
import com.office.platform.model.AbsenceCategory;
import com.office.platform.model.AttendanceRecord;
import com.office.platform.model.Employee;
import com.office.platform.service.AttendanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @PostMapping("/check-in")
    public ResponseEntity<AttendanceRecord> checkIn(@AuthenticationPrincipal Employee currentEmployee) {
        AttendanceRecord record = attendanceService.checkIn(currentEmployee.getId());
        return ResponseEntity.ok(record);
    }

    @PostMapping("/check-out")
    public ResponseEntity<AttendanceRecord> checkOut(@AuthenticationPrincipal Employee currentEmployee) {
        AttendanceRecord record = attendanceService.checkOut(currentEmployee.getId());
        return ResponseEntity.ok(record);
    }

    // FR-AB-01: Staff can report absence for today or future dates
    @PostMapping("/absence")
    public ResponseEntity<AbsenceAlertDto> fileAbsence(
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal Employee currentEmployee) {

        String dateStr = payload.get("date");
        LocalDate date = dateStr != null ? LocalDate.parse(dateStr) : LocalDate.now();

        String catStr = payload.getOrDefault("category", "OTHER");
        AbsenceCategory category = AbsenceCategory.valueOf(catStr.toUpperCase());

        String reason = payload.get("reason");

        AbsenceAlertDto alert = attendanceService.fileAbsence(currentEmployee.getId(), date, category, reason);
        return ResponseEntity.ok(alert);
    }

    // FR-AP-02: Live status indicators Green (Present), Red (Absent Today), Gray (Unrecorded)
    @GetMapping("/live-status")
    public ResponseEntity<List<Map<String, Object>>> getLiveStatuses() {
        return ResponseEntity.ok(attendanceService.getLiveEmployeeStatuses());
    }
}

