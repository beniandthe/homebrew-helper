create index if not exists idx_projects_user_id
  on public.projects (user_id);

create index if not exists idx_saved_projects_campaign_id
  on public.saved_projects (campaign_id)
  where campaign_id is not null;
