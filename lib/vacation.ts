export const REQUEST_STATUSES = [
  "Draft",
  "Submitted",
  "Approved",
  "Rejected",
  "Cancelled",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export type VacationRequest = {
  id: number;
  employeeId: number;
  employeeName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: RequestStatus;
  submittedAt?: string | null;
  managerId?: number | null;
  managerName?: string | null;
  decisionComment?: string | null;
  createdAt: string;
  updatedAt: string;
};

export function isEditableStatus(status: RequestStatus): boolean {
  return status === "Draft";
}

export type DateValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateVacationDates(startDate: string, endDate: string): DateValidationResult {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, message: "Please provide valid dates." };
  }

  if (end < start) {
    return {
      ok: false,
      message: "The end date must be on or after the start date.",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (start < today) {
    return {
      ok: false,
      message: "Vacation requests cannot start in the past.",
    };
  }

  return { ok: true };
}

export type DecisionAction = "approve" | "reject" | "cancel";

export function getDecisionLabel(status: RequestStatus): string {
  return status;
}

export function getDecisionOutcome(action: DecisionAction) {
  if (action === "approve") {
    return {
      status: "Approved" as const,
      needsResubmit: false,
      notification: "",
    };
  }

  return {
    status: "Rejected" as const,
    needsResubmit: true,
    notification: "Please re-submit a new vacation request.",
  };
}
