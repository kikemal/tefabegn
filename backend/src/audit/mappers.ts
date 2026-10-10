import type { CaseEvent, User } from "@prisma/client";
import { sanitizeAuditMetadata } from "./sanitize";
import { CASE_EVENT_LABELS } from "./types";

export type CaseEventActorSummary = {
  id: string;
  fullName: string;
  role: User["role"];
};

export type CaseEventResponse = {
  id: string;
  eventType: string;
  eventLabel: string;
  reportId: string | null;
  claimId: string | null;
  actor: CaseEventActorSummary | null;
  metadata: unknown;
  createdAt: string;
};

type CaseEventWithActor = CaseEvent & {
  actor: Pick<User, "id" | "fullName" | "role"> | null;
};

export function toCaseEventResponse(event: CaseEventWithActor): CaseEventResponse {
  return {
    id: event.id,
    eventType: event.eventType,
    eventLabel: CASE_EVENT_LABELS[event.eventType] ?? event.eventType,
    reportId: event.reportId,
    claimId: event.claimId,
    actor: event.actor
      ? {
          id: event.actor.id,
          fullName: event.actor.fullName,
          role: event.actor.role,
        }
      : null,
    metadata: sanitizeAuditMetadata(event.metadata) ?? null,
    createdAt: event.createdAt.toISOString(),
  };
}
