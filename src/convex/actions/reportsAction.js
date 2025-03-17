"use node";
import { query, internalAction, action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

import { createObjectCsvStringifier } from "csv-writer";

// Request a new report
export const requestReport = action({
  args: {
    userId: v.id("users"),
    reportType: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { userId, reportType, startDate, endDate }) => {
    // Create a report record
    const reportId = await ctx.db.insert("reports", {
      userId,
      generatedAt: Date.now(),
      reportType,
      status: "pending",
    });

    // Schedule report generation
    if (reportType === "weekly") {
      await ctx.scheduler.runAfter(0, internal.reports.generateWeeklyReport, {
        userId,
        reportId,
      });
    } else {
      // For custom date range reports
      await ctx.scheduler.runAfter(0, internal.reports.generateCustomReport, {
        userId,
        reportId,
        startDate,
        endDate,
      });
    }

    return reportId;
  },
});
// Generate a weekly report for a user
export const generateWeeklyReport = internalAction({
  args: {
    userId: v.id("users"),
    reportId: v.id("reports"),
  },
  handler: async (ctx, { userId, reportId }) => {
    // Update report status
    await ctx.db.patch(reportId, {
      status: "processing",
    });

    try {
      // Get the user
      const user = await ctx.db.get(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Calculate date range for the past week
      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

      // Get medication logs for the past week
      const medicationLogs = await ctx.db
        .query("medicationLogs")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .filter((q) => q.gte(q.field("takenAt"), oneWeekAgo))
        .collect();

      // Get medication details
      const medicationIds = [
        ...new Set(medicationLogs.map((log) => log.medicationId)),
      ];
      const medications = await Promise.all(
        medicationIds.map((id) => ctx.db.get(id))
      );

      const medicationMap = Object.fromEntries(
        medications.map((med) => [med._id, med])
      );

      // Prepare data for CSV
      const reportData = medicationLogs.map((log) => {
        const medication = medicationMap[log.medicationId];
        return {
          MedicineName: medication.medicineName,
          Description: medication.description || "",
          TakenAt: new Date(log.takenAt).toLocaleString(),
          OnTime: log.wasOnTime ? "Yes" : "No",
          Notes: log.notes || "",
        };
      });

      // Generate CSV
      const csvStringifier = createObjectCsvStringifier({
        header: [
          { id: "MedicineName", title: "Medicine Name" },
          { id: "Description", title: "Description" },
          { id: "TakenAt", title: "Taken At" },
          { id: "OnTime", title: "On Time" },
          { id: "Notes", title: "Notes" },
        ],
      });

      const csvString =
        csvStringifier.getHeaderString() +
        csvStringifier.stringifyRecords(reportData);

      // For simplicity, we'll use Convex storage to store the CSV
      // In a real app, you might want to use Cloudinary or S3
      const storageId = await ctx.storage.store(csvString);
      const reportUrl = await ctx.storage.getUrl(storageId);
      // Update report with URL
      await ctx.db.patch(reportId, {
        reportUrl,
        status: "completed",
      });

      // Send email with the report
      await ctx.db.insert("emailQueue", {
        userId,
        email: user.email,
        subject: "Your Weekly Medication Report",
        body: `
          <h1>Weekly Medication Report</h1>
          <p>Hello ${user.name},</p>
          <p>Your weekly medication report is ready. You can download it from the app or click the link below:</p>
          <p><a href="${reportUrl}">Download Report</a></p>
          <p>This report covers the period from ${new Date(oneWeekAgo).toLocaleDateString()} to ${new Date(now).toLocaleDateString()}.</p>
        `,
        status: "pending",
        createdAt: now,
        attachments: [reportUrl],
      });

      // Process the email queue
      await ctx.scheduler.runAfter(0, internal.email.processEmailQueue, {});
    } catch (error) {
      console.error("Error generating report:", error);

      // Update report status to failed
      await ctx.db.patch(reportId, {
        status: "failed",
      });
    }
  },
});

// Request a new report

// Generate a custom report for a user
export const generateCustomReport = internalAction({
  args: {
    userId: v.id("users"),
    reportId: v.id("reports"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { userId, reportId, startDate, endDate }) => {
    // Update report status
    await ctx.db.patch(reportId, {
      status: "processing",
    });

    try {
      // Get the user
      const user = await ctx.db.get(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Default to last 30 days if dates not provided
      const now = Date.now();
      const effectiveEndDate = endDate || now;
      const effectiveStartDate = startDate || now - 30 * 24 * 60 * 60 * 1000;

      // Get medication logs for the date range
      const medicationLogs = await ctx.db
        .query("medicationLogs")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .filter((q) =>
          q.and(
            q.gte(q.field("takenAt"), effectiveStartDate),
            q.lte(q.field("takenAt"), effectiveEndDate)
          )
        )
        .collect();

      // Get medication details
      const medicationIds = [
        ...new Set(medicationLogs.map((log) => log.medicationId)),
      ];
      const medications = await Promise.all(
        medicationIds.map((id) => ctx.db.get(id))
      );

      const medicationMap = Object.fromEntries(
        medications.map((med) => [med._id, med])
      );

      // Prepare data for CSV
      const reportData = medicationLogs.map((log) => {
        const medication = medicationMap[log.medicationId];
        return {
          MedicineName: medication.medicineName,
          Description: medication.description || "",
          TakenAt: new Date(log.takenAt).toLocaleString(),
          OnTime: log.wasOnTime ? "Yes" : "No",
          Notes: log.notes || "",
        };
      });

      // Generate CSV
      const csvStringifier = createObjectCsvStringifier({
        header: [
          { id: "MedicineName", title: "Medicine Name" },
          { id: "Description", title: "Description" },
          { id: "TakenAt", title: "Taken At" },
          { id: "OnTime", title: "On Time" },
          { id: "Notes", title: "Notes" },
        ],
      });

      const csvString =
        csvStringifier.getHeaderString() +
        csvStringifier.stringifyRecords(reportData);

      // Store the CSV
      const storageId = await ctx.storage.store(csvString);
      const reportUrl = await ctx.storage.getUrl(storageId);

      // Update report with URL
      await ctx.db.patch(reportId, {
        reportUrl,
        status: "completed",
      });

      // Send email with the report
      await ctx.db.insert("emailQueue", {
        userId,
        email: user.email,
        subject: "Your Custom Medication Report",
        body: `
          <h1>Custom Medication Report</h1>
          <p>Hello ${user.name},</p>
          <p>Your custom medication report is ready. You can download it from the app or click the link below:</p>
          <p><a href="${reportUrl}">Download Report</a></p>
          <p>This report covers the period from ${new Date(effectiveStartDate).toLocaleDateString()} to ${new Date(effectiveEndDate).toLocaleDateString()}.</p>
        `,
        status: "pending",
        createdAt: now,
        attachments: [reportUrl],
      });

      // Process the email queue
      await ctx.scheduler.runAfter(0, internal.email.processEmailQueue, {});
    } catch (error) {
      console.error("Error generating custom report:", error);

      // Update report status to failed
      await ctx.db.patch(reportId, {
        status: "failed",
      });
    }
  },
});
