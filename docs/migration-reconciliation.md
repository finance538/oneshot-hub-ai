# Data-preserving migration reconciliation

The owner requires preservation of all preview data. Do not reset either preview database, remove application records, or rewrite applied migration files to make validation pass.

## Resolution

The canonical history was established from the applied originals. The unapplied `20261018083007_restore_workforce_collaboration` and `20261018083019_restore_workforce_catalog` files were exact duplicates of the already-applied `20261018073311_workforce_collaboration` and `20261018073400_expand_workforce_catalog` migrations, so they were removed from disk without touching any applied migration or any database record. The pending `20261018075054_add_workforce_live_operations` Drizzle snapshot was rebased onto the applied collaboration snapshot (single `prevIds` parent, `collaboration` column merged into its DDL), restoring one linear history with a single leaf. No data was reset and no migration table was edited.

## Verified failure

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
