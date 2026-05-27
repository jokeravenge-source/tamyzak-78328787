CREATE OR REPLACE FUNCTION public.handle_new_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(NEW.email) IN (
    'majs11@gmail.com',
    'mustafa@gmail.com',
    'abdallah6dhs@gmail.com',
    'haneenherself@gmail.com',
    'kszolg0-dwldbx-txxeyzasmamohammed848@gmail.com',
    'neneworkfordhs@gamil.com',
    'sx97623@gmail.com'
  ) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;