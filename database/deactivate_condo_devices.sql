-- Deactivate all active devices for a condominium
-- Required for SupabaseService.deactivateCondoDevices()
create or replace function deactivate_condo_devices(p_condominium_id int4)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update devices
  set status = 'INACTIVE'
  where condominium_id = p_condominium_id
    and status = 'ACTIVE';

  return true;
end;
$$;
