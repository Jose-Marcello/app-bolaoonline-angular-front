export interface ApostaJogoEdicaoDto {
  id: string; // ID do Palpite (se já existir)
  idJogo: string;
  
  equipeMandante: string;
  siglaMandante: string; // A sigla está no DTO do backend, deve estar aqui também
  escudoMandante: string;

  equipeVisitante: string;
  siglaVisitante: string; // A sigla está no DTO do backend, deve estar aqui também
  escudoVisitante: string;

  placarApostaCasa: number | null;
  placarApostaVisita: number | null;
  
  dataJogo: string;
  horaJogo: string;  
  statusJogo: string;

  estadioNome: string; 

  enviada: boolean; // Corrigido: Campo 'enviada' adicionado para refletir o DTO do backend

  dataCompleta?: Date; // Opcional, campo calculado no frontend
  
}


/*      "id": "f8a76460-daf3-42b0-a385-e618d234f855", OK
        "idJogo": "e433085a-fa83-4450-7147-08dd8cd6453f", OK
       
        "equipeMandante": "Grêmio",  OK
        "siglaMandante": "GRE", OK
        "escudoMandante": "efe71655-ef5e-4ce5-b0b1-ab063631dec7_gremio_original.png", OK

        "equipeVisitante": "Atlético Mineiro",  OK
        "siglaVisitante": "CAM",  OK
        "escudoVisitante": "648052d1-d75b-48a8-b9 8e-2cc6ab00bf42_atletico-mineiro-original.png",  OK

        "placarApostaCasa": 1,  OK
        "placarApostaVisita": 1, OK
       
        "dataJogo": "2025-03-29", OK
        "horaJogo": "18:30",   OK
        "statusJogo": "NaoIniciado",   OK

        "estadioNome": "Arena Grêmio", 

        "enviada": true

        */