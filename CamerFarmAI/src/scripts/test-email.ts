import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { AppDataSource } from '../config/database';
import { EmailNotificationService } from '../services/notification/EmailNotificationService';
import { EventService } from '../services/event/EventService';
import { EventType } from '../models/Event.entity';
import { User } from '../models/User.entity';
import { Notification, NotificationCanal } from '../models/Notification.entity';

// Charger les variables d'environnement
dotenv.config();

async function testEmail() {
  console.log('🧪 Test de configuration Email (SMTP)\n');

  // Vérifier les variables d'environnement
  console.log('📋 Vérification des variables d\'environnement...');
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM;

  if (!smtpHost) {
    console.error('❌ ERREUR: SMTP_HOST n\'est pas défini dans .env');
    console.log('\n💡 Solution: Ajoutez SMTP_HOST=smtp.gmail.com dans votre fichier .env');
    process.exit(1);
  }

  if (!smtpPort) {
    console.error('❌ ERREUR: SMTP_PORT n\'est pas défini dans .env');
    console.log('\n💡 Solution: Ajoutez SMTP_PORT=587 dans votre fichier .env');
    process.exit(1);
  }

  if (!smtpUser) {
    console.error('❌ ERREUR: SMTP_USER n\'est pas défini dans .env');
    console.log('\n💡 Solution: Ajoutez SMTP_USER=votre_email@gmail.com dans votre fichier .env');
    process.exit(1);
  }

  if (!smtpPass) {
    console.error('❌ ERREUR: SMTP_PASS n\'est pas défini dans .env');
    console.log('\n💡 Solution: Ajoutez SMTP_PASS=votre_mot_de_passe_application dans votre fichier .env');
    process.exit(1);
  }

  console.log('✅ Variables d\'environnement trouvées');
  console.log(`   SMTP Host: ${smtpHost}`);
  console.log(`   SMTP Port: ${smtpPort}`);
  console.log(`   SMTP User: ${smtpUser}`);
  console.log(`   SMTP From: ${smtpFrom || smtpUser}\n`);

  // Initialiser la connexion à la base de données
  console.log('🔌 Connexion à la base de données...');
  try {
    await AppDataSource.initialize();
    console.log('✅ Connexion à la base de données réussie\n');
  } catch (error: any) {
    console.error('❌ ERREUR: Impossible de se connecter à la base de données');
    console.error(`   ${error.message}`);
    process.exit(1);
  }

  // Vérifier si le service Email est configuré
  console.log('📧 Vérification du service Email...');
  const emailService = new EmailNotificationService();
  
  if (!emailService.isConfigured()) {
    console.error('❌ ERREUR: Le service Email n\'est pas correctement configuré');
    console.log('\n💡 Vérifiez que:');
    console.log('   - SMTP_HOST est correct');
    console.log('   - SMTP_PORT est correct');
    console.log('   - SMTP_USER est correct');
    console.log('   - SMTP_PASS est correct (mot de passe d\'application pour Gmail)');
    await AppDataSource.destroy();
    process.exit(1);
  }

  console.log('✅ Service Email configuré\n');

  // Trouver un utilisateur avec un email
  console.log('👤 Recherche d\'un utilisateur avec une adresse email...');
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({
    where: {},
    order: { createdAt: 'DESC' },
  });

  if (!user) {
    console.error('❌ ERREUR: Aucun utilisateur trouvé dans la base de données');
    console.log('\n💡 Solution: Créez d\'abord un utilisateur via l\'API ou une migration');
    await AppDataSource.destroy();
    process.exit(1);
  }

  if (!user.email) {
    console.error(`❌ ERREUR: L'utilisateur ${user.id} n'a pas d'adresse email`);
    console.log('\n💡 Solution: Ajoutez une adresse email à l\'utilisateur');
    await AppDataSource.destroy();
    process.exit(1);
  }

  console.log(`✅ Utilisateur trouvé: ${user.firstName || ''} ${user.lastName || ''} (${user.email})\n`);

  // Créer un événement de test
  console.log('📝 Création d\'un événement de test...');
  let testEvent;
  try {
    testEvent = await EventService.createEvent(
      EventType.MODE_CHANGED,
      'Test de notification Email - Ceci est un message de test pour vérifier la configuration SMTP. Si vous recevez cet email, la configuration est correcte !'
    );
    console.log(`✅ Événement créé: ${testEvent.id}\n`);
  } catch (error: any) {
    console.error('❌ ERREUR: Impossible de créer l\'événement de test');
    console.error(`   ${error.message}`);
    await AppDataSource.destroy();
    process.exit(1);
  }

  // Créer une notification Email
  console.log('📨 Création d\'une notification Email...');
  const notificationRepository = AppDataSource.getRepository(Notification);
  let notification;
  try {
    notification = notificationRepository.create({
      canal: NotificationCanal.EMAIL,
      eventId: testEvent.id,
      userId: user.id,
    });
    notification = await notificationRepository.save(notification);
    console.log(`✅ Notification créée: ${notification.id}\n`);
  } catch (error: any) {
    console.error('❌ ERREUR: Impossible de créer la notification');
    console.error(`   ${error.message}`);
    await AppDataSource.destroy();
    process.exit(1);
  }

  // Envoyer l'email
  console.log('📤 Envoi de l\'email...');
  console.log(`   Destinataire: ${user.email}`);
  console.log(`   Événement: ${testEvent.type}\n`);

  try {
    await emailService.envoyerNotification(notification);
    console.log('\n✅ EMAIL CONFIGURÉ ET TESTÉ AVEC SUCCÈS !');
    console.log(`📧 Vérifiez la boîte de réception de: ${user.email}`);
    console.log('   (Vérifiez aussi les spams/courrier indésirable si nécessaire)');
  } catch (error: any) {
    console.error('\n❌ ERREUR lors de l\'envoi de l\'email');
    console.error(`   ${error.message}`);
    
    // Vérifier le statut de la notification
    const updatedNotification = await notificationRepository.findOne({
      where: { id: notification.id },
    });
    
    if (updatedNotification) {
      console.log(`\n📊 Statut de la notification: ${updatedNotification.statut}`);
    }

    console.log('\n💡 Vérifiez:');
    console.log('   - Que SMTP_HOST, SMTP_PORT, SMTP_USER et SMTP_PASS sont corrects');
    console.log('   - Que vous utilisez un mot de passe d\'application (pour Gmail)');
    console.log('   - Que l\'authentification à deux facteurs est activée (pour Gmail)');
    console.log('   - Les logs ci-dessus pour plus de détails');
    
    await AppDataSource.destroy();
    process.exit(1);
  }

  // Nettoyer
  await AppDataSource.destroy();
  console.log('\n✅ Test terminé avec succès !');
  process.exit(0);
}

// Exécuter le test
testEmail().catch((error) => {
  console.error('\n❌ ERREUR FATALE:', error);
  process.exit(1);
});

