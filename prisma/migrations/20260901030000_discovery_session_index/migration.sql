CREATE INDEX "recommendation_events_session_id_occurred_at_idx"
ON "recommendation_events"("session_id", "occurred_at");
