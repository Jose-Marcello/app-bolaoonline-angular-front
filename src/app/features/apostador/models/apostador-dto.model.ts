
import { SaldoDto } from '../models/saldo.model';
import { ApostadorCampeonatoDto } from '../../apostador-campeonato/models/apostador-campeonato-dto.model';
import { PreservedCollection } from '../../../shared/models/api-response.model';

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
