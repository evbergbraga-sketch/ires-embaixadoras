-- Migration: Adicionar campo bonus_ativo na tabela profiles
-- Execute no Supabase SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bonus_ativo BOOLEAN NOT NULL DEFAULT false;

-- Comentário descritivo
COMMENT ON COLUMN profiles.bonus_ativo IS 
  'Nível Bônus — ativado manualmente pelo admin. Desbloqueia aulas bônus na Capacitação sem requisito de compras.';
