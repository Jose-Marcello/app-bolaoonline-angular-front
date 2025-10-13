// Localização: src/app/models/apostador-campeonato-dto.model.ts
import { CampeonatoDto } from '@models/campeonato/campeonato-dto.model';
import { ApostadorDto } from '@models/apostador/apostador-dto.model'; // Assumindo que você tem um ApostadorDto

export interface ApostadorCampeonatoDto {
  id: string;
  apostadorId: string;
  campeonatoId: string;
  //dataAdesao: Date;
  //ativo: boolean;
  pontuacao: number; // Pontuação total acumulada neste campeonato
  posicao: number;
  dataInscricao: string; // Data em que o apostador se inscreveu/aderiu ao campeonato (ou Date)
  custoAdesaoPago: boolean; // Indica se o custo de adesão ao campeonato foi pago


  // Propriedades de navegação (opcionais, dependendo do que o backend envia)
  apostador?: ApostadorDto;
  campeonato?: CampeonatoDto;
}
