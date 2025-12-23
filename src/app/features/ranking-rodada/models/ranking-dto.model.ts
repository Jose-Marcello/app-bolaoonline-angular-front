export interface RankingDto {
  usuarioId: string;
  apostadorId: string;
  nomeApostador: string;
  apelido: string;
  pontuacao: number; //totalPontos: number;
  posicao: number;
  dataAtualizacao?: string; // Inclua este campo, tornando-o opcional
  fotoPerfil: string;      // Inclua este campo, pois o HTML o utiliza
}