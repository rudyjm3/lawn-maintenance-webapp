-- Add notes column to estimates (used by create/edit estimate form)
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS notes text;
