#!/usr/bin/env bash
set -euo pipefail
# This is an actual restore into a DISPOSABLE local database, never production.
[[ "${CI:-}" == true && "${DATABASE_URL:-}" == postgresql://test:test@localhost:5432/test ]] || { echo 'Refusing non-CI restore'; exit 1; }
mkdir -p test-results/restore
export PGPASSWORD=test
command -v pg_dump >/dev/null
# A custom-format archive is restored into an independent database. It never
# contains production rows, and the dump is removed rather than uploaded.
pg_dump -h localhost -U test -d test --format=custom --no-owner --file=test-results/restore/fixture.dump
createdb -h localhost -U test crm_restore_drill
pg_restore -h localhost -U test -d crm_restore_drill --no-owner --exit-on-error test-results/restore/fixture.dump
for table in Organization User Item Category PlatformOperationRun PlatformAdminGrant; do
 before=$(psql -h localhost -U test -d test -Atc "SELECT count(*) FROM \"$table\"")
 after=$(psql -h localhost -U test -d crm_restore_drill -Atc "SELECT count(*) FROM \"$table\"")
 [[ "$before" == "$after" ]] || { echo "Restore mismatch: $table"; exit 1; }
 printf '%s: source=%s restored=%s\n' "$table" "$before" "$after" >> test-results/restore/report.txt
done
printf '\nPASS: disposable database dump restored with matching checked table counts. This is not a production backup or proof of a configured production backup schedule.\n' >> test-results/restore/report.txt
rm test-results/restore/fixture.dump
cat test-results/restore/report.txt
