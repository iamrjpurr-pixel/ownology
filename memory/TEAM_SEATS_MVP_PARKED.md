# Team Seats MVP — PARKED (Feb 2026)

User paused this task to review the marketing content changes. Resume when ready.

## Scope agreed at time of pausing

**Ship in one session:**
- Manager dashboard at `/curriculum/team` (Vigneron-only): roster, assignments matrix, recent activity feed, bulk assign action
- Team member add flow (no email invites yet — just name+email → pending seat row that member auto-claims on next login)
- Lesson completion tracking: "Mark Complete" button on `/curriculum/:slug` persisting per user × lesson
- Assignment model: `assignedBy × assignedTo × lessonSlug × dueDate?`
- Server-side gating: `winery.plan = 'coopers'` (the Vigneron enum value)

## Foundation already in place
- `wineries` table with `ownerUserId`, `plan`, `slug`, brand info
- `users.wineryId` links a user to their winery
- Multi-tenant scaffold is Phase 1 (nullable, non-enforced) — that's fine for MVP

## To be added
- **3 new tables**: `winery_members`, `lesson_assignments`, `lesson_completions`
- **6 tRPC endpoints**: `team.list`, `team.addMember`, `team.removeMember`, `team.assign`, `team.recentActivity`, `curriculum.markComplete`
- **2 new pages**: `/curriculum/team` (manager) + "Assigned to me" section on `/curriculum` index

## Deferred to Phase 2
- Real transactional email invites via Resend
- Real Stripe seat-count enforcement (MVP: enum plan check only)
- Branded team attainment PDFs (separate ticket, on backlog)
- Bulk CSV import
- Role variants beyond `owner`/`member`
