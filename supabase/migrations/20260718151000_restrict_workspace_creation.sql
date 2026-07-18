-- Supabase grants functions to API roles by default. Workspace creation is
-- deliberately available only after email authentication.
revoke execute on function public.create_workspace(text, text) from anon;
