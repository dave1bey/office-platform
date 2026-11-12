package com.office.platform.service;

import com.office.platform.dto.RealTimeDtos.AbsenceAlertDto;
import com.office.platform.dto.RealTimeDtos.LiveFeedItemDto;
import com.office.platform.dto.TaskDto;
import com.office.platform.model.*;
import com.office.platform.repository.AttendanceRecordRepository;
import com.office.platform.repository.EmployeeRepository;
import com.office.platform.repository.TaskRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AttendanceService {

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final EmployeeRepository employeeRepository;
    private final TaskRepository taskRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public AttendanceService(AttendanceRecordRepository attendanceRecordRepository,
                             EmployeeRepository employeeRepository,
                             TaskRepository taskRepository,
                             SimpMessagingTemplate messagingTemplate) {
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.employeeRepository = employeeRepository;
        this.taskRepository = taskRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public AttendanceRecord checkIn(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found with id: " + employeeId));

        LocalDate today = LocalDate.now();
        OffsetDateTime now = OffsetDateTime.now();

        AttendanceRecord record = attendanceRecordRepository
                .findByEmployee_IdAndAttendanceDate(employeeId, today)
                .orElse(new AttendanceRecord());

        record.setEmployee(employee);
        record.setAttendanceDate(today);
        if (record.getCheckIn() == null) {
            record.setCheckIn(now);
        }
        record.setStatus(AttendanceStatus.PRESENT);

        AttendanceRecord saved = attendanceRecordRepository.save(record);

        // Push real-time event to Admin console
        Map<String, Object> event = new HashMap<>();
        event.put("employeeId", employee.getId());
        event.put("employeeName", employee.getFullName());
        event.put("employeeCode", employee.getEmployeeCode());
        event.put("status", "PRESENT");
        event.put("checkIn", now);

        messagingTemplate.convertAndSend("/topic/admin/attendance", event);

        // Live Feed Ticker
        LiveFeedItemDto feedItem = new LiveFeedItemDto(
                UUID.randomUUID().toString(),
                "CHECK_IN",
                "Employee Checked In",
                employee.getFullName() + " checked in as PRESENT",
                employee.getFullName(),
                "SUCCESS",
                now
        );
        messagingTemplate.convertAndSend("/topic/admin/live-feed", feedItem);

        return saved;
    }

    @Transactional
    public AttendanceRecord checkOut(Long employeeId) {
        LocalDate today = LocalDate.now();
        OffsetDateTime now = OffsetDateTime.now();

        AttendanceRecord record = attendanceRecordRepository
                .findByEmployee_IdAndAttendanceDate(employeeId, today)
                .orElseThrow(() -> new IllegalStateException("Cannot check out without checking in first today"));

        record.setCheckOut(now);
        return attendanceRecordRepository.save(record);
    }

    /**
     * FR-AB-01, FR-AB-02, FR-AB-03: Real-Time Absence Filing & Operational Impact Analysis
     */
    @Transactional
    public AbsenceAlertDto fileAbsence(Long employeeId, LocalDate date, AbsenceCategory category, String reason) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found with id: " + employeeId));

        OffsetDateTime now = OffsetDateTime.now();

        AttendanceRecord record = attendanceRecordRepository
                .findByEmployee_IdAndAttendanceDate(employeeId, date)
                .orElse(new AttendanceRecord());

        record.setEmployee(employee);
        record.setAttendanceDate(date);
        record.setStatus(AttendanceStatus.ABSENT);
        record.setAbsenceCategory(category);
        record.setReason(reason);
        attendanceRecordRepository.save(record);

        // FR-AB-03: Operational Impact Analysis - Cross-reference all deliverables due today
        List<Task> activeTasksDueToday = taskRepository
                .findByAssignedTo_IdAndDueDateAndStatusNot(employeeId, date, TaskStatus.COMPLETED);

        List<TaskDto> tasksAtRisk = activeTasksDueToday.stream()
                .map(TaskDto::fromEntity)
                .collect(Collectors.toList());

        AbsenceAlertDto alert = new AbsenceAlertDto(
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getFullName(),
                date,
                category,
                reason,
                tasksAtRisk,
                now
        );

        // FR-AB-02: STOMP event dispatched to /topic/admin/absences (sub-200ms instantaneous alert)
        messagingTemplate.convertAndSend("/topic/admin/absences", alert);

        // Also broadcast status change to attendance topic
        Map<String, Object> statusEvent = new HashMap<>();
        statusEvent.put("employeeId", employee.getId());
        statusEvent.put("employeeName", employee.getFullName());
        statusEvent.put("employeeCode", employee.getEmployeeCode());
        statusEvent.put("status", "ABSENT");
        statusEvent.put("date", date);
        messagingTemplate.convertAndSend("/topic/admin/attendance", statusEvent);

        // Live Feed Ticker
        LiveFeedItemDto feedItem = new LiveFeedItemDto(
                UUID.randomUUID().toString(),
                "ABSENCE",
                "Absence Filed: " + employee.getFullName(),
                "Reason: " + (reason != null && !reason.isBlank() ? reason : category.name()) + 
                " (" + tasksAtRisk.size() + " deliverables at risk)",
                employee.getFullName(),
                "CRITICAL",
                now
        );
        messagingTemplate.convertAndSend("/topic/admin/live-feed", feedItem);

        return alert;
    }

    /**
     * FR-AP-02: Return live status indicators Green (Present), Red (Absent), Gray (Unrecorded)
     */
    public List<Map<String, Object>> getLiveEmployeeStatuses() {
        LocalDate today = LocalDate.now();
        List<Employee> employees = employeeRepository.findAll();
        Map<Long, AttendanceRecord> todayRecords = attendanceRecordRepository.findByAttendanceDate(today)
                .stream()
                .collect(Collectors.toMap(r -> r.getEmployee().getId(), r -> r, (r1, r2) -> r1));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Employee emp : employees) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", emp.getId());
            map.put("employeeCode", emp.getEmployeeCode());
            map.put("fullName", emp.getFullName());
            map.put("email", emp.getEmail());
            map.put("role", emp.getRole().name());
            map.put("preferredLang", emp.getPreferredLang());
            map.put("teams", emp.getTeams().stream().map(Team::getTeamName).collect(Collectors.toList()));

            AttendanceRecord record = todayRecords.get(emp.getId());
            if (record == null) {
                map.put("statusIndicator", "GRAY"); // Unrecorded
                map.put("status", "UNRECORDED");
            } else if (record.getStatus() == AttendanceStatus.PRESENT || record.getStatus() == AttendanceStatus.LATE) {
                map.put("statusIndicator", "GREEN"); // Present Today
                map.put("status", record.getStatus().name());
            } else {
                map.put("statusIndicator", "RED"); // Absent Today
                map.put("status", "ABSENT");
                map.put("absenceReason", record.getReason());
            }

            result.add(map);
        }
        return result;
    }
}

