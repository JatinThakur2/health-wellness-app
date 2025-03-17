/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as actions_reportsAction from "../actions/reportsAction.js";
import type * as auth from "../auth.js";
import type * as email from "../email.js";
import type * as medications from "../medications.js";
import type * as reports from "../reports.js";
import type * as scheduled from "../scheduled.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "actions/reportsAction": typeof actions_reportsAction;
  auth: typeof auth;
  email: typeof email;
  medications: typeof medications;
  reports: typeof reports;
  scheduled: typeof scheduled;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
