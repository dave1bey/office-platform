package com.office.platform.dto;

import com.office.platform.model.Priority;
import com.office.platform.model.Task;
import com.office.platform.model.TaskStatus;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public class TaskDto {
    private Long id;
    private Long actionPlanId;
    private String actionPlanTitle;
    private String title;
    private String description;
    private LocalDate dueDate;
    private Priority priority;
    private int severityWeight;
    private TaskStatus status;
    private Long assignedToId;
    private String assignedToName;
    private String assignedToCode;
    private OffsetDateTime completedAt;
    private String completionNote;
    private OffsetDateTime createdAt;

    public TaskDto() {}

    public static TaskDto fromEntity(Task task) {
        TaskDto dto = new TaskDto();
        dto.setId(task.getId());
        if (task.getActionPlan() != null) {
            dto.setActionPlanId(task.getActionPlan().getId());
            dto.setActionPlanTitle(task.getActionPlan().getTitle());
        }
        dto.setTitle(task.getTitle());
        dto.setDescription(task.getDescription());
        dto.setDueDate(task.getDueDate());
        dto.setPriority(task.getPriority());
        dto.setSeverityWeight(task.getSeverityWeight());
        dto.setStatus(task.getStatus());
        if (task.getAssignedTo() != null) {
            dto.setAssignedToId(task.getAssignedTo().getId());
            dto.setAssignedToName(task.getAssignedTo().getFullName());
            dto.setAssignedToCode(task.getAssignedTo().getEmployeeCode());
        }
        dto.setCompletedAt(task.getCompletedAt());
        dto.setCompletionNote(task.getCompletionNote());
        dto.setCreatedAt(task.getCreatedAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getActionPlanId() { return actionPlanId; }
    public void setActionPlanId(Long actionPlanId) { this.actionPlanId = actionPlanId; }

    public String getActionPlanTitle() { return actionPlanTitle; }
    public void setActionPlanTitle(String actionPlanTitle) { this.actionPlanTitle = actionPlanTitle; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public Priority getPriority() { return priority; }
    public void setPriority(Priority priority) { this.priority = priority; }

    public int getSeverityWeight() { return severityWeight; }
    public void setSeverityWeight(int severityWeight) { this.severityWeight = severityWeight; }

    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus status) { this.status = status; }

    public Long getAssignedToId() { return assignedToId; }
    public void setAssignedToId(Long assignedToId) { this.assignedToId = assignedToId; }

    public String getAssignedToName() { return assignedToName; }
    public void setAssignedToName(String assignedToName) { this.assignedToName = assignedToName; }

    public String getAssignedToCode() { return assignedToCode; }
    public void setAssignedToCode(String assignedToCode) { this.assignedToCode = assignedToCode; }

    public OffsetDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(OffsetDateTime completedAt) { this.completedAt = completedAt; }

    public String getCompletionNote() { return completionNote; }
    public void setCompletionNote(String completionNote) { this.completionNote = completionNote; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}

