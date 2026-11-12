package com.office.platform.model;

public enum Priority {
    LOW(1),
    MEDIUM(2),
    HIGH(3),
    CRITICAL(4);

    private final int defaultWeight;

    Priority(int defaultWeight) {
        this.defaultWeight = defaultWeight;
    }

    public int getDefaultWeight() {
        return defaultWeight;
    }

    public static Priority fromString(String text) {
        if (text == null) return MEDIUM;
        try {
            return Priority.valueOf(text.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return MEDIUM;
        }
    }
}

