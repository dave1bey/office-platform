package com.office.platform.controller;

import com.office.platform.model.ActionPlan;
import com.office.platform.model.Employee;
import com.office.platform.repository.ActionPlanRepository;
import com.office.platform.service.ExcelService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/action-plans")
public class ActionPlanController {

    private final ExcelService excelService;
    private final ActionPlanRepository actionPlanRepository;

    public ActionPlanController(ExcelService excelService, ActionPlanRepository actionPlanRepository) {
        this.excelService = excelService;
        this.actionPlanRepository = actionPlanRepository;
    }

    @GetMapping
    public ResponseEntity<List<ActionPlan>> getAllActionPlans() {
        return ResponseEntity.ok(actionPlanRepository.findAllByOrderByUploadedAtDesc());
    }

    // FR-AP-01 (Excel Parsing): Admin uploads master workbook (.xlsx)
    @PostMapping("/upload")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> uploadMasterPlan(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @AuthenticationPrincipal Employee currentEmployee) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Please upload a valid .xlsx file");
        }

        try {
            ActionPlan plan = excelService.parseAndSaveActionPlan(file, title, currentEmployee);
            return ResponseEntity.ok(plan);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Error parsing Excel workbook: " + e.getMessage());
        }
    }
}

