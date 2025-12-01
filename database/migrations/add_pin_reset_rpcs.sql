-- Migration: RPCs para reset de PIN via OTP SMS
-- Data: 2025-12-01

-- ============================================================
-- RPC 1: Solicitar código OTP para reset de PIN
-- ============================================================
CREATE OR REPLACE FUNCTION request_pin_reset_otp(
  p_phone TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE(
  otp_id INTEGER,
  phone TEXT,
  expires_in_seconds INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resident RECORD;
  v_otp_code TEXT;
  v_otp_id INTEGER;
  v_normalized_phone TEXT;
BEGIN
  -- Normaliza telefone
  v_normalized_phone := REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g');

  -- Valida telefone
  IF v_normalized_phone IS NULL OR LENGTH(v_normalized_phone) < 9 THEN
    RAISE EXCEPTION 'Telefone inválido';
  END IF;

  -- Busca residente por telefone
  SELECT * INTO v_resident
  FROM residents r
  WHERE r.phone = v_normalized_phone
  LIMIT 1;

  IF v_resident.id IS NULL THEN
    -- Por segurança, não revela se telefone existe ou não
    RAISE EXCEPTION 'Se o telefone estiver cadastrado, você receberá um SMS com o código.';
  END IF;

  -- Verifica se residente já tem PIN (não pode resetar se nunca configurou)
  IF v_resident.pin_hash IS NULL OR v_resident.pin_hash = '' THEN
    RAISE EXCEPTION 'PIN não cadastrado. Realize o primeiro acesso através da opção "Primeiro Acesso".';
  END IF;

  -- Gera código OTP de 6 dígitos
  v_otp_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

  -- Insere OTP na tabela (trigger irá validar rate limit)
  INSERT INTO otp_codes (
    phone,
    code,
    purpose,
    resident_id,
    ip_address,
    user_agent
  )
  VALUES (
    v_normalized_phone,
    v_otp_code,
    'RESET_PIN',
    v_resident.id,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_otp_id;

  -- TODO: Integração com serviço de SMS (Twilio, AWS SNS, etc.)
  -- Por ora, apenas retorna o código (em produção, remover isso!)
  -- PERFORM send_sms(v_normalized_phone, 'Seu código de verificação Elite CondoGuard: ' || v_otp_code);

  -- Log (opcional)
  RAISE NOTICE 'OTP gerado para telefone %: % (ID: %)', v_normalized_phone, v_otp_code, v_otp_id;

  RETURN QUERY
  SELECT
    v_otp_id,
    v_normalized_phone,
    600, -- 10 minutos em segundos
    'Código enviado por SMS. Válido por 10 minutos.'::TEXT;
END;
$$;

-- ============================================================
-- RPC 2: Validar OTP e resetar PIN
-- ============================================================
CREATE OR REPLACE FUNCTION reset_pin_with_otp(
  p_phone TEXT,
  p_otp_code TEXT,
  p_new_pin TEXT
)
RETURNS TABLE(
  id INTEGER,
  name TEXT,
  phone TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_otp RECORD;
  v_resident RECORD;
  v_new_pin_hash TEXT;
  v_normalized_phone TEXT;
BEGIN
  -- Normaliza telefone
  v_normalized_phone := REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g');

  -- Valida novo PIN
  IF LENGTH(p_new_pin) < 4 OR LENGTH(p_new_pin) > 6 OR p_new_pin !~ '^\d+$' THEN
    RAISE EXCEPTION 'PIN deve ter entre 4 e 6 dígitos numéricos';
  END IF;

  -- Busca OTP mais recente e ainda válido
  SELECT * INTO v_otp
  FROM otp_codes
  WHERE phone = v_normalized_phone
    AND purpose = 'RESET_PIN'
    AND used_at IS NULL
    AND expires_at > NOW()
    AND attempts < max_attempts
  ORDER BY created_at DESC
  LIMIT 1;

  -- Verifica se OTP existe
  IF v_otp.id IS NULL THEN
    RAISE EXCEPTION 'Código inválido, expirado ou já utilizado. Solicite um novo código.';
  END IF;

  -- Incrementa tentativas
  UPDATE otp_codes
  SET attempts = attempts + 1
  WHERE id = v_otp.id;

  -- Verifica se código está correto
  IF v_otp.code != p_otp_code THEN
    -- Se atingiu máximo de tentativas, invalida o OTP
    IF v_otp.attempts + 1 >= v_otp.max_attempts THEN
      UPDATE otp_codes
      SET used_at = NOW()
      WHERE id = v_otp.id;

      RAISE EXCEPTION 'Código incorreto. Máximo de tentativas atingido. Solicite um novo código.';
    END IF;

    RAISE EXCEPTION 'Código incorreto. Tentativa % de %.', v_otp.attempts + 1, v_otp.max_attempts;
  END IF;

  -- Busca residente
  SELECT * INTO v_resident
  FROM residents
  WHERE id = v_otp.resident_id;

  IF v_resident.id IS NULL THEN
    RAISE EXCEPTION 'Residente não encontrado';
  END IF;

  -- Gera hash bcrypt do novo PIN
  v_new_pin_hash := crypt(p_new_pin, gen_salt('bf', 10));

  -- Atualiza PIN do residente
  UPDATE residents
  SET
    pin_hash = v_new_pin_hash,
    app_last_seen_at = NOW()
  WHERE id = v_resident.id;

  -- Marca OTP como utilizado
  UPDATE otp_codes
  SET used_at = NOW()
  WHERE id = v_otp.id;

  -- Invalida todos os outros OTPs deste residente (segurança)
  UPDATE otp_codes
  SET used_at = NOW()
  WHERE resident_id = v_resident.id
    AND id != v_otp.id
    AND used_at IS NULL;

  -- Log de auditoria
  RAISE NOTICE 'PIN resetado com sucesso para residente % (ID: %)', v_resident.name, v_resident.id;

  RETURN QUERY
  SELECT
    v_resident.id,
    v_resident.name,
    v_resident.phone,
    'PIN alterado com sucesso!'::TEXT;
END;
$$;

-- ============================================================
-- RPC 3: Verificar se OTP é válido (sem consumir tentativa)
-- ============================================================
CREATE OR REPLACE FUNCTION check_otp_validity(
  p_phone TEXT
)
RETURNS TABLE(
  has_valid_otp BOOLEAN,
  expires_in_seconds INTEGER,
  attempts_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_otp RECORD;
  v_normalized_phone TEXT;
BEGIN
  v_normalized_phone := REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g');

  SELECT * INTO v_otp
  FROM otp_codes
  WHERE phone = v_normalized_phone
    AND purpose = 'RESET_PIN'
    AND used_at IS NULL
    AND expires_at > NOW()
    AND attempts < max_attempts
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_otp.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 0;
  ELSE
    RETURN QUERY
    SELECT
      TRUE,
      EXTRACT(EPOCH FROM (v_otp.expires_at - NOW()))::INTEGER,
      (v_otp.max_attempts - v_otp.attempts)::INTEGER;
  END IF;
END;
$$;

-- ============================================================
-- Comentários e documentação
-- ============================================================
COMMENT ON FUNCTION request_pin_reset_otp IS 'Gera código OTP e envia SMS para reset de PIN do residente';
COMMENT ON FUNCTION reset_pin_with_otp IS 'Valida OTP e atualiza PIN do residente';
COMMENT ON FUNCTION check_otp_validity IS 'Verifica se existe OTP válido sem consumir tentativa';
