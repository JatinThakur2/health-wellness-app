import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Process the email queue
export const processEmailQueue = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get pending emails
    const pendingEmails = await ctx.db
      .query("emailQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    for (const email of pendingEmails) {
      try {
        // In a production app, you would integrate with an email service like SendGrid, Mailgun, etc.
        // For this example, we'll just mark emails as "sent" without actually sending them
        console.log(`Would send email to ${email.email}: ${email.subject}`);

        // In a real implementation, you'd have code like:
        // await sendEmailViaSendGrid(email.email, email.subject, email.body, email.attachments);

        // Update email status to sent
        await ctx.db.patch(email._id, {
          status: "sent",
          sentAt: Date.now(),
        });
      } catch (error) {
        console.error(`Failed to send email ${email._id}:`, error);

        // Mark as failed
        await ctx.db.patch(email._id, {
          status: "failed",
        });
      }
    }
  },
});

// Send a single email immediately
export const sendImmediateEmail = internalMutation({
  args: {
    to: v.string(),
    subject: v.string(),
    body: v.string(),
    attachments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { to, subject, body, attachments }) => {
    try {
      // In a production app, integrate with an email service
      console.log(`Would immediately send email to ${to}: ${subject}`);

      // Return success
      return {
        success: true,
      };
    } catch (error) {
      console.error("Failed to send immediate email:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
});
