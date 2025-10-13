
export interface JogoDto {
  id: string; // Corresponde a Guid do C#
  rodadaId: string; // Corresponde a Guid do C#

  equipeCasaCampeonatoId: string; // ID da EquipeCampeonato para a casa
  equipeCasaNome: string;
  equipeCasaSigla : string;
  equipeCasaEscudoUrl: string;

  equipeVisitanteCampeonatoId: string; // ID da EquipeCampeonato para o visitante
  equipeVisitanteNome: string;
  equipeVisitaSigla: string;
  equipeVisitanteEscudoUrl: string;

  estadioId: string;
  estadioNome: string;
  
  dataHora: string; // DateTime do C# vira string ISO 8601 no JSON
  status: 'Agendado' | 'Em Andamento' | 'Finalizado' | 'Cancelado'; // Status correspondente ao backend
  placarCasa: number | null;
  placarFora: number | null;
}
