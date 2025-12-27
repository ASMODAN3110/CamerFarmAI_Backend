# Documentation Frontend - Notifications de Changement de Statut des Capteurs

## Vue d'ensemble

Le système envoie automatiquement des notifications au propriétaire d'une plantation lorsque ses capteurs changent de statut (ACTIVE ↔ INACTIVE). Ces notifications sont créées automatiquement par le backend et sont disponibles via plusieurs canaux (WEB, WHATSAPP, EMAIL).

**Important** : Les notifications sont créées automatiquement côté backend. Le frontend n'a qu'à les récupérer et les afficher.

---

## Types d'événements

### Nouveaux types d'événements pour les capteurs

```typescript
enum EventType {
  SEUIL_DEPASSE = 'seuil_depasse',
  ACTIONNEUR_ACTIVE = 'actionneur_active',
  ACTIONNEUR_DESACTIVE = 'actionneur_desactive',
  MODE_CHANGED = 'mode_changed',
  SENSOR_ACTIVE = 'sensor_active',        // ← Nouveau
  SENSOR_INACTIVE = 'sensor_inactive',    // ← Nouveau
}
```

### Quand les notifications sont créées

1. **SENSOR_INACTIVE** : Lorsqu'un capteur devient inactif
   - Un capteur devient `INACTIVE` s'il n'a pas reçu de lecture depuis plus d'1 heure
   - La notification est créée automatiquement lors de la vérification des statuts

2. **SENSOR_ACTIVE** : Lorsqu'un capteur redevient actif
   - Un capteur redevient `ACTIVE` lorsqu'une nouvelle lecture est reçue
   - La notification est créée automatiquement lors de l'ajout d'une lecture

---

## Endpoints pour récupérer les notifications

### 1. `GET /api/v1/notifications/my`

**Récupère toutes les notifications de l'utilisateur connecté**

**Query Parameters (optionnels) :**
- `unreadOnly=true` : Ne retourner que les notifications non lues

**Exemple de requête :**
```typescript
// Toutes les notifications
GET /api/v1/notifications/my

// Seulement les non lues
GET /api/v1/notifications/my?unreadOnly=true
```

**Exemple de réponse :**
```json
[
  {
    "id": "uuid-notification-1",
    "canal": "web",
    "statut": "envoyee",
    "eventId": "uuid-event-1",
    "userId": "uuid-user",
    "dateEnvoi": "2024-01-15T10:30:00.000Z",
    "isRead": false,
    "dateLu": null,
    "event": {
      "id": "uuid-event-1",
      "type": "sensor_inactive",
      "description": "Le capteur temperature du champ \"Champ Nord\" est devenu inactif (aucune lecture depuis plus d'1 heure)",
      "sensorId": "uuid-sensor-1",
      "date": "2024-01-15T10:30:00.000Z",
      "sensor": {
        "id": "uuid-sensor-1",
        "type": "temperature",
        "status": "inactive",
        "plantationId": "uuid-plantation"
      }
    }
  },
  {
    "id": "uuid-notification-2",
    "canal": "web",
    "statut": "envoyee",
    "eventId": "uuid-event-2",
    "userId": "uuid-user",
    "dateEnvoi": "2024-01-15T11:00:00.000Z",
    "isRead": false,
    "dateLu": null,
    "event": {
      "id": "uuid-event-2",
      "type": "sensor_active",
      "description": "Le capteur temperature du champ \"Champ Nord\" est maintenant actif",
      "sensorId": "uuid-sensor-1",
      "date": "2024-01-15T11:00:00.000Z",
      "sensor": {
        "id": "uuid-sensor-1",
        "type": "temperature",
        "status": "active",
        "plantationId": "uuid-plantation"
      }
    }
  }
]
```

---

### 2. `GET /api/v1/notifications/:notificationId`

**Récupère une notification spécifique**

**Exemple de réponse :**
```json
{
  "id": "uuid-notification-1",
  "canal": "web",
  "statut": "envoyee",
  "eventId": "uuid-event-1",
  "userId": "uuid-user",
  "dateEnvoi": "2024-01-15T10:30:00.000Z",
  "isRead": false,
  "dateLu": null,
  "event": {
    "id": "uuid-event-1",
    "type": "sensor_inactive",
    "description": "Le capteur temperature du champ \"Champ Nord\" est devenu inactif (aucune lecture depuis plus d'1 heure)",
    "sensorId": "uuid-sensor-1",
    "date": "2024-01-15T10:30:00.000Z",
    "sensor": {
      "id": "uuid-sensor-1",
      "type": "temperature",
      "status": "inactive",
      "plantationId": "uuid-plantation"
    }
  }
}
```

---

### 3. `GET /api/v1/notifications/stats`

**Récupère les statistiques des notifications**

