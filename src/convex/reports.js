import { query, action } from "./_generated/server";
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

// Improved requestReport action with better error handling
export const requestReport = action({
  args: {
    userId: v.id("users"),
    reportType: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log("Checking ctx.db:", ctx.db); // Add this line

    if (!ctx.db) {
      throw new Error("Database instance is undefined. Check Convex setup.");
    }

    const { userId, reportType, startDate, endDate } = args;

    try {
      console.log("Attempting to insert into 'reports' collection...");

      const reportId = await ctx.db.insert("reports", {
        userId,
        generatedAt: Date.now(),
        reportType,
        status: "pending",
      });

      console.log("Inserted Report ID:", reportId);

      return reportId;
    } catch (error) {
      console.error("Error in requestReport action:", error);
      throw new Error(`Failed to request report: ${error.message}`);
    }
  },
});
