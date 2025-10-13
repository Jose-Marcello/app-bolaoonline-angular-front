
import { SaldoDto } from '@models/apostador/saldo.model';
import { ApostadorCampeonatoDto } from '@models/apostador-campeonato/apostador-campeonato-dto.model';
import { PreservedCollection } from '@models/common/api-response.model';

export interface ApostadorDto {
  
  id: string; // <<-- A propriedade 'id' foi adicionada aqui para resolver o erro -->>
  usuarioId: string;
  fotoPerfil: string; 
  apelido: string;
  celular:string;
  email: string;
  saldo: SaldoDto; 
  
  /*
  usuario: {
     apelido: string;
     celular ;string;
     fotoPerfil: string;
     email:string;
      };
      */
    
  campeonatosAderidos?: PreservedCollection<ApostadorCampeonatoDto> | ApostadorCampeonatoDto[];
}
