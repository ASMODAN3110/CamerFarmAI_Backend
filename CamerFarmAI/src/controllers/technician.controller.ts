// src/controllers/technician.controller.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User.entity';
import { Plantation } from '../models/Plantation.entity';
import { Actuator } from '../models/Actuator.entity';
// Note: Utilisation de ILIKE directement dans les requêtes SQL pour la recherche case-insensitive

const userRepo = AppDataSource.getRepository(User);
const plantationRepo = AppDataSource.getRepository(Plantation);
const actuatorRepo = AppDataSource.getRepository(Actuator);

// Charger Sensor et SensorReading dynamiquement pour éviter les problèmes de référence circulaire
const getSensorModule = () => require('../models/Sensor.entity');
const getSensorReadingModule = () => require('../models/SensorReading.entity');

const getSensorRepo = () => {
  const { Sensor } = getSensorModule();
  return AppDataSource.getRepository(Sensor);
};

const getSensorReadingRepo = () => {
  const { SensorReading } = getSensorReadingModule();
  return AppDataSource.getRepository(SensorReading);
};

/**
 * Met à jour les statuts des capteurs d'une plantation basés sur leur dernière lecture.
 * Un capteur devient INACTIVE s'il n'a pas reçu de nouvelle lecture depuis 1 heure.
 * @param plantationId - ID de la plantation
 */
