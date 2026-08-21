REVOKE EXECUTE ON FUNCTION public.admin_points_overview(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_points_user_detail(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_grant_points(uuid, integer, text) FROM anon;