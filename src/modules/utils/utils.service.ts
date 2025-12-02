import { Injectable } from '@nestjs/common';

@Injectable()
export class UtilsService {
  async obtenerCiudadPorCoordenadas(
    latitude: number,
    longitude: number,
  ): Promise<string> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
      
      console.log('🌍 URL Nominatim:', url);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PocketCloset/1.0',
        },
      });
      
      const data: any = await response.json();
      console.log('📦 DATA:', JSON.stringify(data, null, 2));
      
      // Nominatim devuelve "address.city" o "address.town"
      const ciudad = data.address?.city || data.address?.town || data.address?.county || 'Ubicación desconocida';
      console.log('✅ Ciudad:', ciudad);
      
      return ciudad;
    } catch (error: any) {
      console.error('❌ ERROR:', error.message);
      return 'Ubicación desconocida';
    }
  }
}