const updateSensorStatuses = async (plantationId: string) => {
  const sensorRepo = getSensorRepo();
  const sensorReadingRepo = getSensorReadingRepo();
  const { SensorStatus } = getSensorModule();

  // Récupérer la plantation avec son propriétaire pour les notifications
  const plantation = await plantationRepo.findOne({
    where: { id: plantationId },
    relations: ['owner'],
  });

  if (!plantation) {
    return;
  }

  // Récupérer tous les capteurs de la plantation
  const sensors = await sensorRepo.find({
    where: { plantationId },
  });

  if (sensors.length === 0) {
    return;
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 heure en millisecondes

  // Mettre à jour les statuts des capteurs
  for (const sensor of sensors) {
    // Stocker l'ancien statut pour détecter les changements
    const oldStatus = sensor.status;

    // Récupérer la dernière lecture du capteur
    const latestReading = await sensorReadingRepo.findOne({
      where: { sensorId: sensor.id },
      order: { timestamp: 'DESC' },
    });

    if (latestReading) {
      // Si la dernière lecture date de plus d'1 heure, marquer comme inactif
      if (latestReading.timestamp < oneHourAgo) {
        if (sensor.status !== SensorStatus.INACTIVE) {
          sensor.status = SensorStatus.INACTIVE;
          await sensorRepo.save(sensor);
          
          // Créer un événement et envoyer une notification si le statut a changé
          if (oldStatus !== SensorStatus.INACTIVE) {
            try {
              const { EventService } = require('../services/event/EventService');
              await EventService.notifySensorStatusChange(sensor, SensorStatus.INACTIVE, plantation);
            } catch (error) {
              console.error('Erreur lors de la création de la notification de changement de statut:', error);
            }
          }
        }
      } else {
        // Si la dernière lecture est récente, s'assurer que le capteur est actif
        if (sensor.status !== SensorStatus.ACTIVE) {
          sensor.status = SensorStatus.ACTIVE;
          await sensorRepo.save(sensor);
          
          // Créer un événement et envoyer une notification si le statut a changé
          if (oldStatus !== SensorStatus.ACTIVE) {
            try {
              const { EventService } = require('../services/event/EventService');
              await EventService.notifySensorStatusChange(sensor, SensorStatus.ACTIVE, plantation);
            } catch (error) {
              console.error('Erreur lors de la création de la notification de changement de statut:', error);
            }
          }
        }
      }
    }
    // Si le capteur n'a aucune lecture, on le laisse dans son état actuel (par défaut ACTIVE)
  }
};

const formatPlantationResponse = (plantation: Plantation) => ({
  id: plantation.id,
  name: plantation.name,
  location: plantation.location,
  area: plantation.area ?? null,
  createdAt: plantation.createdAt?.toISOString?.() ?? plantation.createdAt,
  cropType: plantation.cropType,
  mode: plantation.mode,
  ownerId: plantation.ownerId,
  updatedAt: plantation.updatedAt?.toISOString?.() ?? plantation.updatedAt,
});

/**
 * Récupère les statistiques globales pour le dashboard technique
 */
export const getStats = async (_req: Request, res: Response) => {
  try {
    // Compter les agriculteurs (users avec role FARMER)
    const farmersCount = await userRepo.count({
      where: { role: UserRole.FARMER },
    });

    // Compter les plantations
    const plantationsCount = await plantationRepo.count();

    // Mettre à jour les statuts des capteurs pour toutes les plantations
    const allPlantations = await plantationRepo.find();
    for (const plantation of allPlantations) {
      await updateSensorStatuses(plantation.id);
    }

    // Compter les capteurs actifs et totaux
    const sensorRepo = getSensorRepo();
    const { SensorStatus } = getSensorModule();
    
    const totalSensors = await sensorRepo.count();
    const activeSensors = await sensorRepo.count({
      where: { status: SensorStatus.ACTIVE },
    });

    // Compter les actionneurs
    const actuatorsCount = await actuatorRepo.count();

    return res.json({
      farmers: farmersCount,
      plantations: plantationsCount,
      activeSensors,
      totalSensors,
      actuators: actuatorsCount,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Récupère la liste des agriculteurs avec recherche optionnelle
 * 
 * Supporte deux formats de recherche :
 * 
 * Format 1 (principal) : Chaîne simple avec espaces préservés
 * - ?search=Jean Dupont (recherche sur le terme complet "Jean Dupont")
 * - Les espaces font partie du terme de recherche
 * - Recherche caractère par caractère (le frontend envoie chaque caractère tapé)
 * 
 * Format 2 (rétrocompatible) : Tableau de mots
 * - ?search[]=Jean&search[]=Dupont (recherche OR sur "Jean" OU "Dupont")
 * - Chaque mot est recherché indépendamment
 * 
 * La recherche s'effectue dans :
 * - firstName (prénom)
 * - lastName (nom)
 * - location (localisation des plantations)
 * 
 * Logique Format 1 : Recherche du terme complet dans au moins un champ
 * Logique Format 2 : Un agriculteur correspond si au moins un mot correspond dans au moins un champ
 */
export const getFarmers = async (req: Request, res: Response) => {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ee9b6254-5e07-42c4-a8f7-60be2efdef1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'technician.controller.ts:178',message:'getFarmers entry',data:{userId:req.user?.id,userRole:req.user?.role,queryParams:req.query,allQueryKeys:Object.keys(req.query),url:req.url,originalUrl:req.originalUrl,path:req.path,queryString:req.url.split('?')[1]||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Normaliser les paramètres de recherche
    // Priorité : Format 1 (chaîne simple) > Format 2 (tableau)
    let searchWords: string[] = [];
    let searchMode: 'complete' | 'or' = 'complete'; // 'complete' pour Format 1, 'or' pour Format 2
    
    // Détecter le format de recherche
    const searchStringParam = typeof req.query.search === 'string' ? req.query.search : null;
    const searchArrayParam = req.query['search[]'] || (Array.isArray(req.query.search) && !searchStringParam ? req.query.search : null);
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ee9b6254-5e07-42c4-a8f7-60be2efdef1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'technician.controller.ts:190',message:'All search param variations',data:{searchArrayParam,searchStringParam,reqQuerySearch:req.query.search,reqQuerySearchArray:req.query['search[]'],allQueryKeys:Object.keys(req.query),fullQueryObject:JSON.stringify(req.query)},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Format 1 (principal) : Chaîne simple avec espaces préservés
    if (searchStringParam && searchStringParam.trim().length > 0) {
      // Recherche sur le terme complet (espaces préservés)
      // Exemple: "Jean Dupont" recherche "Jean Dupont" comme terme complet
      searchWords = [searchStringParam.trim()];
      searchMode = 'complete';
    }
    // Format 2 (rétrocompatible) : Tableau de mots (recherche OR)
    else if (searchArrayParam && Array.isArray(searchArrayParam)) {
      // Format: search[]=mot1&search[]=mot2
      // Recherche OR : trouve si au moins un mot correspond
      searchWords = searchArrayParam
        .filter((word): word is string => typeof word === 'string')
        .map(word => word.trim())
        .filter(word => word.length > 0);
      searchMode = 'or';
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ee9b6254-5e07-42c4-a8f7-60be2efdef1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'technician.controller.ts:195',message:'Normalized search words',data:{searchWords,count:searchWords.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Construire la requête de base
    const queryBuilder = userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.plantations', 'plantation')
      .where('user.role = :role', { role: UserRole.FARMER });

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ee9b6254-5e07-42c4-a8f7-60be2efdef1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'technician.controller.ts:198',message:'Query builder created',data:{hasSearch:searchWords.length>0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Si des mots de recherche sont fournis
    if (searchWords.length > 0) {
      if (searchMode === 'complete') {
        // Format 1 : Recherche du terme complet (avec espaces préservés)
        // Un seul terme à rechercher dans tous les champs
        const searchTerm = searchWords[0];
        queryBuilder.andWhere(`(
          user.firstName ILIKE :searchTerm OR
          user.lastName ILIKE :searchTerm OR
          plantation.location ILIKE :searchTerm
        )`);
        queryBuilder.setParameter('searchTerm', `%${searchTerm}%`);
      } else {
        // Format 2 : Recherche OR sur chaque mot
        // Un agriculteur correspond si au moins un mot correspond dans au moins un champ
        const wordConditions = searchWords.map((_word, index) => {
          const paramName = `searchWord${index}`;
          return `(
            user.firstName ILIKE :${paramName} OR
            user.lastName ILIKE :${paramName} OR
            plantation.location ILIKE :${paramName}
          )`;
        });

        // Combiner toutes les conditions avec OR
        queryBuilder.andWhere(`(${wordConditions.join(' OR ')})`);
        
        // Ajouter les paramètres pour chaque mot
        searchWords.forEach((word, index) => {
          queryBuilder.setParameter(`searchWord${index}`, `%${word}%`);
        });
      }
      
      // #region agent log
      const sql = queryBuilder.getSql();
      const params = queryBuilder.getParameters();
      fetch('http://127.0.0.1:7243/ingest/ee9b6254-5e07-42c4-a8f7-60be2efdef1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'technician.controller.ts:240',message:'SQL query with search',data:{sql,params,searchMode,searchWords},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    } else {
      // #region agent log
      const sql = queryBuilder.getSql();
      fetch('http://127.0.0.1:7243/ingest/ee9b6254-5e07-42c4-a8f7-60be2efdef1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'technician.controller.ts:223',message:'SQL query without search',data:{sql},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    }

    // Exécuter la requête
    const farmers = await queryBuilder
      .select([
        'user.id',
        'user.firstName',
        'user.lastName',
        'plantation.id',
        'plantation.location',
      ])
      .getMany();
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ee9b6254-5e07-42c4-a8f7-60be2efdef1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'technician.controller.ts:234',message:'Query executed - raw results',data:{farmersCount:farmers.length,farmers:farmers.map(f=>({id:f.id,firstName:f.firstName,lastName:f.lastName,plantationsCount:f.plantations?.length||0}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    // Formater la réponse avec le nombre de plantations et la location
    // Utiliser un Map pour éviter les doublons (un agriculteur peut avoir plusieurs plantations)
    const farmersMap = new Map<string, any>();
    
    farmers.forEach((farmer) => {
      if (!farmersMap.has(farmer.id)) {
        const plantations = farmer.plantations || [];
        const location = plantations.length > 0 && plantations[0].location 
          ? plantations[0].location 
          : null;

        farmersMap.set(farmer.id, {
          id: farmer.id,
          firstName: farmer.firstName,
          lastName: farmer.lastName,
          location: location,
          plantationsCount: plantations.length,
        });
      } else {
        // Si l'agriculteur existe déjà, mettre à jour le count de plantations
        const existing = farmersMap.get(farmer.id);
        const plantations = farmer.plantations || [];
        existing.plantationsCount = Math.max(existing.plantationsCount, plantations.length);
        if (!existing.location && plantations.length > 0 && plantations[0].location) {
          existing.location = plantations[0].location;
        }
      }
    });
    
    const farmersWithStats = Array.from(farmersMap.values());
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ee9b6254-5e07-42c4-a8f7-60be2efdef1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'technician.controller.ts:255',message:'Formatted response',data:{farmersCount:farmersWithStats.length,farmers:farmersWithStats},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    return res.json(farmersWithStats);
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ee9b6254-5e07-42c4-a8f7-60be2efdef1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'technician.controller.ts:260',message:'Error caught',data:{errorMessage:error?.message,errorStack:error?.stack,errorName:error?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    console.error('Erreur lors de la récupération des agriculteurs:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Récupère les plantations d'un agriculteur spécifique
 */
export const getFarmerPlantations = async (req: Request, res: Response) => {
  try {
    const { farmerId } = req.params;

    // Vérifier que l'utilisateur existe et est un FARMER
    const farmer = await userRepo.findOne({
      where: { id: farmerId, role: UserRole.FARMER },
    });

    if (!farmer) {
      return res.status(404).json({ message: 'Agriculteur non trouvé' });
    }

    // Récupérer toutes les plantations de l'agriculteur
    const plantations = await plantationRepo.find({
      where: { ownerId: farmerId },
      relations: ['owner'],
      order: { createdAt: 'DESC' },
    });

    // Mettre à jour les statuts des capteurs pour chaque plantation
    for (const plantation of plantations) {
      await updateSensorStatuses(plantation.id);
    }

    // Formater la réponse
    return res.json(plantations.map(formatPlantationResponse));
  } catch (error: any) {
    console.error('Erreur lors de la récupération des plantations:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

