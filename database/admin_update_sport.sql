CREATE OR REPLACE FUNCTION public.admin_update_sport(p_id int4, p_data jsonb)
RETURNS public.sports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec public.sports;
  v_set_clause text;
BEGIN
  v_rec := jsonb_populate_record(NULL::public.sports, p_data);

  SELECT string_agg(
    format('%I = COALESCE(($1).%I, %I)', column_name, column_name, column_name),
    ', '
  )
  INTO v_set_clause
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'sports'
    AND column_name <> 'id';

  EXECUTE format('UPDATE public.sports SET %s WHERE id = $2 RETURNING *', v_set_clause)
  INTO v_rec
  USING v_rec, p_id;

  RETURN v_rec;
END;
$$;
