// Localização: src/app/models/aposta/aposta-jogo-visualizacao-dto.model.ts

/**
 * DTO para visualização de um jogo dentro do formulário de aposta.
 * Combina informações do Jogo e do Palpite do usuário.
 */
export interface ApostaJogoResultadoDto {
  
  id: string; // ID do Palpite (se já existir uma aposta), ou ID temporário
  idJogo: string; // ID do Jogo real

  // Detalhes do Jogo (vindos do JogoDto aninhado no PalpiteDto do backend)
  equipeMandante: string;
  siglaMandante: string; // Pode ser vazia se não vier do backend
  escudoMandante: string;

  equipeVisitante: string;
  siglaVisitante: string; // Pode ser vazia se não vier do backend
  escudoVisitante: string;  

  placarRealCasa: number | null; // Placar final do jogo
  placarRealVisita: number | null; // Placar final do jogo

  estadioNome: string; // Nome do estádio 

  dataJogo: string; // Data formatada do jogo (com dia da semana)
  horaJogo: string; // Hora formatada do jogo
  statusJogo: string; // Status do jogo (ex: 'Agendado', 'Finalizado')

  dataCompleta?: Date; 

  // Detalhes da Aposta (vindos do PalpiteDto)
  // <<-- CORRIGIDO: Nomes das propriedades para corresponder ao backend -->>
  placarApostaCasa: number | null; // Palpite do usuário para o placar do time da casa
  placarApostaVisita: number | null; // Palpite do usuário para o placar do time visitante 

  pontuacao: number; // Pontuação obtida com este palpite (mantida para referência, não exibida)

}
