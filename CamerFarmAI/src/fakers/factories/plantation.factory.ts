// src/fakers/factories/plantation.factory.ts
import { faker } from '@faker-js/faker';
import { Plantation, PlantationMode } from '../../models/Plantation.entity';
import { getRandomCameroonLocation, getRandomCameroonCrop } from '../helpers/cameroon-data';

export interface CreatePlantationOptions {
  ownerId: string;
  name?: string;
  location?: string;
  cropType?: string;
  area?: number;
  mode?: PlantationMode;
  coordinates?: { lat: number; lng: number };
}

/**
 * Factory pour générer des plantations avec des données réalistes
 */
export class PlantationFactory {
  /**
   * Génère une plantation avec des données réalistes
   */
  static create(options: CreatePlantationOptions): Partial<Plantation> {
    const {
      ownerId,
      name,
      location,
      cropType,
      area,
      mode = faker.helpers.arrayElement([PlantationMode.AUTOMATIC, PlantationMode.MANUAL]),
      coordinates,
    } = options;

    const cameroonLocation = getRandomCameroonLocation();
    const finalLocation = location || `${cameroonLocation.name}, ${cameroonLocation.region}`;
    const finalCropType = cropType || getRandomCameroonCrop();
    const finalCoordinates = coordinates || cameroonLocation.coordinates;

    // Générer un nom réaliste si non fourni
    const finalName = name || this.generatePlantationName(finalCropType, cameroonLocation.name);

    // Générer une superficie réaliste (en m²) si non fournie
    // Entre 0.5 et 50 hectares (5000 à 500000 m²)
    const finalArea = area !== undefined 
      ? area 
      : faker.number.float({ min: 5000, max: 500000, fractionDigits: 2 });

    return {
      name: finalName,
      location: finalLocation,
      cropType: finalCropType,
      area: finalArea,
      mode,
      ownerId,
      coordinates: finalCoordinates,
    };
  }

  /**
   * Génère plusieurs plantations pour un propriétaire
   */
  static createBatch(ownerId: string, count: number, options: Omit<CreatePlantationOptions, 'ownerId'> = {}): Partial<Plantation>[] {
    const plantations: Partial<Plantation>[] = [];

    for (let i = 0; i < count; i++) {
      const plantation = this.create({
        ownerId,
        ...options,
      });
      plantations.push(plantation);
    }

    return plantations;
  }

  /**
   * Génère une plantation en mode automatique
   */
  static createAutomatic(options: Omit<CreatePlantationOptions, 'mode'>): Partial<Plantation> {
    return this.create({ ...options, mode: PlantationMode.AUTOMATIC });
  }

  /**
   * Génère une plantation en mode manuel
   */
  static createManual(options: Omit<CreatePlantationOptions, 'mode'>): Partial<Plantation> {
    return this.create({ ...options, mode: PlantationMode.MANUAL });
  }

  /**
   * Génère un nom de plantation réaliste
   */
  private static generatePlantationName(cropType: string, cityName: string): string {
    const prefixes = ['Champ', 'Parcelle', 'Exploitation', 'Ferme', 'Domaine'];
    const suffixes = ['Nord', 'Sud', 'Est', 'Ouest', 'Central', 'Principal', 'Secondaire'];
    
    const prefix = faker.helpers.arrayElement(prefixes);
    const suffix = faker.datatype.boolean({ probability: 0.5 }) 
      ? faker.helpers.arrayElement(suffixes)
      : cityName;

    return `${prefix} de ${cropType} ${suffix}`;
  }
}

