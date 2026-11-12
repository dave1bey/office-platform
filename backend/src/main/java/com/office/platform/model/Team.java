package com.office.platform.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "teams")
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "team_name", nullable = false, unique = true, length = 150)
    private String teamName;

    @Column(name = "team_name_am", length = 150)
    private String teamNameAm; // Amharic (የልማት ቡድን)

    @Column(name = "team_name_ti", length = 150)
    private String teamNameTi; // Tigrinya (ናይ ምዕባለ ጋንታ)

    @Column(name = "team_name_om", length = 150)
    private String teamNameOm; // Afaan Oromoo (Garee Misoomaa)

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @JsonIgnore
    @ManyToMany(mappedBy = "teams")
    private Set<Employee> members = new HashSet<>();

    public Team() {}

    public Team(String teamName, String teamNameAm, String teamNameTi, String teamNameOm, String description) {
        this.teamName = teamName;
        this.teamNameAm = teamNameAm;
        this.teamNameTi = teamNameTi;
        this.teamNameOm = teamNameOm;
        this.description = description;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getTeamName() { return teamName; }
    public void setTeamName(String teamName) { this.teamName = teamName; }

    public String getTeamNameAm() { return teamNameAm; }
    public void setTeamNameAm(String teamNameAm) { this.teamNameAm = teamNameAm; }

    public String getTeamNameTi() { return teamNameTi; }
    public void setTeamNameTi(String teamNameTi) { this.teamNameTi = teamNameTi; }

    public String getTeamNameOm() { return teamNameOm; }
    public void setTeamNameOm(String teamNameOm) { this.teamNameOm = teamNameOm; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public Set<Employee> getMembers() { return members; }
    public void setMembers(Set<Employee> members) { this.members = members; }
}