**Exemple de réponse :**
```json
{
  "total": 25,
  "unread": 5,
  "read": 20,
  "byCanal": {
    "web": 25,
    "whatsapp": 20,
    "email": 15
  }
}
```

---

### 4. `PATCH /api/v1/notifications/:notificationId/read`

**Marque une notification comme lue**

**Exemple de réponse :**
```json
{
  "id": "uuid-notification-1",
  "isRead": true,
  "dateLu": "2024-01-15T10:35:00.000Z"
}
```

---

### 5. `DELETE /api/v1/notifications/:id`

**Supprime une notification**

**Réponse :** `204 No Content`

---

## Structures de données

### Notification

```typescript
interface Notification {
  id: string;                    // UUID
  canal: NotificationCanal;      // 'web' | 'whatsapp' | 'email'
  statut: NotificationStatut;     // 'envoyee' | 'en_attente' | 'erreur'
  eventId: string;               // UUID de l'événement associé
  userId: string;                // UUID de l'utilisateur
  dateEnvoi: string;             // ISO 8601 date
  isRead: boolean;                // Si la notification a été lue
  dateLu?: string;               // ISO 8601 date (optionnel)
  event?: Event;                 // Événement associé (si inclus dans la réponse)
}
```

### Event

```typescript
interface Event {
  id: string;                    // UUID
  type: EventType;              // Type d'événement
  description: string;           // Description de l'événement
  sensorId?: string;             // UUID du capteur (si applicable)
  actuatorId?: string;           // UUID de l'actionneur (si applicable)
  date: string;                  // ISO 8601 date
  sensor?: Sensor;               // Capteur associé (si inclus dans la réponse)
  actuator?: Actuator;            // Actionneur associé (si inclus dans la réponse)
}
```

### Enums

```typescript
enum NotificationCanal {
  WEB = 'web',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp'
}

enum NotificationStatut {
  ENVOYEE = 'envoyee',
  EN_ATTENTE = 'en_attente',
  ERREUR = 'erreur'
}

enum EventType {
  SEUIL_DEPASSE = 'seuil_depasse',
  ACTIONNEUR_ACTIVE = 'actionneur_active',
  ACTIONNEUR_DESACTIVE = 'actionneur_desactive',
  MODE_CHANGED = 'mode_changed',
  SENSOR_ACTIVE = 'sensor_active',
  SENSOR_INACTIVE = 'sensor_inactive'
}
```

---

## Logique métier

### Création automatique des notifications

Les notifications sont créées automatiquement dans les cas suivants :

1. **Changement automatique de statut** :
   - Lors de l'appel à `GET /api/plantations/:id` ou `GET /api/plantations/:id/sensors`
   - Si un capteur devient `INACTIVE` (pas de lecture depuis 1h) → Notification `SENSOR_INACTIVE`
   - Si un capteur redevient `ACTIVE` (lecture récente détectée) → Notification `SENSOR_ACTIVE`

2. **Ajout d'une lecture** :
   - Lors de l'appel à `POST /api/plantations/:id/sensors/:sensorId/readings`
   - Si le capteur était `INACTIVE` et devient `ACTIVE` → Notification `SENSOR_ACTIVE`

3. **Modification manuelle** :
   - Lors de l'appel à `PATCH /api/plantations/:id/sensors/:sensorId`
   - Si le statut change → Notification correspondante

### Canaux de notification

Pour chaque événement, plusieurs notifications peuvent être créées :
- **WEB** : Toujours créée (pour l'affichage dans l'interface)
- **WHATSAPP** : Créée si l'utilisateur a un numéro de téléphone
- **EMAIL** : Créée si l'utilisateur a un email (si configuré)

### Utilisateurs notifiés

- Seul le **propriétaire de la plantation** reçoit les notifications
- Les techniciens et administrateurs ne reçoivent pas ces notifications (ils peuvent consulter les événements via leurs endpoints dédiés)

---

## Recommandations pour le frontend

### 1. Affichage des notifications

```typescript
// Exemple de fonction pour formater les notifications de capteurs
function formatSensorNotification(notification: Notification): string {
  const event = notification.event;
  if (!event || !event.sensor) return event?.description || 'Notification';

  const sensorType = getSensorTypeLabel(event.sensor.type);
  const eventType = event.type;

  if (eventType === 'sensor_active') {
    return `✅ Capteur ${sensorType} actif`;
  } else if (eventType === 'sensor_inactive') {
    return `⚠️ Capteur ${sensorType} inactif`;
  }

  return event.description;
}

function getSensorTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    temperature: 'Température',
    soilMoisture: 'Humidité du sol',
    co2Level: 'CO2',
    waterLevel: 'Niveau d\'eau',
    luminosity: 'Luminosité'
  };
  return labels[type] || type;
}
```

