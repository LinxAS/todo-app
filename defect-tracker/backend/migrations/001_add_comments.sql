CREATE TABLE IF NOT EXISTS comments (
    id          SERIAL PRIMARY KEY,
    defect_id   INT NOT NULL REFERENCES defects(id) ON DELETE CASCADE,
    user_id     INT NOT NULL,
    body        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comments_defect_id_idx ON comments(defect_id);
