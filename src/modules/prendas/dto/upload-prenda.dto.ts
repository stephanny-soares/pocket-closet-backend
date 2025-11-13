export class UploadPrendaDto {
  // El archivo viene en el multipart, no en el body
  // El service se encargará de extraerlo

  // Estos campos son opcionales, el usuario puede completarlos
  marca?: string;
  ocasion?: string;
  estacion?: string;
}