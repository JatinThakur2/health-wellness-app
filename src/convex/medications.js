import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";

// Add a new medication
export const addMedication = mutation({
  args: {
    userId: v.id("users"),
    medicineName: v.string(),
    description: v.optional(v.string()),
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
  },
  handler: async (ctx, args) => {
    const { userId, reminderType, ...medicationData } = args;

    // Validate based on reminder type
    if (reminderType === "one-time") {
      if (!medicationData.reminderDate || !medicationData.reminderTime) {
        throw new ConvexError("One-time medication requires date and time");
      }
    } else if (reminderType === "recurring") {
      if (
        !medicationData.frequency ||
        !medicationData.startDate ||
        !medicationData.endDate
      ) {
        throw new ConvexError(
          "Recurring medication requires frequency, start date, and end date"
        );
      }

      if (medicationData.frequency === "weekly" && !medicationData.dayOfWeek) {
        throw new ConvexError("Weekly medication requires day of week");
      }
    }

    // Create the medication
    const medicationId = await ctx.db.insert("medications", {
      userId,
      reminderType,
      ...medicationData,
      isCompleted: false,
      lastNotified: 0,
      lastTakenAt: 0,
    });

    // Schedule reminders (will be handled by a scheduled function)
    await ctx.scheduler.runAfter(
      0,
      internal.scheduled.setupMedicationReminders,
      {
        medicationId,
      }
    );

    return medicationId;
  },
});

// Get medications for a user
export const getMedications = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const medications = await ctx.db
      .query("medications")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Process medications to determine if they should be shown today
    const now = Date.now();
    return medications.map((med) => {
      // Add a computed property to determine if medication needs to be taken today
      let needsTakingToday = true;

      if (med.reminderType === "one-time") {
        // One-time medications just respect their isCompleted flag
        needsTakingToday = !med.isCompleted;
      } else if (med.reminderType === "recurring") {
        // For recurring medications, check if it was already taken today
        if (med.lastTakenAt) {
          const lastTakenDate = new Date(med.lastTakenAt);
          const today = new Date(now);

          needsTakingToday = !(
            lastTakenDate.getFullYear() === today.getFullYear() &&
            lastTakenDate.getMonth() === today.getMonth() &&
            lastTakenDate.getDate() === today.getDate()
          );
        }
      }

      return {
        ...med,
        needsTakingToday,
      };
    });
  },
});

// Mark medication as done
export const markMedicationAsDone = mutation({
  args: {
    medicationId: v.id("medications"),
    userId: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { medicationId, userId, notes }) => {
    const medication = await ctx.db.get(medicationId);

    if (!medication) {
      throw new ConvexError("Medication not found");
    }

    if (medication.userId !== userId) {
      throw new ConvexError("Unauthorized");
    }

    const now = Date.now();

    // Log the medication as taken
    await ctx.db.insert("medicationLogs", {
      medicationId,
      userId,
      takenAt: now,
      wasOnTime: true,
      notes,
    });

    // For one-time medications, mark as completed

    if (medication.reminderType === "one-time") {
      await ctx.db.patch(medicationId, {
        isCompleted: true,
        lastTakenAt: now,
      });
    } else {
      // For recurring medications,update the lastTakenAt time
      await ctx.db.patch(medicationId, {
        lastTakenAt: now,
      });
    }

    return true;
  },
});

// Get medication logs for a user
export const getMedicationLogs = query({
  args: {
    userId: v.id("users"),
    startDate: v.optional(v.number()), // Unix timestamp
    endDate: v.optional(v.number()), // Unix timestamp
  },
  handler: async (ctx, { userId, startDate, endDate }) => {
    let query = ctx.db
      .query("medicationLogs")
      .withIndex("by_userId", (q) => q.eq("userId", userId));

    if (startDate) {
      query = query.filter((q) => q.gte(q.field("takenAt"), startDate));
    }

    if (endDate) {
      query = query.filter((q) => q.lte(q.field("takenAt"), endDate));
    }

    const logs = await query.collect();

    // Fetch medication details for each log
    const medicationIds = [...new Set(logs.map((log) => log.medicationId))];
    const medications = await Promise.all(
      medicationIds.map((id) => ctx.db.get(id))
    );

    const medicationMap = Object.fromEntries(
      medications.map((med) => [med._id, med])
    );

    return logs.map((log) => ({
      ...log,
      medication: medicationMap[log.medicationId],
    }));
  },
});

// Update a medication
export const updateMedication = mutation({
  args: {
    medicationId: v.id("medications"),
    userId: v.id("users"),
    medicineName: v.optional(v.string()),
    description: v.optional(v.string()),
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
  },
  handler: async (ctx, { medicationId, userId, ...updates }) => {
    const medication = await ctx.db.get(medicationId);

    if (!medication) {
      throw new ConvexError("Medication not found");
    }

    if (medication.userId !== userId) {
      throw new ConvexError("Unauthorized");
    }

    await ctx.db.patch(medicationId, updates);

    // Reschedule reminders if needed
    await ctx.scheduler.runAfter(
      0,
      internal.scheduled.setupMedicationReminders,
      {
        medicationId,
      }
    );

    return true;
  },
});

// Delete a medication
export const deleteMedication = mutation({
  args: {
    medicationId: v.id("medications"),
    userId: v.id("users"),
  },
  handler: async (ctx, { medicationId, userId }) => {
    const medication = await ctx.db.get(medicationId);

    if (!medication) {
      throw new ConvexError("Medication not found");
    }

    if (medication.userId !== userId) {
      throw new ConvexError("Unauthorized");
    }

    await ctx.db.delete(medicationId);

    return true;
  },
});
