package com.office.platform.controller;

import com.office.platform.dto.TaskDto;
import com.office.platform.model.Employee;
import com.office.platform.model.Priority;
import com.office.platform.model.Role;
import com.office.platform.model.TaskStatus;
import com.office.platform.service.TaskService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public ResponseEntity<List<TaskDto>> getTasks(@RequestParam(value = "employeeId", required = false) Long employeeId,
                                                  @AuthenticationPrincipal Employee currentEmployee) {
        if (currentEmployee.getRole() == Role.EMPLOYEE) {
            // Employee sees own tasks
            return ResponseEntity.ok(taskService.getTasksForEmployee(currentEmployee.getId()));
        }
        if (employeeId != null) {
            return ResponseEntity.ok(taskService.getTasksForEmployee(employeeId));
        }
        return ResponseEntity.ok(taskService.getAllTasks());
    }

    @GetMapping("/calendar")
    public ResponseEntity<List<TaskDto>> getCalendarTasks(
            @RequestParam(value = "start", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(value = "end", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            @RequestParam(value = "employeeId", required = false) Long employeeId,
            @AuthenticationPrincipal Employee currentEmployee) {

        LocalDate s = start != null ? start : LocalDate.now().minusMonths(1);
        LocalDate e = end != null ? end : LocalDate.now().plusMonths(2);

        Long empId = currentEmployee.getRole() == Role.EMPLOYEE ? currentEmployee.getId() : employeeId;
        return ResponseEntity.ok(taskService.getTasksForCalendar(empId, s, e));
    }

    // FR-EP-02: Deliverables follow PENDING -> IN_PROGRESS -> COMPLETED
    @PatchMapping("/{id}/status")
    public ResponseEntity<TaskDto> updateStatus(
            @PathVariable("id") Long taskId,
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal Employee currentEmployee) {

        String statusStr = payload.get("status");
        String note = payload.get("note");
        TaskStatus status = TaskStatus.valueOf(statusStr.toUpperCase());

        TaskDto updated = taskService.updateTaskStatus(taskId, status, note, currentEmployee.getId());
        return ResponseEntity.ok(updated);
    }

    // FR-AP-02: Assign Tasks via Searchable Dropdown
    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<TaskDto> assignTask(
            @PathVariable("id") Long taskId,
            @RequestBody Map<String, Long> payload) {

        Long employeeId = payload.get("employeeId");
        TaskDto updated = taskService.assignTask(taskId, employeeId);
        return ResponseEntity.ok(updated);
    }

    // FR-AP-03: Bulk Group Delegation
    @PostMapping("/bulk-team")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<TaskDto>> bulkAssignTeam(@RequestBody Map<String, Object> payload) {
        Long actionPlanId = Long.valueOf(payload.get("actionPlanId").toString());
        Integer teamId = Integer.valueOf(payload.get("teamId").toString());
        String title = (String) payload.get("title");
        String description = (String) payload.get("description");
        LocalDate dueDate = LocalDate.parse((String) payload.get("dueDate"));
        Priority priority = Priority.fromString((String) payload.get("priority"));

        List<TaskDto> created = taskService.bulkAssignTeam(actionPlanId, teamId, title, description, dueDate, priority);
        return ResponseEntity.ok(created);
    }
}

