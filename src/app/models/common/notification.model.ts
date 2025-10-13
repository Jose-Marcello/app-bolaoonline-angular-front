// src/app/models/common/notification.model.ts

export interface NotificationDto {
  codigo: string;
  tipo: string; // Ex: 'Sucesso', 'Erro', 'Alerta'
  mensagem: string;
  nomeCampo?: string; // <<-- ADICIONADO: Propriedade opcional nomeCampo
}
