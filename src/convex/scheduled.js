import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Setup medication reminders
export const setupMedicationReminders = internalMutation({
  args: {
    medicationId: v.id("medications"),
  },
  handler: async (ctx, { medicationId }) => {
    const medication = await ctx.db.get(medicationId);

    if (!medication) {
      return;
    }

    const now = Date.now();

    // For one-time medications
    if (medication.reminderType === "one-time") {
      const reminderTime = new Date(medication.reminderDate);

      // Extract hours and minutes from reminderTime string (HH:MM)
      const [hours, minutes] = medication.reminderTime.split(":").map(Number);
      reminderTime.setHours(hours, minutes, 0, 0);

      const reminderTimestamp = reminderTime.getTime();

      // Schedule the reminder if it's in the future
      if (reminderTimestamp > now) {
        await ctx.scheduler.runAt(
          reminderTimestamp,
          internal.scheduled.sendMedicationReminder,
          {
            medicationId,
          }
        );
      }
    }
    // For recurring medications
    else if (medication.reminderType === "recurring") {
      const { startDate, endDate, frequency, dayOfWeek } = medication;

      // Don't process if the end date has passed
      if (endDate < now) {
        return;
      }

      // Get the next occurrence of this reminder
      const nextReminderTime = getNextReminderTime(
        startDate,
        endDate,
        frequency,
        dayOfWeek,
        medication.reminderTimes?.[0] || "08:00", // Default to 8am if no time specified
        medication.lastNotified || now
      );

      if (nextReminderTime) {
        await ctx.scheduler.runAt(
          nextReminderTime,
          internal.scheduled.sendMedicationReminder,
          {
            medicationId,
          }
        );
      }
    }
  },
});

// Send medication reminder
export const sendMedicationReminder = internalMutation({
  args: {
    medicationId: v.id("medications"),
  },
  handler: async (ctx, { medicationId }) => {
    const medication = await ctx.db.get(medicationId);

    if (!medication) {
      return;
    }

    const now = Date.now();

    // Don't send reminder if it's already completed (for one-time medications)
    if (medication.reminderType === "one-time" && medication.isCompleted) {
      return;
    }

    // Don't send reminder if end date has passed (for recurring medications)
    if (medication.reminderType === "recurring" && medication.endDate < now) {
      return;
    }

    // Get the user
    const user = await ctx.db.get(medication.userId);

    if (!user) {
      return;
    }

    // Queue an email notification
    await ctx.db.insert("emailQueue", {
      userId: user._id,
      email: user.email,
      subject: `Medication Reminder: ${medication.medicineName}`,
      body: `
        <h1>Medication Reminder</h1>
        <p>It's time to take your medicine: ${medication.medicineName}</p>
        ${medication.description ? `<p>Description: ${medication.description}</p>` : ""}
        <p>Please log in to mark this medication as taken.</p>
      `,
      status: "pending",
      createdAt: now,
    });

    // Update the medication with the last notification timestamp
    await ctx.db.patch(medicationId, {
      lastNotified: now,
    });

    // For recurring medications, schedule the next reminder
    if (medication.reminderType === "recurring") {
      await ctx.scheduler.runAfter(
        0,
        internal.scheduled.setupMedicationReminders,
        {
          medicationId,
        }
      );
    }
  },
});

// Generate weekly reports
export const generateWeeklyReports = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    for (const user of users) {
      // Create a report record
      const reportId = await ctx.db.insert("reports", {
        userId: user._id,
        generatedAt: Date.now(),
        reportType: "weekly",
        status: "pending",
      });

      // Queue report generation
      await ctx.db.insert("emailQueue", {
        userId: user._id,
        email: user.email,
        subject: "Your Weekly Medication Report",
        body: "Your weekly medication report is being generated and will be sent to you shortly.",
        status: "pending",
        createdAt: Date.now(),
      });

      // Schedule report generation
      await ctx.scheduler.runAfter(0, internal.reports.generateWeeklyReport, {
        userId: user._id,
        reportId,
      });
    }
  },
});

// Helper function to get the next reminder time
function getNextReminderTime(
  startDate,
  endDate,
  frequency,
  dayOfWeek,
  reminderTime,
  lastNotified
) {
  const now = Date.now();
  let nextDate = new Date(Math.max(startDate, lastNotified));

  const [hours, minutes] = reminderTime.split(":").map(Number);

  // Set the time
  nextDate.setHours(hours, minutes, 0, 0);

  // If the time is in the past, move to the next day
  if (nextDate.getTime() <= now) {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  // For weekly frequency, find the next occurrence of the specified day
  if (frequency === "weekly" && dayOfWeek) {
    const dayMap = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 0,
    };

    const currentDay = nextDate.getDay();
    const targetDay = dayMap[dayOfWeek];

    // Calculate days to add
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) {
      daysToAdd += 7; // Move to next week
    }

    nextDate.setDate(nextDate.getDate() + daysToAdd);
  }

  // Check if the next date is before the end date
  if (nextDate.getTime() > endDate) {
    return null;
  }

  return nextDate.getTime();
}
