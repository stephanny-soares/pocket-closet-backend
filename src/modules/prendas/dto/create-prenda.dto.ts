export class CreatePrendaDto {
  imagen: string; // base64 o URL
  nombre?: string; // Si el usuario quiere override
  tipo?: string;
  color?: string;
  marca?: string;
  ocasion?: string;
  estacion?: string;
}
