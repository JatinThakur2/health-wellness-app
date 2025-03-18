import { query } from "./_generated/server";
import { v } from "convex/values";

// Get reports for a specific user
export const getReports = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("reports")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc", (q) => q.field("generatedAt"))
      .collect();
  },
});
