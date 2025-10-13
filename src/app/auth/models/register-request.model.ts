    // src/app/models/auth/register-request.model.ts

    /**
     * Interface que representa os dados enviados para o endpoint de registro do backend.
     */
    export interface RegisterRequestDto {
      apelido: string;
      email: string;     
      password: string;
      confirmPassword: string;
      cpf: string;
      fotoPerfil: string;
      nomeCompleto:string;
      celular: string;      
      scheme: string;
      host: string;
      sendConfirmationEmail: boolean;
      termsAccepted: boolean;
      // Adicione outras propriedades que seu backend espera para o registro
    }
    