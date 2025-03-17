import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    sessions: v.array(
      v.object({
        sessionId: v.string(),
        createdAt: v.number(),
        lastActive: v.number(),
        device: v.optional(v.string()),
      })
    ),
  }).index("by_email", ["email"]),

  medications: defineTable({
    userId: v.id("users"),
    medicineName: v.string(),
    description: v.optional(v.string()),
    isCompleted: v.boolean(),
    reminderType: v.union(v.literal("one-time"), v.literal("recurring")),
    // For one-time medications
    reminderDate: v.optional(v.number()), // Unix timestamp
    reminderTime: v.optional(v.string()), // HH:MM format
    // For recurring medications
    frequency: v.optional(v.union(v.literal("daily"), v.literal("weekly"))),
    dayOfWeek: v.optional(
      v.union(
        v.literal("monday"),
        v.literal("tuesday"),
        v.literal("wednesday"),
        v.literal("thursday"),
        v.literal("friday"),
        v.literal("saturday"),
        v.literal("sunday")
      )
    ),
    startDate: v.optional(v.number()), // Unix timestamp
    endDate: v.optional(v.number()), // Unix timestamp
    reminderTimes: v.optional(v.array(v.string())), // Array of HH:MM strings
    lastNotified: v.optional(v.number()), // Unix timestamp for last notification
  })
    .index("by_userId", ["userId"])
    .index("by_reminder_type", ["reminderType"])
    .index("by_completion", ["isCompleted"]),

  medicationLogs: defineTable({
    medicationId: v.id("medications"),
    userId: v.id("users"),
    takenAt: v.number(), // Unix timestamp
    wasOnTime: v.boolean(),
    notes: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  reports: defineTable({
    userId: v.id("users"),
    generatedAt: v.number(), // Unix timestamp
    reportType: v.string(),
    reportUrl: v.optional(v.string()), // URL to the generated report file
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  }).index("by_userId", ["userId"]),

  emailQueue: defineTable({
    userId: v.id("users"),
    email: v.string(),
    subject: v.string(),
    body: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed")
    ),
    createdAt: v.number(), // Unix timestamp
    sentAt: v.optional(v.number()), // Unix timestamp
    attachments: v.optional(v.array(v.string())), // Array of file URLs
  }).index("by_status", ["status"]),
});
