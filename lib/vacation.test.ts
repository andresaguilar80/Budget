import test from "node:test";
import assert from "node:assert/strict";

import {
  REQUEST_STATUSES,
  isEditableStatus,
  validateVacationDates,
  getDecisionLabel,
  getDecisionOutcome,
} from "./vacation.ts";

test("request statuses include draft, submitted, approved, rejected and cancelled", () => {
  assert.deepEqual(REQUEST_STATUSES, [
    "Draft",
    "Submitted",
    "Approved",
    "Rejected",
    "Cancelled",
  ]);
});

test("submitted requests cannot be edited", () => {
  assert.equal(isEditableStatus("Draft"), true);
  assert.equal(isEditableStatus("Submitted"), false);
  assert.equal(isEditableStatus("Approved"), false);
});

test("vacation dates must be valid and not in the past", () => {
  const valid = validateVacationDates("2026-09-10", "2026-09-15");
  assert.equal(valid.ok, true);

  const invalid = validateVacationDates("2026-08-01", "2026-07-30");
  assert.equal(invalid.ok, false);
  if (!invalid.ok) {
    assert.match(invalid.message, /after the start date/i);
  }
});

test("decision labels map to accountability metadata", () => {
  assert.equal(getDecisionLabel("Approved"), "Approved");
  assert.equal(getDecisionLabel("Rejected"), "Rejected");
  assert.equal(getDecisionLabel("Cancelled"), "Cancelled");
});

test("manager actions resolve to lifecycle and resubmission notifications", () => {
  assert.deepEqual(getDecisionOutcome("approve"), {
    status: "Approved",
    needsResubmit: false,
    notification: "",
  });

  assert.deepEqual(getDecisionOutcome("reject"), {
    status: "Rejected",
    needsResubmit: true,
    notification: "Please re-submit a new vacation request.",
  });

  assert.deepEqual(getDecisionOutcome("cancel"), {
    status: "Rejected",
    needsResubmit: true,
    notification: "Please re-submit a new vacation request.",
  });
});
