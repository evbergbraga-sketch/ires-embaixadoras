-- Migration: Adicionar campo bonus_ativo na tabela profiles
-- Execute no Supabase SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bonus_ativo BOOLEAN NOT NULL DEFAULT false;

-- Comentário descritivo
COMMENT ON COLUMN profiles.bonus_ativo IS 
  'Nível Bônus — ativado manualmente pelo admin. Desbloqueia aulas bônus na Capacitação sem requisito de compras.';

-- Migration: Adicionar campos de Sob Encomenda na tabela products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sob_encomenda BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prazo_dias    INTEGER DEFAULT NULL;

COMMENT ON COLUMN products.sob_encomenda IS 'Produto sob encomenda — não disponível para pronta entrega';
COMMENT ON COLUMN products.prazo_dias    IS 'Prazo em dias corridos para entrega de produto sob encomenda';
