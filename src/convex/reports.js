import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const getReports = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("reports")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Using a mutation instead of an action with correct function references
export const requestReport = mutation({
  args: {
    userId: v.id("users"),
    reportType: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, reportType, startDate, endDate } = args;

    // Create a report record with pending status
    const reportId = await ctx.db.insert("reports", {
      userId,
      generatedAt: Date.now(),
      reportType,
      status: "pending",
    });

    // Schedule processing via the correct function names
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

// Add these functions for completeness if they don't exist elsewhere
export const generateWeeklyReport = mutation({
  args: {
    userId: v.id("users"),
    reportId: v.id("reports"),
  },
  handler: async (ctx, { userId, reportId }) => {
    console.log(`Starting weekly report generation for report: ${reportId}`);

    try {
      // Update report status to processing
      await ctx.db.patch(reportId, {
        status: "processing",
      });

      console.log(`Updated status to processing for report: ${reportId}`);

      // Simulate report generation
      console.log(`Generating report content for: ${reportId}`);

      // Create a dummy URL for testing
      const reportUrl = "https://example.com/sample-report.pdf";

      // Update the report with URL and set status to completed
      await ctx.db.patch(reportId, {
        reportUrl,
        status: "completed",
      });

      console.log(`Updated status to completed for report: ${reportId}`);

      return reportId;
    } catch (error) {
      console.error(`Error generating report ${reportId}:`, error);

      // Update report status to failed
      await ctx.db.patch(reportId, {
        status: "failed",
      });

      throw error;
    }
  },
});

export const generateCustomReport = mutation({
  args: {
    userId: v.id("users"),
    reportId: v.id("reports"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { userId, reportId, startDate, endDate }) => {
    console.log(`Starting weekly report generation for report: ${reportId}`);

    try {
      // Update report status to processing
      await ctx.db.patch(reportId, {
        status: "processing",
      });

      console.log(`Updated status to processing for report: ${reportId}`);

      // Simulate report generation
      console.log(`Generating report content for: ${reportId}`);

      // Create a dummy URL for testing
      const reportUrl = "https://example.com/sample-report.pdf";

      // Update the report with URL and set status to completed
      await ctx.db.patch(reportId, {
        reportUrl,
        status: "completed",
      });

      console.log(`Updated status to completed for report: ${reportId}`);

      return reportId;
    } catch (error) {
      console.error(`Error generating report ${reportId}:`, error);

      // Update report status to failed
      await ctx.db.patch(reportId, {
        status: "failed",
      });

      throw error;
    }
  },
});
