package com.office.platform.service;

import com.office.platform.dto.RealTimeDtos.LeaderboardItemDto;
import com.office.platform.model.*;
import com.office.platform.repository.ActionPlanRepository;
import com.office.platform.repository.AttendanceRecordRepository;
import com.office.platform.repository.EmployeeRepository;
import com.office.platform.repository.TaskRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class ExcelService {

    private final ActionPlanRepository actionPlanRepository;
    private final TaskRepository taskRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final PerformanceAnalyticsService analyticsService;

    public ExcelService(ActionPlanRepository actionPlanRepository,
                        TaskRepository taskRepository,
                        EmployeeRepository employeeRepository,
                        AttendanceRecordRepository attendanceRecordRepository,
                        PerformanceAnalyticsService analyticsService) {
        this.actionPlanRepository = actionPlanRepository;
        this.taskRepository = taskRepository;
        this.employeeRepository = employeeRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.analyticsService = analyticsService;
    }

    /**
     * FR-AP-01: Ingestion of action plans (.xlsx)
     * Maps Title, Description, Deadline, Priority, and optional Employee Code.
     */
    @Transactional
    public ActionPlan parseAndSaveActionPlan(MultipartFile file, String planTitle, Employee uploadedBy) throws IOException {
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "master-action-plan.xlsx";
        if (planTitle == null || planTitle.isBlank()) {
            planTitle = filename.replace(".xlsx", "");
        }

        ActionPlan actionPlan = new ActionPlan(planTitle, filename, uploadedBy);
        ActionPlan savedPlan = actionPlanRepository.save(actionPlan);

        List<Task> tasksToSave = new ArrayList<>();

        try (InputStream is = file.getInputStream(); Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);

            // Row 0 is header: [Title, Description, Due Date, Priority, Employee Code]
            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                Cell titleCell = row.getCell(0);
                if (titleCell == null || getCellValueAsString(titleCell).isBlank()) continue;

                String title = getCellValueAsString(titleCell).trim();
                String description = row.getCell(1) != null ? getCellValueAsString(row.getCell(1)) : "";

                // Parse Due Date
                LocalDate dueDate = LocalDate.now().plusDays(7); // default 1 week
                Cell dateCell = row.getCell(2);
                if (dateCell != null) {
                    if (dateCell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(dateCell)) {
                        dueDate = dateCell.getLocalDateTimeCellValue().toLocalDate();
                    } else {
                        String dateStr = getCellValueAsString(dateCell).trim();
                        try {
                            dueDate = LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE);
                        } catch (Exception ignored) {
                            try {
                                dueDate = LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                            } catch (Exception ignored2) {}
                        }
                    }
                }

                // Parse Priority & Severity Weight
                Cell priorityCell = row.getCell(3);
                String priorityStr = priorityCell != null ? getCellValueAsString(priorityCell) : "MEDIUM";
                Priority priority = Priority.fromString(priorityStr);
                int severityWeight = priority.getDefaultWeight();

                // Optional Pre-assigned Employee Code
                Employee assignedEmployee = null;
                Cell empCell = row.getCell(4);
                if (empCell != null) {
                    String empCode = getCellValueAsString(empCell).trim();
                    if (!empCode.isBlank()) {
                        assignedEmployee = employeeRepository.findByEmployeeCode(empCode).orElse(null);
                    }
                }

                Task task = new Task();
                task.setActionPlan(savedPlan);
                task.setTitle(title);
                task.setDescription(description);
                task.setDueDate(dueDate);
                task.setPriority(priority);
                task.setSeverityWeight(severityWeight);
                task.setStatus(TaskStatus.PENDING);
                task.setAssignedTo(assignedEmployee);
                task.setCreatedAt(OffsetDateTime.now());

                tasksToSave.add(task);
            }
        }

        taskRepository.saveAll(tasksToSave);
        return savedPlan;
    }

    /**
     * FR-LN-04: Multi-sheet statistical report generation preserving UTF-8 Ge'ez script
     */
    public byte[] exportPerformanceReport(LocalDate start, LocalDate end) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            
            // Header font and style
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setFontName("Segoe UI");

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            // Tab 1: Leaderboard & Performance (የአፈጻጸም ሰንጠረዥ)
            Sheet leaderboardSheet = workbook.createSheet("Leaderboard - የአፈጻጸም");
            String[] headers1 = {
                "Rank / ደረጃ", "Code / መለያ", "Full Name / ሙሉ ስም", "Team / ቡድን", 
                "Tasks / ተግባራት", "Completed / የተጠናቀቀ", "Weighted Rate / ሚዛናዊ ውጤት", 
                "Absent Days / የቀረበት ቀን", "Absence Rate / የቀሪነት መጠን", "Overall Score / አጠቃላይ ነጥብ"
            };

            Row headerRow1 = leaderboardSheet.createRow(0);
            for (int i = 0; i < headers1.length; i++) {
                Cell cell = headerRow1.createCell(i);
                cell.setCellValue(headers1[i]);
                cell.setCellStyle(headerStyle);
            }

            List<LeaderboardItemDto> leaderboard = analyticsService.computeLeaderboard(start, end);
            int rowIdx = 1;
            for (LeaderboardItemDto item : leaderboard) {
                Row row = leaderboardSheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(item.getTaskRank());
                row.createCell(1).setCellValue(item.getEmployeeCode());
                row.createCell(2).setCellValue(item.getFullName());
                row.createCell(3).setCellValue(item.getTeamName());
                row.createCell(4).setCellValue(item.getTotalTasks());
                row.createCell(5).setCellValue(item.getCompletedTasks());
                row.createCell(6).setCellValue(item.getWeightedTaskRate() + "%");
                row.createCell(7).setCellValue(item.getRecordedAbsentDays());
                row.createCell(8).setCellValue(item.getAbsenceRate() + "%");
                row.createCell(9).setCellValue(item.getOverallScore());
            }

            // Tab 2: Attendance Audit Log (የመገኘት እና የቀሪነት መዝገብ)
            Sheet attendanceSheet = workbook.createSheet("Attendance Log - መገኘት");
            String[] headers2 = { "Date / ቀን", "Employee / ሠራተኛ", "Status / ሁኔታ", "Category / ዘርፍ", "Reason / ምክንያት" };
            Row headerRow2 = attendanceSheet.createRow(0);
            for (int i = 0; i < headers2.length; i++) {
                Cell cell = headerRow2.createCell(i);
                cell.setCellValue(headers2[i]);
                cell.setCellStyle(headerStyle);
            }

            List<AttendanceRecord> records = attendanceRecordRepository.findByAttendanceDateBetween(start, end);
            int attRowIdx = 1;
            for (AttendanceRecord r : records) {
                Row row = attendanceSheet.createRow(attRowIdx++);
                row.createCell(0).setCellValue(r.getAttendanceDate().toString());
                row.createCell(1).setCellValue(r.getEmployee().getFullName() + " (" + r.getEmployee().getEmployeeCode() + ")");
                row.createCell(2).setCellValue(r.getStatus().name());
                row.createCell(3).setCellValue(r.getAbsenceCategory() != null ? r.getAbsenceCategory().name() : "N/A");
                row.createCell(4).setCellValue(r.getReason() != null ? r.getReason() : "");
            }

            // Tab 3: Action Plan Tasks (ተግባራት ዝርዝር)
            Sheet taskSheet = workbook.createSheet("Tasks - ተግባራት");
            String[] headers3 = { "Task ID", "Title / ርዕስ", "Due Date / ማብቂያ ቀን", "Severity / ክብደት", "Status / ሁኔታ", "Assigned To / የተመደበለት" };
            Row headerRow3 = taskSheet.createRow(0);
            for (int i = 0; i < headers3.length; i++) {
                Cell cell = headerRow3.createCell(i);
                cell.setCellValue(headers3[i]);
                cell.setCellStyle(headerStyle);
            }

            List<Task> tasks = taskRepository.findByDueDateBetween(start, end);
            int taskRowIdx = 1;
            for (Task t : tasks) {
                Row row = taskSheet.createRow(taskRowIdx++);
                row.createCell(0).setCellValue(t.getId());
                row.createCell(1).setCellValue(t.getTitle());
                row.createCell(2).setCellValue(t.getDueDate().toString());
                row.createCell(3).setCellValue(t.getPriority().name() + " (" + t.getSeverityWeight() + "x)");
                row.createCell(4).setCellValue(t.getStatus().name());
                row.createCell(5).setCellValue(t.getAssignedTo() != null ? t.getAssignedTo().getFullName() : "Unassigned");
            }

            // Auto-size columns for UTF-8 Ge'ez readability
            for (int col = 0; col < 10; col++) {
                leaderboardSheet.autoSizeColumn(col);
            }
            for (int col = 0; col < 5; col++) {
                attendanceSheet.autoSizeColumn(col);
                taskSheet.autoSizeColumn(col);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> "";
        };
    }
}

