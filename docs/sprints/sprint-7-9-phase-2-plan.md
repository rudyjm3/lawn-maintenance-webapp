# Sprint 7-9 Phase 2 Plan

## Dates
- Created: 2026-04-28
- Branch: `sprint-7-9-phase-2`
- Window: Sprint 7 through Sprint 9 (Phase 2)

## Phase 2 Objective
Deliver a reliable operations layer across scheduling, service catalog, properties, and crew workflows with production-ready data integrity and measurable team efficiency gains.

## Success Criteria
- Scheduling workflows support recurring services, exceptions, and property-level assignments without manual data fixes.
- Dashboard and planner views reflect accurate weekly workload and assignment status.
- Crew-facing daily workflow is stable for field usage (today view, route view, job detail flow).
- Core admin flows (clients, properties, jobs, crews, service catalog) have validation and clear error handling.
- Key business actions are traceable through activity logs or equivalent operational visibility.

## In Scope (Phase 2)
- Scheduling and recurrence hardening
- Service catalog maturity (service types, assignments, recurrence rules, exceptions)
- Property-service linkage and management UX
- Crew execution flow improvements
- Data quality and RLS-safe action paths
- QA pass for core operational routes

## Out of Scope
- Major billing engine expansion beyond current invoices/payments placeholders
- Full analytics platform or advanced BI exports
- Mobile-native app packaging
- Large visual redesign outside targeted usability improvements

## Proposed Sprint Breakdown

## Sprint 7: Data + Scheduling Foundation
### Goals
- Stabilize backend actions and schema assumptions for recurring work.
- Ensure schedule generation paths are deterministic and testable.

### Work Items
- Audit and harden `app/actions/service-catalog.ts` and related scheduling logic.
- Validate recurrence rule handling in `lib/scheduling/recurrence.ts`.
- Add guardrails/validation around property-service assignments.
- Verify cron generation path in `app/api/cron/generate-jobs/route.ts`.
- Add/expand test coverage for recurrence edge cases.

### Exit Criteria
- Recurrence rule creation/edit behavior is consistent.
- Schedule generation produces expected jobs for representative test scenarios.

## Sprint 8: Operations UX + Crew Flow
### Goals
- Improve planner and crew usability for day-to-day execution.
- Reduce friction in assignment visibility and status tracking.

### Work Items
- Refine planner components (`components/planner/*`) for clearer capacity and job state.
- Improve crew views (`app/(crew)/*`) for daily task progression.
- Tighten status badge consistency across jobs/leads/clients where needed.
- Add missing loading/error/empty states in critical tables and sheets.

### Exit Criteria
- Crew can move through daily workflow without ambiguous states.
- Planner provides reliable at-a-glance capacity and assignment context.

## Sprint 9: Stabilization + Release Readiness
### Goals
- Close regressions, strengthen QA, and prepare for controlled rollout.

### Work Items
- Regression test pass across dashboard operational routes.
- Validate auth + business scoping on all modified server actions.
- Performance pass on high-traffic pages and table rendering paths.
- Final defect burn-down and acceptance sign-off.

### Exit Criteria
- No critical/high defects open for Phase 2 scope.
- Stakeholder acceptance checklist completed.

## Initial Story Backlog (Draft)
- As an admin, I can define recurrence rules so jobs generate predictably.
- As an admin, I can assign services to properties with clear schedule exceptions.
- As an admin, I can view weekly capacity and detect overloads quickly.
- As a crew member, I can see today’s jobs, route context, and job details without missing data.
- As an operator, I can trust status transitions and audit recent operational activity.

## Technical Trackers
- Data integrity: recurrence, property-service links, business scoping
- UX consistency: badges, tables, sheets, empty/error states
- Reliability: cron generation, action-level validation, regression coverage
- Performance: planner/table rendering, server action latency hotspots

## Risks and Mitigations
- Risk: Schema/action mismatch creates silent scheduling failures.
  - Mitigation: Add validation at action boundaries and targeted integration tests.
- Risk: Crew flow regressions from planner-side refactors.
  - Mitigation: Keep crew route tests in regression suite for each sprint.
- Risk: Multi-sprint scope creep.
  - Mitigation: Enforce out-of-scope list and sprint-specific exit criteria.

## Acceptance Checklist
- [ ] Sprint 7 exit criteria met
- [ ] Sprint 8 exit criteria met
- [ ] Sprint 9 exit criteria met
- [ ] Phase 2 success criteria validated
- [ ] Rollout/rollback notes documented

## Notes
- This is the initial planning baseline for implementation on branch `sprint-7-9-phase-2`.
- Convert draft backlog items into tracked tickets with estimates before build execution.
