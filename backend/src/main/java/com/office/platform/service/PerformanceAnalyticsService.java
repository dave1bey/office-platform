package com.office.platform.service;

import com.office.platform.dto.RealTimeDtos.LeaderboardItemDto;
import com.office.platform.model.AttendanceRecord;
import com.office.platform.model.AttendanceStatus;
import com.office.platform.model.Employee;
import com.office.platform.model.Task;
import com.office.platform.model.TaskStatus;
import com.office.platform.repository.AttendanceRecordRepository;
import com.office.platform.repository.EmployeeRepository;
import com.office.platform.repository.TaskRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PerformanceAnalyticsService {

    private final EmployeeRepository employeeRepository;
    private final TaskRepository taskRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;

    public PerformanceAnalyticsService(EmployeeRepository employeeRepository,
                                       TaskRepository taskRepository,
                                       AttendanceRecordRepository attendanceRecordRepository) {
        this.employeeRepository = employeeRepository;
        this.taskRepository = taskRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
    }

    /**
     * Compute leaderboard with weighted task accomplishment rate & absence rate over a date window
     */
    public List<LeaderboardItemDto> computeLeaderboard(LocalDate startDate, LocalDate endDate) {
        List<Employee> employees = employeeRepository.findAll().stream()
                .filter(Employee::isActive)
                .collect(Collectors.toList());

        List<LeaderboardItemDto> items = new ArrayList<>();
        LocalDate today = LocalDate.now();

        // Approximate working days in the window (default 20 for standard month or days between)
        long totalWorkingDays = Math.max(1, java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) + 1);

        for (Employee emp : employees) {
            LeaderboardItemDto item = new LeaderboardItemDto();
            item.setEmployeeId(emp.getId());
            item.setEmployeeCode(emp.getEmployeeCode());
            item.setFullName(emp.getFullName());
            item.setTeamName(emp.getTeams().isEmpty() ? "General" : emp.getTeams().iterator().next().getTeamName());
            item.setTotalWorkingDays((int) totalWorkingDays);

            // Fetch tasks for date range
            List<Task> tasks = taskRepository.findByAssignedTo_IdAndDueDateBetween(emp.getId(), startDate, endDate);
            int totalTasks = tasks.size();
            int completedTasks = 0;
            int totalWeight = 0;
            int completedWeight = 0;

            for (Task t : tasks) {
                int weight = Math.max(1, t.getSeverityWeight());
                totalWeight += weight;
                if (t.getStatus() == TaskStatus.COMPLETED) {
                    completedTasks++;
                    completedWeight += weight;
                }
            }

            item.setTotalTasks(totalTasks);
            item.setCompletedTasks(completedTasks);
            item.setTotalWeight(totalWeight);
            item.setCompletedWeight(completedWeight);

            // Unweighted Task Accomplishment Rate (%) = (Completed / Total) * 100
            double unweightedRate = totalTasks > 0 ? ((double) completedTasks / totalTasks) * 100.0 : 0.0;
            item.setUnweightedTaskRate(Math.round(unweightedRate * 10.0) / 10.0);

            // Weighted Task Accomplishment Rate (%) = (Sum Completed Weight / Sum Total Weight) * 100
            double weightedRate = totalWeight > 0 ? ((double) completedWeight / totalWeight) * 100.0 : 0.0;
            item.setWeightedTaskRate(Math.round(weightedRate * 10.0) / 10.0);

            // Attendance & Absence Calculations
            List<AttendanceRecord> records = attendanceRecordRepository.findByEmployee_IdAndAttendanceDateBetween(emp.getId(), startDate, endDate);
            long absentDays = records.stream().filter(r -> r.getStatus() == AttendanceStatus.ABSENT).count();
            item.setRecordedAbsentDays((int) absentDays);

            // Individual Absence Rate (%) = (Days Absent / Configured Working Days) * 100
            double absenceRate = ((double) absentDays / totalWorkingDays) * 100.0;
            item.setAbsenceRate(Math.round(absenceRate * 10.0) / 10.0);

            // Overall Operational Score (0-100): 70% weighted task rate + 30% reliability
            double reliability = Math.max(0, 100.0 - absenceRate);
            double overall = (0.70 * weightedRate) + (0.30 * reliability);
            item.setOverallScore(Math.round(overall * 10.0) / 10.0);

            // Live status today
            Optional<AttendanceRecord> todayRecord = attendanceRecordRepository.findByEmployee_IdAndAttendanceDate(emp.getId(), today);
            if (todayRecord.isPresent()) {
                item.setTodayAttendanceStatus(todayRecord.get().getStatus().name());
            } else {
                item.setTodayAttendanceStatus("UNRECORDED");
            }

            items.add(item);
        }

        // Rank by Weighted Task Accomplishment Rate (Descending)
        items.sort((a, b) -> Double.compare(b.getWeightedTaskRate(), a.getWeightedTaskRate()));
        for (int i = 0; i < items.size(); i++) {
            items.get(i).setTaskRank(i + 1);
        }

        // Rank by Attendance Reliability (Lowest Absence Rate first)
        List<LeaderboardItemDto> sortedByAbsence = new ArrayList<>(items);
        sortedByAbsence.sort(Comparator.comparingDouble(LeaderboardItemDto::getAbsenceRate));
        for (int i = 0; i < sortedByAbsence.size(); i++) {
            sortedByAbsence.get(i).setAbsenceRank(i + 1);
        }

        return items;
    }

    /**
     * Compute team accomplishment and absenteeism rate (Section 5)
     */
    public Map<String, Object> computeTeamSummary(LocalDate startDate, LocalDate endDate) {
        List<LeaderboardItemDto> leaderboard = computeLeaderboard(startDate, endDate);

        int totalTasks = leaderboard.stream().mapToInt(LeaderboardItemDto::getTotalTasks).sum();
        int completedTasks = leaderboard.stream().mapToInt(LeaderboardItemDto::getCompletedTasks).sum();
        int totalWeight = leaderboard.stream().mapToInt(LeaderboardItemDto::getTotalWeight).sum();
        int completedWeight = leaderboard.stream().mapToInt(LeaderboardItemDto::getCompletedWeight).sum();

        double teamAccomplishmentRate = totalTasks > 0 ? ((double) completedTasks / totalTasks) * 100.0 : 0.0;
        double teamWeightedAccomplishmentRate = totalWeight > 0 ? ((double) completedWeight / totalWeight) * 100.0 : 0.0;

        int totalAbsentDays = leaderboard.stream().mapToInt(LeaderboardItemDto::getRecordedAbsentDays).sum();
        int activeTeamSize = Math.max(1, leaderboard.size());
        long workingDays = Math.max(1, java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) + 1);

        // Team Absenteeism Rate (%) = [ Total Absent Days / ( Working Days * Team Size ) ] * 100
        double teamAbsenteeismRate = ((double) totalAbsentDays / (workingDays * activeTeamSize)) * 100.0;

        Map<String, Object> summary = new HashMap<>();
        summary.put("teamSize", activeTeamSize);
        summary.put("totalTasks", totalTasks);
        summary.put("completedTasks", completedTasks);
        summary.put("teamAccomplishmentRate", Math.round(teamAccomplishmentRate * 10.0) / 10.0);
        summary.put("teamWeightedAccomplishmentRate", Math.round(teamWeightedAccomplishmentRate * 10.0) / 10.0);
        summary.put("totalAbsentDays", totalAbsentDays);
        summary.put("teamAbsenteeismRate", Math.round(teamAbsenteeismRate * 10.0) / 10.0);

        return summary;
    }
}

