package com.office.platform.service;

import com.office.platform.dto.RealTimeDtos.LiveFeedItemDto;
import com.office.platform.dto.RealTimeDtos.TaskUpdateDto;
import com.office.platform.dto.TaskDto;
import com.office.platform.model.*;
import com.office.platform.repository.ActionPlanRepository;
import com.office.platform.repository.EmployeeRepository;
import com.office.platform.repository.TaskRepository;
import com.office.platform.repository.TeamRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final EmployeeRepository employeeRepository;
    private final TeamRepository teamRepository;
    private final ActionPlanRepository actionPlanRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public TaskService(TaskRepository taskRepository,
                       EmployeeRepository employeeRepository,
                       TeamRepository teamRepository,
                       ActionPlanRepository actionPlanRepository,
                       SimpMessagingTemplate messagingTemplate) {
        this.taskRepository = taskRepository;
        this.employeeRepository = employeeRepository;
        this.teamRepository = teamRepository;
        this.actionPlanRepository = actionPlanRepository;
        this.messagingTemplate = messagingTemplate;
    }

    public List<TaskDto> getAllTasks() {
        return taskRepository.findAll().stream().map(TaskDto::fromEntity).collect(Collectors.toList());
    }

    public List<TaskDto> getTasksForEmployee(Long employeeId) {
        return taskRepository.findByAssignedTo_Id(employeeId).stream()
                .map(TaskDto::fromEntity)
                .collect(Collectors.toList());
    }

    public List<TaskDto> getTasksForCalendar(Long employeeId, LocalDate start, LocalDate end) {
        if (employeeId != null) {
            return taskRepository.findByAssignedTo_IdAndDueDateBetween(employeeId, start, end).stream()
                    .map(TaskDto::fromEntity)
                    .collect(Collectors.toList());
        }
        return taskRepository.findByDueDateBetween(start, end).stream()
                .map(TaskDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public TaskDto updateTaskStatus(Long taskId, TaskStatus newStatus, String completionNote, Long requestingEmployeeId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found with id: " + taskId));

        OffsetDateTime now = OffsetDateTime.now();
        task.setStatus(newStatus);

        // FR-EP-02: Server-side timestamp and optional completion notes
        if (newStatus == TaskStatus.COMPLETED) {
            task.setCompletedAt(now);
            if (completionNote != null && !completionNote.isBlank()) {
                task.setCompletionNote(completionNote);
            }
        } else if (newStatus == TaskStatus.PENDING || newStatus == TaskStatus.IN_PROGRESS) {
            task.setCompletedAt(null);
            if (completionNote != null) {
                task.setCompletionNote(completionNote);
            }
        }

        Task saved = taskRepository.save(task);

        // Broadcast real-time updates to Section 7 pub/sub topics
        Long empId = task.getAssignedTo() != null ? task.getAssignedTo().getId() : null;
        String empName = task.getAssignedTo() != null ? task.getAssignedTo().getFullName() : "Unassigned";

        TaskUpdateDto updateDto = new TaskUpdateDto(
                saved.getId(),
                saved.getTitle(),
                saved.getStatus(),
                empId,
                empName,
                100.0, // placeholder computed dynamically in UI
                100.0,
                now
        );

        // Broadcast to /topic/tasks/updates
        messagingTemplate.convertAndSend("/topic/tasks/updates", updateDto);

        // Push real-time event to Admin console (/topic/admin/tasks)
        messagingTemplate.convertAndSend("/topic/admin/tasks", TaskDto.fromEntity(saved));

        // Push to Live Feed Ticker (/topic/admin/live-feed)
        String feedMsg = empName + " marked '" + saved.getTitle() + "' as " + newStatus.name();
        if (completionNote != null && !completionNote.isBlank()) {
            feedMsg += " - Note: \"" + completionNote + "\"";
        }
        LiveFeedItemDto feedItem = new LiveFeedItemDto(
                UUID.randomUUID().toString(),
                "TASK_UPDATE",
                "Task Updated: " + newStatus.name(),
                feedMsg,
                empName,
                newStatus == TaskStatus.COMPLETED ? "SUCCESS" : "INFO",
                now
        );
        messagingTemplate.convertAndSend("/topic/admin/live-feed", feedItem);

        return TaskDto.fromEntity(saved);
    }

    @Transactional
    public TaskDto assignTask(Long taskId, Long employeeId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found with id: " + taskId));

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found with id: " + employeeId));

        task.setAssignedTo(employee);
        Task saved = taskRepository.save(task);

        // Section 7: /topic/employee/{id} Admin -> Specific Employee
        Map<String, Object> empNotification = new HashMap<>();
        empNotification.put("taskId", saved.getId());
        empNotification.put("title", saved.getTitle());
        empNotification.put("dueDate", saved.getDueDate());
        empNotification.put("priority", saved.getPriority().name());
        empNotification.put("severityWeight", saved.getSeverityWeight());

        messagingTemplate.convertAndSend("/topic/employee/" + employee.getId(), empNotification);

        // Push live feed
        LiveFeedItemDto feedItem = new LiveFeedItemDto(
                UUID.randomUUID().toString(),
                "TASK_ASSIGNED",
                "Task Assigned",
                "Task '" + saved.getTitle() + "' assigned to " + employee.getFullName(),
                employee.getFullName(),
                "INFO",
                OffsetDateTime.now()
        );
        messagingTemplate.convertAndSend("/topic/admin/live-feed", feedItem);

        return TaskDto.fromEntity(saved);
    }

    /**
     * FR-AP-03: Bulk Group Delegation across an entire team
     */
    @Transactional
    public List<TaskDto> bulkAssignTeam(Long actionPlanId, Integer teamId, String title, String description,
                                        LocalDate dueDate, Priority priority) {
        ActionPlan actionPlan = actionPlanRepository.findById(actionPlanId)
                .orElseThrow(() -> new IllegalArgumentException("Action plan not found with id: " + actionPlanId));

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found with id: " + teamId));

        List<Task> createdTasks = new ArrayList<>();
        OffsetDateTime now = OffsetDateTime.now();

        for (Employee member : team.getMembers()) {
            if (member.isActive()) {
                Task t = new Task();
                t.setActionPlan(actionPlan);
                t.setTitle(title);
                t.setDescription(description);
                t.setDueDate(dueDate);
                t.setPriority(priority);
                t.setSeverityWeight(priority.getDefaultWeight());
                t.setStatus(TaskStatus.PENDING);
                t.setAssignedTo(member);
                t.setCreatedAt(now);

                Task saved = taskRepository.save(t);
                createdTasks.add(saved);

                // Notify member individually
                Map<String, Object> empNotification = new HashMap<>();
                empNotification.put("taskId", saved.getId());
                empNotification.put("title", saved.getTitle());
                empNotification.put("dueDate", saved.getDueDate());
                empNotification.put("priority", saved.getPriority().name());
                messagingTemplate.convertAndSend("/topic/employee/" + member.getId(), empNotification);
            }
        }

        return createdTasks.stream().map(TaskDto::fromEntity).collect(Collectors.toList());
    }
}