### 2. Badge de notification

```typescript
// Exemple de composant de badge
function NotificationBadge({ count }: { count: number }) {
  if (count === 0) return null;
  
  return (
    <span className="notification-badge">
      {count > 99 ? '99+' : count}
    </span>
  );
}
```

### 3. Liste des notifications

```typescript
// Exemple de composant de liste
function NotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Charger les notifications non lues
    fetch('/api/v1/notifications/my?unreadOnly=true')
      .then(res => res.json())
      .then(data => {
        setNotifications(data);
        setUnreadCount(data.length);
      });

    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(() => {
      fetch('/api/v1/notifications/my?unreadOnly=true')
        .then(res => res.json())
        .then(data => {
          setNotifications(data);
          setUnreadCount(data.length);
        });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (notificationId: string) => {
    await fetch(`/api/v1/notifications/${notificationId}/read`, {
      method: 'PATCH'
    });
    
    // Rafraîchir la liste
    const updated = notifications.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    setNotifications(updated);
    setUnreadCount(updated.filter(n => !n.isRead).length);
  };

  return (
    <div className="notification-list">
      <h3>Notifications ({unreadCount} non lues)</h3>
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
          onClick={() => markAsRead(notification.id)}
        >
          <p>{formatSensorNotification(notification)}</p>
          <small>{formatDate(notification.dateEnvoi)}</small>
        </div>
      ))}
    </div>
  );
}
```

### 4. Filtrage par type d'événement

```typescript
// Filtrer les notifications de changement de statut de capteur
const sensorStatusNotifications = notifications.filter(
  notification => 
    notification.event?.type === 'sensor_active' || 
    notification.event?.type === 'sensor_inactive'
);

// Filtrer les notifications non lues
const unreadSensorNotifications = sensorStatusNotifications.filter(
  notification => !notification.isRead
);
```

### 5. Affichage avec icônes et couleurs

```typescript
// Fonction pour obtenir l'icône et la couleur selon le type
function getNotificationStyle(eventType: string) {
  switch (eventType) {
    case 'sensor_active':
      return {
        icon: '✓',
        color: '#10b981', // Vert
        bgColor: '#d1fae5'
      };
    case 'sensor_inactive':
      return {
        icon: '⚠',
        color: '#ef4444', // Rouge
        bgColor: '#fee2e2'
      };
    default:
      return {
        icon: 'ℹ',
        color: '#6b7280', // Gris
        bgColor: '#f3f4f6'
      };
  }
}
```

### 6. Notification toast/popup

```typescript
// Exemple de notification toast pour les nouveaux événements
function useSensorNotifications() {
  const [newNotifications, setNewNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    let lastCheck = new Date();

    const checkNewNotifications = async () => {
      const response = await fetch('/api/v1/notifications/my');
      const notifications = await response.json();
      
      // Filtrer les nouvelles notifications (après le dernier check)
      const newOnes = notifications.filter(
        (n: Notification) => new Date(n.dateEnvoi) > lastCheck
      );

      if (newOnes.length > 0) {
        // Filtrer seulement les notifications de changement de statut
        const sensorStatusOnes = newOnes.filter(
          (n: Notification) => 
            n.event?.type === 'sensor_active' || 
            n.event?.type === 'sensor_inactive'
        );

        if (sensorStatusOnes.length > 0) {
          setNewNotifications(sensorStatusOnes);
          // Afficher des toasts pour chaque nouvelle notification
          sensorStatusOnes.forEach(notification => {
            showToast(formatSensorNotification(notification));
          });
        }
      }

      lastCheck = new Date();
    };

    // Vérifier toutes les 10 secondes
    const interval = setInterval(checkNewNotifications, 10000);

    return () => clearInterval(interval);
  }, []);

  return newNotifications;
}
```

---

## Exemples d'utilisation

### Exemple 1 : Afficher les notifications non lues dans un menu

