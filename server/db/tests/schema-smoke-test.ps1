$ErrorActionPreference = 'Stop'

if (-not ('InterclasseSqlite' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class InterclasseSqlite {
  [DllImport("winsqlite3.dll", CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
  private static extern int sqlite3_open(string filename, out IntPtr database);

  [DllImport("winsqlite3.dll", CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
  private static extern int sqlite3_exec(IntPtr database, string sql, IntPtr callback, IntPtr state, out IntPtr errorMessage);

  [DllImport("winsqlite3.dll", CallingConvention = CallingConvention.Cdecl)]
  private static extern void sqlite3_free(IntPtr memory);

  [DllImport("winsqlite3.dll", CallingConvention = CallingConvention.Cdecl)]
  private static extern int sqlite3_close(IntPtr database);

  public static IntPtr OpenMemory() {
    IntPtr database;
    int result = sqlite3_open(":memory:", out database);
    if (result != 0) throw new Exception("sqlite3_open falhou: " + result);
    return database;
  }

  public static void Execute(IntPtr database, string sql) {
    IntPtr errorMessage;
    int result = sqlite3_exec(database, sql, IntPtr.Zero, IntPtr.Zero, out errorMessage);
    if (result != 0) {
      string message = errorMessage == IntPtr.Zero ? "erro SQLite " + result : Marshal.PtrToStringAnsi(errorMessage);
      if (errorMessage != IntPtr.Zero) sqlite3_free(errorMessage);
      throw new Exception(message);
    }
  }

  public static bool Fails(IntPtr database, string sql) {
    try { Execute(database, sql); return false; }
    catch { return true; }
  }

  public static void Close(IntPtr database) { sqlite3_close(database); }
}
'@
}

function Assert-True([bool]$Condition, [string]$Name) {
  if (-not $Condition) { throw "FALHOU: $Name" }
  Write-Output "APROVADO: $Name"
}

$database = [InterclasseSqlite]::OpenMemory()
try {
  $migrationPath = Join-Path $PSScriptRoot '..\migrations\001_initial_schema.sql'
  $migration = [System.IO.File]::ReadAllText((Resolve-Path $migrationPath))
  [InterclasseSqlite]::Execute($database, $migration)
  Write-Output 'APROVADO: migração executada em SQLite em memória'

  [InterclasseSqlite]::Execute($database, @'
INSERT INTO school_classes (id, name, year_label) VALUES (1, 'Turma Teste A', 'Demonstração');
INSERT INTO school_classes (id, name, year_label) VALUES (2, 'Turma Teste B', 'Demonstração');
INSERT INTO modalities (id, name) VALUES (1, 'Modalidade Teste');
INSERT INTO users (id, email, display_name, password_hash, role) VALUES (1, 'admin@example.invalid', 'Admin de teste', 'hash-nao-utilizavel', 'admin');
INSERT INTO users (id, email, display_name, password_hash, role, class_id) VALUES (2, 'student@example.invalid', 'Estudante de teste', 'hash-nao-utilizavel', 'student', 1);
INSERT INTO teams (id, name, class_id, modality_id) VALUES (1, 'Equipe A', 1, 1);
INSERT INTO teams (id, name, class_id, modality_id) VALUES (2, 'Equipe B', 2, 1);
INSERT INTO athletes (id, team_id, name) VALUES (1, 1, 'Atleta de teste');
INSERT INTO matches (id, modality_id, home_team_id, away_team_id, starts_at, venue, created_by)
  VALUES (1, 1, 1, 2, '2026-12-01T14:00:00Z', 'Quadra de teste', 1);
INSERT INTO results (id, match_id, home_score, away_score, updated_by) VALUES (1, 1, 2, 1, 1);
INSERT INTO polls (id, title, category, starts_at, ends_at, created_by)
  VALUES (1, 'Enquete de teste', 'destaque', '2026-12-01T00:00:00Z', '2026-12-02T00:00:00Z', 1);
INSERT INTO candidates (id, poll_id, athlete_id) VALUES (1, 1, 1);
INSERT INTO votes (id, poll_id, candidate_id, student_id) VALUES (1, 1, 1, 2);
'@)
  Write-Output 'APROVADO: inserções válidas e relacionamentos básicos'

  Assert-True ([InterclasseSqlite]::Fails($database, "INSERT INTO results (match_id, home_score, away_score, updated_by) VALUES (1, 1, 0, 1);")) 'unicidade de resultado por partida'
  Assert-True ([InterclasseSqlite]::Fails($database, "INSERT INTO votes (poll_id, candidate_id, student_id) VALUES (1, 1, 2);")) 'unicidade de voto por estudante e enquete'
  Assert-True ([InterclasseSqlite]::Fails($database, "INSERT INTO results (match_id, home_score, away_score, updated_by) VALUES (999, 1, 0, 1);")) 'chave estrangeira de resultado'
  Assert-True ([InterclasseSqlite]::Fails($database, "INSERT INTO results (match_id, home_score, away_score, updated_by) VALUES (2, -1, 0, 1);")) 'restrição de placar não negativo'
  Assert-True ([InterclasseSqlite]::Fails($database, "INSERT INTO matches (modality_id, home_team_id, away_team_id, starts_at, venue, created_by) VALUES (1, 1, 2, '2026-12-01T14:00:00Z', 'Quadra de teste', 1);")) 'conflito de horário e local'
  Assert-True ([InterclasseSqlite]::Fails($database, "INSERT INTO votes (poll_id, candidate_id, student_id) VALUES (1, 999, 2);")) 'candidato precisa pertencer à enquete'
}
finally {
  [InterclasseSqlite]::Close($database)
}
