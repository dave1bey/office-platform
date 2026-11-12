package com.office.platform.dto;

import com.office.platform.model.AbsenceCategory;
import com.office.platform.model.TaskStatus;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public class RealTimeDtos {

    // Sub-200ms Absence Alert sent to /topic/admin/absences with Operational Impact Analysis (tasksAtRisk)
    public static class AbsenceAlertDto {
        private Long employeeId;
        private String employeeCode;
        private String employeeName;
        private LocalDate absenceDate;
        private AbsenceCategory category;
        private String reason;
        private List<TaskDto> tasksAtRisk;
        private OffsetDateTime timestamp;

        public AbsenceAlertDto() {}

        public AbsenceAlertDto(Long employeeId, String employeeCode, String employeeName, LocalDate absenceDate,
                               AbsenceCategory category, String reason, List<TaskDto> tasksAtRisk, OffsetDateTime timestamp) {
            this.employeeId = employeeId;
            this.employeeCode = employeeCode;
            this.employeeName = employeeName;
            this.absenceDate = absenceDate;
            this.category = category;
            this.reason = reason;
            this.tasksAtRisk = tasksAtRisk;
            this.timestamp = timestamp;
        }

        public Long getEmployeeId() { return employeeId; }
        public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }

        public String getEmployeeCode() { return employeeCode; }
        public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }

        public String getEmployeeName() { return employeeName; }
        public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }

        public LocalDate getAbsenceDate() { return absenceDate; }
        public void setAbsenceDate(LocalDate absenceDate) { this.absenceDate = absenceDate; }

        public AbsenceCategory getCategory() { return category; }
        public void setCategory(AbsenceCategory category) { this.category = category; }

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }

        public List<TaskDto> getTasksAtRisk() { return tasksAtRisk; }
        public void setTasksAtRisk(List<TaskDto> tasksAtRisk) { this.tasksAtRisk = tasksAtRisk; }

        public OffsetDateTime getTimestamp() { return timestamp; }
        public void setTimestamp(OffsetDateTime timestamp) { this.timestamp = timestamp; }
    }

    // Task transition broadcast /topic/tasks/updates
    public static class TaskUpdateDto {
        private Long taskId;
        private String title;
        private TaskStatus status;
        private Long employeeId;
        private String employeeName;
        private double teamRate;
        private double weightedRate;
        private OffsetDateTime timestamp;

        public TaskUpdateDto() {}

        public TaskUpdateDto(Long taskId, String title, TaskStatus status, Long employeeId, String employeeName,
                             double teamRate, double weightedRate, OffsetDateTime timestamp) {
            this.taskId = taskId;
            this.title = title;
            this.status = status;
            this.employeeId = employeeId;
            this.employeeName = employeeName;
            this.teamRate = teamRate;
            this.weightedRate = weightedRate;
            this.timestamp = timestamp;
        }

        public Long getTaskId() { return taskId; }
        public void setTaskId(Long taskId) { this.taskId = taskId; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public TaskStatus getStatus() { return status; }
        public void setStatus(TaskStatus status) { this.status = status; }

        public Long getEmployeeId() { return employeeId; }
        public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }

        public String getEmployeeName() { return employeeName; }
        public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }

        public double getTeamRate() { return teamRate; }
        public void setTeamRate(double teamRate) { this.teamRate = teamRate; }

        public double getWeightedRate() { return weightedRate; }
        public void setWeightedRate(double weightedRate) { this.weightedRate = weightedRate; }

        public OffsetDateTime getTimestamp() { return timestamp; }
        public void setTimestamp(OffsetDateTime timestamp) { this.timestamp = timestamp; }
    }

    // Live Activity Feed for Admin Console /topic/admin/live-feed
    public static class LiveFeedItemDto {
        private String id;
        private String eventType; // "CHECK_IN", "ABSENCE", "TASK_UPDATE", "PLAN_INGESTED"
        private String title;
        private String message;
        private String employeeName;
        private String severity; // "INFO", "WARNING", "CRITICAL", "SUCCESS"
        private OffsetDateTime timestamp;

        public LiveFeedItemDto() {}

        public LiveFeedItemDto(String id, String eventType, String title, String message,
                               String employeeName, String severity, OffsetDateTime timestamp) {
            this.id = id;
            this.eventType = eventType;
            this.title = title;
            this.message = message;
            this.employeeName = employeeName;
            this.severity = severity;
            this.timestamp = timestamp;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getEventType() { return eventType; }
        public void setEventType(String eventType) { this.eventType = eventType; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }

        public String getEmployeeName() { return employeeName; }
        public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }

        public String getSeverity() { return severity; }
        public void setSeverity(String severity) { this.severity = severity; }

        public OffsetDateTime getTimestamp() { return timestamp; }
        public void setTimestamp(OffsetDateTime timestamp) { this.timestamp = timestamp; }
    }

    // Leaderboard item with weighted severity score and absence rate
    public static class LeaderboardItemDto {
        private Long employeeId;
        private String employeeCode;
        private String fullName;
        private String teamName;
        private int totalTasks;
        private int completedTasks;
        private int totalWeight;
        private int completedWeight;
        private double unweightedTaskRate;
        private double weightedTaskRate;
        private int recordedAbsentDays;
        private int totalWorkingDays;
        private double absenceRate;
        private double overallScore; // composite score
        private String todayAttendanceStatus; // "PRESENT", "ABSENT", "UNRECORDED"
        private int taskRank;
        private int absenceRank;

        public LeaderboardItemDto() {}

        // Getters and Setters
        public Long getEmployeeId() { return employeeId; }
        public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }

        public String getEmployeeCode() { return employeeCode; }
        public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }

        public String getTeamName() { return teamName; }
        public void setTeamName(String teamName) { this.teamName = teamName; }

        public int getTotalTasks() { return totalTasks; }
        public void setTotalTasks(int totalTasks) { this.totalTasks = totalTasks; }

        public int getCompletedTasks() { return completedTasks; }
        public void setCompletedTasks(int completedTasks) { this.completedTasks = completedTasks; }

        public int getTotalWeight() { return totalWeight; }
        public void setTotalWeight(int totalWeight) { this.totalWeight = totalWeight; }

        public int getCompletedWeight() { return completedWeight; }
        public void setCompletedWeight(int completedWeight) { this.completedWeight = completedWeight; }

        public double getUnweightedTaskRate() { return unweightedTaskRate; }
        public void setUnweightedTaskRate(double unweightedTaskRate) { this.unweightedTaskRate = unweightedTaskRate; }

        public double getWeightedTaskRate() { return weightedTaskRate; }
        public void setWeightedTaskRate(double weightedTaskRate) { this.weightedTaskRate = weightedTaskRate; }

        public int getRecordedAbsentDays() { return recordedAbsentDays; }
        public void setRecordedAbsentDays(int recordedAbsentDays) { this.recordedAbsentDays = recordedAbsentDays; }

        public int getTotalWorkingDays() { return totalWorkingDays; }
        public void setTotalWorkingDays(int totalWorkingDays) { this.totalWorkingDays = totalWorkingDays; }

        public double getAbsenceRate() { return absenceRate; }
        public void setAbsenceRate(double absenceRate) { this.absenceRate = absenceRate; }

        public double getOverallScore() { return overallScore; }
        public void setOverallScore(double overallScore) { this.overallScore = overallScore; }

        public String getTodayAttendanceStatus() { return todayAttendanceStatus; }
        public void setTodayAttendanceStatus(String todayAttendanceStatus) { this.todayAttendanceStatus = todayAttendanceStatus; }

        public int getTaskRank() { return taskRank; }
        public void setTaskRank(int taskRank) { this.taskRank = taskRank; }

        public int getAbsenceRank() { return absenceRank; }
        public void setAbsenceRank(int absenceRank) { this.absenceRank = absenceRank; }
    }
}

