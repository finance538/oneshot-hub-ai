# Data-preserving migration reconciliation

The owner requires preservation of all preview data. Do not reset either preview database, remove application records, or rewrite applied migration files to make validation pass.

## Current preview repair — 2026-10-19

The latest read-only status inspection targeted `agent-6ad5d45b17f621f0f26b83`. It reported 15 applied migrations, including the original collaboration and catalog migrations. The two restoration migrations were pending on this branch and were byte-for-byte duplicates of those originals. Their snapshot histories caused Drizzle to report conflicting additions of `workforce_chat_turns.collaboration`.

Netlify's pending-migration reset removed only `20261018083007_restore_workforce_collaboration` and `20261018083019_restore_workforce_catalog`, including the redundant snapshot. It did not reset the database or undo applied changes. The three missing applied SQL files, `20261018165651_migrate_core_to_netlify`, `20261018165652_seed_core_sales_employee`, and `20261019030302_add_ecosystem_sso_grants`, were pulled into a separate temporary directory and copied back without changing existing migrations or snapshots. All 12 previously present applied SQL files matched the stored history.

After repair, migration status reported 15 applied migrations, zero pending migrations, and no missing or out-of-order entries. The previous voice declaration fix remained intact. Migration generation, builds, tests and typechecks were not run; the platform must perform validation. No migrations were applied manually, database records changed, or deployment success claimed. The branches described below were not rechecked, so the historical findings do not establish their current readiness.

## Historical failure

Project: `c7dc12f9-272f-4464-aad2-dd7917776515`  
Pull request: https://github.com/finance538/oneshot-hub-ai/pull/8  
Failed deployment: https://app.netlify.com/projects/1shotcam-ecosystem/deploys/6ad4844e1917ccba58ec0cba

Read-only Netlify status inspection identified two different histories:

| Database branch | Distinct applied migrations |
| --- | --- |
| `agent-with-secure-login-8f6c` (pull-request deployment) | `20261018073311_workforce_collaboration`, `20261018073400_expand_workforce_catalog` |
| `agent-6ad479492fc86f99d54a8f` (agent preview) | `20261018075054_add_workforce_live_operations`, `20261018075055_expand_workforce_team`, `20261018083007_restore_workforce_collaboration`, `20261018083019_restore_workforce_catalog` |

Both share the eight earlier migrations. The pull-request database reports the two originals as missing on disk. The agent preview reports twelve applied migrations and no pending migrations with the current source.

Restoring the originals alone makes them out of order on the agent preview. The replacement collaboration migration also adds the same column already added by the original, so replaying both without reconciling their application records would cause a duplicate-column error. Renaming or deleting another applied migration is not a data-preserving reconciliation.

## Required platform intervention

Netlify database administration/support needs to reconcile the two histories using a supported data-preserving procedure. Verify SQL contents and resulting schemas, retain existing collaboration values and employee records, and establish a canonical migration history accepted by both preview branches. Do not infer equivalence from migration names alone. Do not manually falsify the migration table or apply DDL outside the managed migration mechanism. Production is outside the authorized change scope.

The available CLI exposes status, pull, generation, migration application, pending-file removal, and destructive database reset. It does not expose a documented data-preserving history reconciliation command. No database reset, migration application, ledger mutation, deployment, or support message was performed in this investigation.

After reconciliation, verify both branches explicitly, retain the authoritative applied files, reconcile Drizzle snapshots, and let the platform run deployment validation. A clean agent-preview status alone does not establish pull-request deployment readiness.

## Remaining source conflicts

Three-way inspection against main commit `9321aec44568340c9b1bbe407048df1416630f82` identified conflicts in `db/schema.ts`, `netlify/lib/workforce-conversation.ts`, `src/workforce/OfficeScene.tsx`, `src/workforce/office-scene.css`, `src/workforce/officeEngine.ts`, `src/workforce/useConversation.ts`, and `src/workforce/useLiveVoice.ts`. README no longer has the original conflict in this comparison. These source conflicts are separate from the database failure and remain unresolved; the remote pull request is not ready to merge.
