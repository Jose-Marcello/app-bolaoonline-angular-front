
export interface EquipeDto {
  id: string;
  nome: string;
  tipo: string;   // Adicionado: Tipo da equipe (ex: "Clube", "Seleção")
  escudo: string; // Corrigido/Adicionado: Caminho ou URL da imagem do escudo da equipe
  sigla: string;  // Adicionado: Sigla da equipe (ex: "FLA", "COR")
  ufId: number;   // Adicionado: ID da UF (Estado)

  // As propriedades 'vitorias', 'derrotas', 'empates' eram apenas exemplos e foram removidas
  // Mantenha apenas as propriedades que o backend realmente retorna neste DTO.
}
