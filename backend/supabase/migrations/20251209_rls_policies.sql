-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- SELECT Policy
CREATE POLICY leads_select_policy
ON leads
FOR SELECT
USING (
  (
    -- Admin: access to all leads in the same tenant
    (auth.jwt() ->> 'role') = 'admin'
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  )
  OR
  (
    -- Counselor: can read their own leads
    owner_id = auth.uid()
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  )
  OR
  (
    -- Counselor: leads assigned to their team
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND EXISTS (
      SELECT 1
      FROM user_teams ut_user
      WHERE ut_user.user_id = auth.uid()
        AND ut_user.team_id IN (
          SELECT ut_owner.team_id
          FROM user_teams ut_owner
          WHERE ut_owner.user_id = leads.owner_id
        )
    )
  )
);

-- INSERT Policy
CREATE POLICY leads_insert_policy
ON leads
FOR INSERT
WITH CHECK (
  tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  AND (
    (auth.jwt() ->> 'role') = 'admin'
    OR (
      (auth.jwt() ->> 'role') = 'counselor'
      AND owner_id = auth.uid()
    )
  )
);
