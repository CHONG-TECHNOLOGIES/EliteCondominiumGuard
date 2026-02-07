-- get_news RPC function
-- Fetches news from condominium_news table for the last N days
-- Joins with news_categories to get category name and label

CREATE OR REPLACE FUNCTION get_news(
  p_condominium_id INT,
  p_days INT DEFAULT 7
)
RETURNS TABLE (
  id INT,
  condominium_id INT,
  title TEXT,
  description TEXT,
  content TEXT,
  image_url TEXT,
  category_id INT,
  category_name TEXT,
  category_label TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.condominium_id,
    n.title,
    n.description,
    n.content,
    n.image_url,
    n.category_id,
    nc.name AS category_name,
    nc.label AS category_label,
    n.created_at,
    n.updated_at
  FROM condominium_news n
  LEFT JOIN news_categories nc ON n.category_id = nc.id
  WHERE n.condominium_id = p_condominium_id
    AND n.created_at >= NOW() - (p_days || ' days')::INTERVAL
  ORDER BY n.created_at DESC;
END;
$$;
