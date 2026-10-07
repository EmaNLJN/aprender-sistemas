-- The only file with MySQL users and privileges. Only the db-grants service and the init of a new volume
-- apply it, both as root. It must stay idempotent: db-grants runs it again on volumes that already exist.
GRANT SELECT ON performance_schema.events_transactions_current TO 'taller'@'%';
