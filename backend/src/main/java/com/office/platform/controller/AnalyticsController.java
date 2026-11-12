package com.office.platform.controller;

import com.office.platform.dto.RealTimeDtos.LeaderboardItemDto;
import com.office.platform.service.ExcelService;
import com.office.platform.service.PerformanceAnalyticsService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final PerformanceAnalyticsService analyticsService;
    private final ExcelService excelService;

    public AnalyticsController(PerformanceAnalyticsService analyticsService, ExcelService excelService) {
        this.analyticsService = analyticsService;
        this.excelService = excelService;
    }

    @GetMapping("/leaderboard")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<LeaderboardItemDto>> getLeaderboard(
            @RequestParam(value = "start", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(value = "end", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {

        LocalDate s = start != null ? start : LocalDate.now().with(TemporalAdjusters.firstDayOfMonth());
        LocalDate e = end != null ? end : LocalDate.now().with(TemporalAdjusters.lastDayOfMonth());

        return ResponseEntity.ok(analyticsService.computeLeaderboard(s, e));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> getSummary(
            @RequestParam(value = "start", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(value = "end", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {

        LocalDate s = start != null ? start : LocalDate.now().with(TemporalAdjusters.firstDayOfMonth());
        LocalDate e = end != null ? end : LocalDate.now().with(TemporalAdjusters.lastDayOfMonth());

        return ResponseEntity.ok(analyticsService.computeTeamSummary(s, e));
    }

    // FR-LN-04: Multilingual Excel Report Export preserving UTF-8 Ge'ez characters
    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(value = "start", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(value = "end", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) throws IOException {

        LocalDate s = start != null ? start : LocalDate.now().with(TemporalAdjusters.firstDayOfMonth());
        LocalDate e = end != null ? end : LocalDate.now().with(TemporalAdjusters.lastDayOfMonth());

        byte[] excelBytes = excelService.exportPerformanceReport(s, e);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"team_performance_report_" + s + "_to_" + e + ".xlsx\"")
                .header(HttpHeaders.CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .body(excelBytes);
    }
}

