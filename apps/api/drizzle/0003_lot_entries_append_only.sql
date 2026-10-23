-- Histórico de lances é somente inserção (RN-15). Defesa extra: a detecção de adulteração é
-- criptográfica e funciona mesmo que este trigger seja removido por quem tem acesso ao banco.
CREATE FUNCTION lot_entries_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'lot_entries é append-only: % não permitido', TG_OP;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER lot_entries_no_update_delete
BEFORE UPDATE OR DELETE ON lot_entries
FOR EACH ROW EXECUTE FUNCTION lot_entries_append_only();
--> statement-breakpoint
CREATE TRIGGER lot_entries_no_truncate
BEFORE TRUNCATE ON lot_entries
FOR EACH STATEMENT EXECUTE FUNCTION lot_entries_append_only();
