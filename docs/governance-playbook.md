# Governance Support Playbook

## Common Failures and Fixes

### 1) "Transition details are required for status changes"
- Cause: user moved a task without required notes.
- Fix: provide `feedback`, `issueFaced`, and `acceptanceNote`.

### 2) "Transition not allowed by policy"
- Cause: disallowed jump like `TODO -> DONE`.
- Fix: move through normal workflow (`TODO -> IN_PROGRESS -> DONE`) or use authorized override.

### 3) "Only manager/admin can reopen done tasks"
- Cause: insufficient role attempted `DONE -> IN_PROGRESS`.
- Fix: ask Admin/Manager/Owner to perform reopen with a reopen reason.

### 4) "Forbidden" on member management
- Cause: role lacks `member.manage`.
- Fix: use Owner/Admin/Manager account.

## Pre-walkthrough Checklist

1. `npm run db:reset`
2. `npm run db:seed`
3. `npm run demo:check`
4. `npm run build`
5. Login as `admin@flowboard.demo`
6. Verify `/dashboard/admin` loads

## Fast Recovery

- If workflow data looks stale:
  - refresh browser tab
  - run `npm run db:reset && npm run db:seed`
- If permissions seem wrong:
  - re-check member role in Team page
  - re-login to refresh session