```typescript
function NotificationMenu() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch('/api/v1/notifications/my?unreadOnly=true')
      .then(res => res.json())
      .then(data => setNotifications(data));
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const sensorNotifications = notifications.filter(
    n => n.event?.type === 'sensor_active' || n.event?.type === 'sensor_inactive'
  );

  return (
    <div className="notification-menu">
      <button onClick={() => setIsOpen(!isOpen)}>
        🔔 Notifications
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>
      
      {isOpen && (
        <div className="notification-dropdown">
          <h4>Notifications de capteurs ({sensorNotifications.length})</h4>
          {sensorNotifications.map(notification => (
            <div key={notification.id} className="notification-item">
              <p>{formatSensorNotification(notification)}</p>
              <button onClick={() => markAsRead(notification.id)}>
                Marquer comme lu
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Exemple 2 : Afficher une alerte pour les capteurs inactifs

```typescript
function SensorStatusAlert({ plantationId }: { plantationId: string }) {
  const [inactiveNotifications, setInactiveNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    fetch('/api/v1/notifications/my?unreadOnly=true')
      .then(res => res.json())
      .then(data => {
        // Filtrer les notifications de capteurs inactifs pour cette plantation
        const inactive = data.filter(
          (n: Notification) => 
            n.event?.type === 'sensor_inactive' &&
            n.event?.sensor?.plantationId === plantationId &&
            !n.isRead
        );
        setInactiveNotifications(inactive);
      });
  }, [plantationId]);

  if (inactiveNotifications.length === 0) return null;

  return (
    <div className="alert alert-warning">
      <h4>⚠️ {inactiveNotifications.length} capteur(s) inactif(s)</h4>
      <ul>
        {inactiveNotifications.map(notification => (
          <li key={notification.id}>
            {notification.event?.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Exemple 3 : Marquer toutes les notifications comme lues

```typescript
async function markAllAsRead() {
  const response = await fetch('/api/v1/notifications/my?unreadOnly=true');
  const notifications = await response.json();
  
  // Marquer toutes comme lues
  await Promise.all(
    notifications.map((n: Notification) =>
      fetch(`/api/v1/notifications/${n.id}/read`, { method: 'PATCH' })
    )
  );
  
  // Rafraîchir la liste
  refreshNotifications();
}
```

---

## Cas d'usage

### Cas 1 : Capteur devient inactif

1. Un capteur n'envoie plus de données depuis 1h
2. L'utilisateur consulte sa plantation via `GET /api/plantations/:id`
3. Le backend détecte l'inactivité et met à jour le statut
4. Un événement `SENSOR_INACTIVE` est créé
5. Des notifications sont créées pour tous les canaux (WEB, WHATSAPP, EMAIL)
6. Le frontend peut récupérer ces notifications via `GET /api/v1/notifications/my`
7. L'utilisateur voit une notification dans son interface

### Cas 2 : Capteur redevient actif

1. Un capteur inactif envoie une nouvelle lecture via `POST /readings`
2. Le backend active automatiquement le capteur
3. Un événement `SENSOR_ACTIVE` est créé
4. Des notifications sont créées pour tous les canaux
5. Le frontend peut récupérer et afficher la notification

### Cas 3 : Consultation régulière des notifications

1. Le frontend appelle `GET /api/v1/notifications/my?unreadOnly=true` toutes les 30 secondes
2. Les nouvelles notifications sont affichées dans un menu ou une liste
3. L'utilisateur peut marquer les notifications comme lues
4. Le badge de notification se met à jour automatiquement

---

## Notes importantes

1. **Création automatique** : Les notifications sont créées automatiquement par le backend. Le frontend n'a qu'à les récupérer.

2. **Pas de doublons** : Les notifications ne sont créées que si le statut change réellement. Si un capteur est déjà `INACTIVE` et reste `INACTIVE`, aucune nouvelle notification n'est créée.

3. **Canaux multiples** : Pour chaque événement, plusieurs notifications peuvent être créées (une par canal). Le frontend doit filtrer par canal si nécessaire (généralement, on affiche seulement les notifications WEB).

4. **Performance** : Les notifications sont limitées à 50 dernières par défaut dans l'endpoint `/my`. Pour plus de notifications, implémenter la pagination côté frontend.

5. **Temps réel** : Pour un affichage en temps réel, le frontend peut :
   - Polling : Vérifier les nouvelles notifications toutes les 10-30 secondes
   - WebSockets : Si implémenté côté backend
   - Rafraîchissement après actions : Rafraîchir après chaque action utilisateur

6. **Filtrage** : Le frontend peut filtrer les notifications par type d'événement pour n'afficher que celles qui l'intéressent.

7. **Statistiques** : Utiliser l'endpoint `/stats` pour afficher le nombre total de notifications non lues.

---

## Résumé

### Fonctionnalités disponibles

- ✅ Notifications automatiques lors des changements de statut
- ✅ Récupération via `GET /api/v1/notifications/my`
- ✅ Filtrage des non lues avec `?unreadOnly=true`
- ✅ Marquage comme lu avec `PATCH /api/v1/notifications/:id/read`
- ✅ Statistiques avec `GET /api/v1/notifications/stats`
- ✅ Suppression avec `DELETE /api/v1/notifications/:id`

### Types d'événements de capteurs

- `sensor_active` : Capteur redevient actif
- `sensor_inactive` : Capteur devient inactif

### Canaux de notification

- WEB : Toujours disponible
- WHATSAPP : Si l'utilisateur a un téléphone
- EMAIL : Si l'utilisateur a un email (si configuré)

---

## Support

Pour toute question ou problème, référez-vous à cette documentation ou contactez l'équipe backend.

