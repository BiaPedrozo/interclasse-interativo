-- Reinicia os dados operacionais sem excluir contas ou perfis de usuário.
-- Requer a migração inicial já aplicada. Execute uma única vez via Supabase CLI.
-- Perfis são mantidos; a turma é desvinculada porque as turmas serão removidas.
-- Objetos de Storage não são alterados por esta migração.

update public.profiles
set class_id = null
where class_id is not null;

delete from public.votes;
delete from public.candidates;
delete from public.results;
delete from public.matches;
delete from public.polls;
delete from public.images;
delete from public.news;
delete from public.athletes;
delete from public.teams;
delete from public.school_classes;
delete from public.modalities;
delete from public.audit_log;
