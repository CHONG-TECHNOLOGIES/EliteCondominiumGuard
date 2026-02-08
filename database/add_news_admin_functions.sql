-- =============================================
-- News Admin Functions for Elite AccessControl
-- =============================================
-- This migration adds RPC functions for admin management of condominium news and categories.
-- Run this in the Supabase SQL Editor.

-- =============================================
-- NEWS FUNCTIONS
-- =============================================

-- Get all news with pagination, search, category, and date range filters
CREATE OR REPLACE FUNCTION admin_get_all_news(
  p_condominium_id INT4 DEFAULT NULL,
  p_limit INT4 DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_category_id INT4 DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_after_created_at TIMESTAMPTZ DEFAULT NULL,
  p_after_id INT4 DEFAULT NULL
)
RETURNS SETOF condominium_news
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT cn.*
  FROM condominium_news cn
  WHERE
    (p_condominium_id IS NULL OR cn.condominium_id = p_condominium_id)
    AND (p_search IS NULL OR cn.title ILIKE '%' || p_search || '%'
      OR cn.description ILIKE '%' || p_search || '%'
      OR cn.content ILIKE '%' || p_search || '%')
    AND (p_category_id IS NULL OR cn.category_id = p_category_id)
    AND (p_date_from IS NULL OR cn.created_at::date >= p_date_from)
    AND (p_date_to IS NULL OR cn.created_at::date <= p_date_to)
    AND (p_after_created_at IS NULL
      OR cn.created_at < p_after_created_at
      OR (cn.created_at = p_after_created_at AND cn.id < p_after_id))
  ORDER BY cn.created_at DESC, cn.id DESC
  LIMIT COALESCE(p_limit, 1000);
END;
$$;

-- Create news
CREATE OR REPLACE FUNCTION admin_create_news(p_data JSONB)
RETURNS condominium_news
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_news condominium_news;
BEGIN
  INSERT INTO condominium_news (
    condominium_id,
    title,
    description,
    content,
    image_url,
    category_id,
    created_at,
    updated_at
  )
  VALUES (
    (p_data->>'condominium_id')::INT4,
    p_data->>'title',
    p_data->>'description',
    p_data->>'content',
    p_data->>'image_url',
    (p_data->>'category_id')::INT4,
    NOW(),
    NOW()
  )
  RETURNING * INTO v_news;

  RETURN v_news;
END;
$$;

-- Update news
CREATE OR REPLACE FUNCTION admin_update_news(p_id INT4, p_data JSONB)
RETURNS condominium_news
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_news condominium_news;
BEGIN
  UPDATE condominium_news
  SET
    title = COALESCE(p_data->>'title', title),
    description = COALESCE(p_data->>'description', description),
    content = COALESCE(p_data->>'content', content),
    image_url = COALESCE(p_data->>'image_url', image_url),
    category_id = COALESCE((p_data->>'category_id')::INT4, category_id),
    updated_at = NOW()
  WHERE id = p_id
  RETURNING * INTO v_news;

  RETURN v_news;
END;
$$;

-- Delete news
CREATE OR REPLACE FUNCTION admin_delete_news(p_id INT4)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM condominium_news WHERE id = p_id;
  RETURN FOUND;
END;
$$;

-- =============================================
-- NEWS CATEGORY FUNCTIONS
-- =============================================

-- Get all news categories
CREATE OR REPLACE FUNCTION get_news_categories()
RETURNS SETOF news_categories
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM news_categories
  ORDER BY sort_order ASC NULLS LAST, name ASC;
END;
$$;

-- Create news category
CREATE OR REPLACE FUNCTION admin_create_news_category(p_data JSONB)
RETURNS news_categories
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_category news_categories;
BEGIN
  INSERT INTO news_categories (
    name,
    label,
    created_at
  )
  VALUES (
    p_data->>'name',
    p_data->>'label',
    NOW()
  )
  RETURNING * INTO v_category;

  RETURN v_category;
END;
$$;

-- Update news category
CREATE OR REPLACE FUNCTION admin_update_news_category(p_id INT4, p_data JSONB)
RETURNS news_categories
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_category news_categories;
BEGIN
  UPDATE news_categories
  SET
    name = COALESCE(p_data->>'name', name),
    label = COALESCE(p_data->>'label', label)
  WHERE id = p_id
  RETURNING * INTO v_category;

  RETURN v_category;
END;
$$;

-- Delete news category
CREATE OR REPLACE FUNCTION admin_delete_news_category(p_id INT4)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First, set category_id to NULL for any news using this category
  UPDATE condominium_news SET category_id = NULL WHERE category_id = p_id;

  -- Then delete the category
  DELETE FROM news_categories WHERE id = p_id;
  RETURN FOUND;
END;
$$;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION admin_get_all_news(INT4, INT4, TEXT, INT4, DATE, DATE, TIMESTAMPTZ, INT4) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_create_news(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_news(INT4, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_news(INT4) TO authenticated;
GRANT EXECUTE ON FUNCTION get_news_categories() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_create_news_category(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_news_category(INT4, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_news_category(INT4) TO authenticated;

-- Grant to anon for public read access if needed
GRANT EXECUTE ON FUNCTION get_news_categories() TO anon;
