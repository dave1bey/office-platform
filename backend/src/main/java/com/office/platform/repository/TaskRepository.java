package com.office.platform.repository;

import com.office.platform.model.Task;
import com.office.platform.model.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByAssignedTo_Id(Long employeeId);
    
    // Critical for FR-AB-03: Operational Impact Analysis when employee is absent
    List<Task> findByAssignedTo_IdAndDueDateAndStatusNot(Long employeeId, LocalDate dueDate, TaskStatus status);
    
    List<Task> findByActionPlan_Id(Long actionPlanId);
    
    List<Task> findByDueDateBetween(LocalDate startDate, LocalDate endDate);
    
    List<Task> findByAssignedTo_IdAndDueDateBetween(Long employeeId, LocalDate startDate, LocalDate endDate);

    long countByAssignedTo_Id(Long employeeId);
    long countByAssignedTo_IdAndStatus(Long employeeId, TaskStatus status);

    @Query("SELECT t FROM Task t WHERE t.assignedTo IS NULL")
    List<Task> findUnassignedTasks();
}

