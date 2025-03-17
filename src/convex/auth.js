import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Register a new user
export const register = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { name, email, password }) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existingUser) {
      throw new ConvexError("User with this email already exists");
    }

    // Hash the password (simple implementation - use a better one in production)
    const passwordHash = await hashPassword(password);

    // Create a new user
    const userId = await ctx.db.insert("users", {
      name,
      email,
      passwordHash,
      sessions: [],
    });

    return { userId };
  },
});

// Login a user
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    device: v.optional(v.string()),
  },
  handler: async (ctx, { email, password, device }) => {
    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      throw new ConvexError("Invalid email or password");
    }

    // Check password
    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      throw new ConvexError("Invalid email or password");
    }

    // Create a new session
    const sessionId = generateSessionId();
    const now = Date.now();

    const session = {
      sessionId,
      createdAt: now,
      lastActive: now,
      device: device || "Unknown device",
    };

    // Update user with new session
    await ctx.db.patch(user._id, {
      sessions: [...user.sessions, session],
    });

    return {
      userId: user._id,
      sessionId,
      name: user.name,
      email: user.email,
    };
  },
});

// Get current user
export const me = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }) => {
    // Find user with this session
    const users = await ctx.db
      .query("users")
      .filter((q) => q.field("sessions") !== undefined)
      .collect();

    // Ensure sessions is an array before calling `.some()`
    const user = users.find(
      (user) =>
        Array.isArray(user.sessions) &&
        user.sessions.some((s) => s.sessionId === sessionId)
    );

    if (!user) {
      return null;
    }

    return {
      _id: user._id, // Include _id in the return value
      name: user.name,
      email: user.email,
    };
  },
});

// New mutation to update last active time
export const updateLastActive = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }) => {
    // Find user with this session
    const users = await ctx.db
      .query("users")
      .filter((q) => q.field("sessions") !== undefined)
      .collect();

    const user = users.find(
      (user) =>
        Array.isArray(user.sessions) &&
        user.sessions.some((s) => s.sessionId === sessionId)
    );

    if (!user) {
      return false;
    }

    // Update last active time
    const updatedSessions = user.sessions.map((s) => {
      if (s.sessionId === sessionId) {
        return { ...s, lastActive: Date.now() };
      }
      return s;
    });

    await ctx.db.patch(user._id, {
      sessions: updatedSessions,
    });

    return true;
  },
});

// Logout from current device
export const logout = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }) => {
    // Find user with this session using the proper approach
    const users = await ctx.db
      .query("users")
      .filter((q) => q.field("sessions") !== undefined)
      .collect();

    const user = users.find(
      (user) =>
        Array.isArray(user.sessions) &&
        user.sessions.some((s) => s.sessionId === sessionId)
    );

    if (!user) {
      return false;
    }

    // Remove this session
    const updatedSessions = user.sessions.filter(
      (s) => s.sessionId !== sessionId
    );

    await ctx.db.patch(user._id, {
      sessions: updatedSessions,
    });

    return true;
  },
});

// Logout from all devices
export const logoutAll = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }) => {
    // Find user with this session using the proper approach
    const users = await ctx.db
      .query("users")
      .filter((q) => q.field("sessions") !== undefined)
      .collect();

    const user = users.find(
      (user) =>
        Array.isArray(user.sessions) &&
        user.sessions.some((s) => s.sessionId === sessionId)
    );

    if (!user) {
      return false;
    }

    // Clear all sessions
    await ctx.db.patch(user._id, {
      sessions: [],
    });

    return true;
  },
});

// Logout from other devices
export const logoutOthers = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }) => {
    // Find user with this session using the proper approach
    const users = await ctx.db
      .query("users")
      .filter((q) => q.field("sessions") !== undefined)
      .collect();

    const user = users.find(
      (user) =>
        Array.isArray(user.sessions) &&
        user.sessions.some((s) => s.sessionId === sessionId)
    );

    if (!user) {
      return false;
    }

    // Keep only the current session
    const currentSession = user.sessions.find((s) => s.sessionId === sessionId);
    if (!currentSession) {
      return false;
    }

    await ctx.db.patch(user._id, {
      sessions: [currentSession],
    });

    return true;
  },
});

// Helper function for password hashing
// This is a simplified version - in production, use a better solution
async function hashPassword(password) {
  // Simple hash function that's compatible with Convex
  // In a real app, you'd want something more secure
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "some-salt-value");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

// Helper function for password comparison
async function comparePassword(password, hash) {
  const newHash = await hashPassword(password);
  return newHash === hash;
}

// Helper function to generate a session ID
function generateSessionId() {
  // Generate a random session ID
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}
