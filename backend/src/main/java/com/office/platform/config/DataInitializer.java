package com.office.platform.config;

import com.office.platform.model.*;
import com.office.platform.repository.ActionPlanRepository;
import com.office.platform.repository.AttendanceRecordRepository;
import com.office.platform.repository.EmployeeRepository;
import com.office.platform.repository.TaskRepository;
import com.office.platform.repository.TeamRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Set;

@Component
public class DataInitializer implements CommandLineRunner {

    private final EmployeeRepository employeeRepository;
    private final TeamRepository teamRepository;
    private final ActionPlanRepository actionPlanRepository;
    private final TaskRepository taskRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(EmployeeRepository employeeRepository,
                           TeamRepository teamRepository,
                           ActionPlanRepository actionPlanRepository,
                           TaskRepository taskRepository,
                           AttendanceRecordRepository attendanceRecordRepository,
                           PasswordEncoder passwordEncoder) {
        this.employeeRepository = employeeRepository;
        this.teamRepository = teamRepository;
        this.actionPlanRepository = actionPlanRepository;
        this.taskRepository = taskRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (employeeRepository.count() > 0) {
            return; // Already initialized
        }

        // 1. Employees (Sequential CBS IDs starting with CBS-01)
        String defaultHash = passwordEncoder.encode("password123");

        Employee admin = new Employee();
        admin.setEmployeeCode("CBS-01");
        admin.setFullName("Admin User");
        admin.setEmail("admin@office.lan");
        admin.setPreferredLang("en");
        admin.setPasswordHash(defaultHash);
        admin.setRole(Role.ADMIN);
        employeeRepository.save(admin);

        Employee manager = new Employee();
        manager.setEmployeeCode("CBS-02");
        manager.setFullName("Abebe Bikila");
        manager.setEmail("abebe@office.lan");
        manager.setPreferredLang("am");
        manager.setPasswordHash(defaultHash);
        manager.setRole(Role.MANAGER);
        employeeRepository.save(manager);

        Employee emp1 = new Employee();
        emp1.setEmployeeCode("CBS-03");
        emp1.setFullName("Hagos Berhe");
        emp1.setEmail("hagos@office.lan");
        emp1.setPreferredLang("ti");
        emp1.setPasswordHash(defaultHash);
        emp1.setRole(Role.EMPLOYEE);
        employeeRepository.save(emp1);

        Employee emp2 = new Employee();
        emp2.setEmployeeCode("CBS-04");
        emp2.setFullName("Tolassa Chala");
        emp2.setEmail("tolassa@office.lan");
        emp2.setPreferredLang("om");
        emp2.setPasswordHash(defaultHash);
        emp2.setRole(Role.EMPLOYEE);
        employeeRepository.save(emp2);

        Employee emp3 = new Employee();
        emp3.setEmployeeCode("CBS-05");
        emp3.setFullName("Sara Tesfaye");
        emp3.setEmail("sara@office.lan");
        emp3.setPreferredLang("am");
        emp3.setPasswordHash(defaultHash);
        emp3.setRole(Role.EMPLOYEE);
        employeeRepository.save(emp3);

        // 3. Sample Master Action Plan
        ActionPlan masterPlan = new ActionPlan("Q4 Strategic Operational Plan", "master_action_plan_q4.xlsx", admin);
        actionPlanRepository.save(masterPlan);

        LocalDate today = LocalDate.now();

        // Sample Tasks with priorities & weights
        Task t1 = new Task();
        t1.setActionPlan(masterPlan);
        t1.setTitle("Deploy Core Backend & Security Gateway");
        t1.setDescription("Set up JWT authentication, Spring WebSocket STOMP broker, and database schemas.");
        t1.setDueDate(today);
        t1.setPriority(Priority.CRITICAL); // 4x weight
        t1.setSeverityWeight(4);
        t1.setStatus(TaskStatus.COMPLETED);
        t1.setAssignedTo(emp1);
        t1.setCompletedAt(OffsetDateTime.now());
        t1.setCompletionNote("Initial endpoints and auth filters successfully tested.");
        taskRepository.save(t1);

        Task t2 = new Task();
        t2.setActionPlan(masterPlan);
        t2.setTitle("Verify Real-Time WebSocket Latency (<200ms)");
        t2.setDescription("Benchmark absence broadcast chimes and deliverable update triggers.");
        t2.setDueDate(today);
        t2.setPriority(Priority.HIGH); // 3x weight
        t2.setSeverityWeight(3);
        t2.setStatus(TaskStatus.IN_PROGRESS);
        t2.setAssignedTo(emp1);
        taskRepository.save(t2);

        Task t3 = new Task();
        t3.setActionPlan(masterPlan);
        t3.setTitle("Multilingual Localization Validation (AM, TI, OM)");
        t3.setDescription("Confirm Ge'ez character rendering and Qubee diacritic fonts in reports.");
        t3.setDueDate(today.plusDays(2));
        t3.setPriority(Priority.HIGH); // 3x weight
        t3.setSeverityWeight(3);
        t3.setStatus(TaskStatus.PENDING);
        t3.setAssignedTo(emp2);
        taskRepository.save(t3);

        Task t4 = new Task();
        t4.setActionPlan(masterPlan);
        t4.setTitle("Daily Workstation Maintenance");
        t4.setDescription("Routine hardware inspections across office LAN workstations.");
        t4.setDueDate(today);
        t4.setPriority(Priority.LOW); // 1x weight
        t4.setSeverityWeight(1);
        t4.setStatus(TaskStatus.PENDING);
        t4.setAssignedTo(emp3);
        taskRepository.save(t4);

        // 4. Sample Attendance
        AttendanceRecord att1 = new AttendanceRecord();
        att1.setEmployee(emp1);
        att1.setAttendanceDate(today);
        att1.setCheckIn(OffsetDateTime.now().minusHours(4));
        att1.setStatus(AttendanceStatus.PRESENT);
        attendanceRecordRepository.save(att1);

        AttendanceRecord att2 = new AttendanceRecord();
        att2.setEmployee(emp2);
        att2.setAttendanceDate(today);
        att2.setCheckIn(OffsetDateTime.now().minusHours(3));
        att2.setStatus(AttendanceStatus.PRESENT);
        attendanceRecordRepository.save(att2);
    }
}

