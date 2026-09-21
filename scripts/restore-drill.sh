#!/usr/bin/env bash
set -euo pipefail
[[ "${CI:-}" == true && "${DATABASE_URL:-}" == postgresql://test:test@localhost:5432/test ]] || { echo 'Refusing non-CI restore'; exit 1; }
mkdir -p test-results/restore
container=$(docker ps --filter ancestor=postgres:16 --format '{{.ID}}')
[[ $(printf '%s\n' "$container" | wc -l) -eq 1 && -n "$container" ]] || { echo 'Expected exactly one disposable PostgreSQL 16 service'; exit 1; }
# Use matching PostgreSQL 16 tools inside the fixture container. The archive
# never leaves the disposable runner and contains no production data.
docker exec "$container" pg_dump -U test -d test --format=custom --no-owner > test-results/restore/fixture.dump
docker exec "$container" createdb -U test crm_restore_drill
docker exec -i "$container" pg_restore -U test -d crm_restore_drill --no-owner --exit-on-error < test-results/restore/fixture.dump
for table in Organization User Item Category CatalogTemplate PlatformOperationRun PlatformAdminGrant PlatformBillingSnapshot PlatformBillingHistory PlatformWebhookReceipt PlatformDomainCheck PlatformFeatureUsage PlatformSetting AuthSessionRegistry TenantErasureRequest SecurityStepUpAttempt AutomationSchedulePolicy AutomationDelivery; do
 before=$(docker exec "$container" psql -U test -d test -Atc "SELECT count(*) FROM \"$table\"")
 after=$(docker exec "$container" psql -U test -d crm_restore_drill -Atc "SELECT count(*) FROM \"$table\"")
 [[ "$before" == "$after" && "$before" -gt 0 ]] || { echo "Restore mismatch or empty fixture: $table"; exit 1; }
 # Compare complete stored row content as well as counts, without printing it.
 source_hash=$(docker exec "$container" psql -U test -d test -Atc "SELECT row_to_json(t)::text FROM \"$table\" t ORDER BY row_to_json(t)::text" | sha256sum | cut -d' ' -f1)
 restored_hash=$(docker exec "$container" psql -U test -d crm_restore_drill -Atc "SELECT row_to_json(t)::text FROM \"$table\" t ORDER BY row_to_json(t)::text" | sha256sum | cut -d' ' -f1)
 [[ "$source_hash" == "$restored_hash" ]] || { echo "Restored content mismatch: $table"; exit 1; }
 printf '%s: source=%s restored=%s; row contents match\n' "$table" "$before" "$after" >> test-results/restore/report.txt
done
printf '\nPASS: disposable fixture backup restored into a different database with matching complete row contents across 18 populated tables. This is not a production backup or evidence of a configured production backup schedule.\n' >> test-results/restore/report.txt
rm test-results/restore/fixture.dump
cat test-results/restore/report.txt
