package com.office.platform.repository;

import com.office.platform.model.ActionPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActionPlanRepository extends JpaRepository<ActionPlan, Long> {
    List<ActionPlan> findAllByOrderByUploadedAtDesc();
}

