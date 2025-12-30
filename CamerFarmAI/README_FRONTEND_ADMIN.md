# Documentation Frontend - Fonctionnalités Administrateur

Ce document décrit toutes les fonctionnalités disponibles pour l'administrateur et ce dont le frontend a besoin pour les implémenter.

> **Note** : Ce document est spécifiquement destiné à l'équipe frontend. Pour la documentation complète de l'API backend, consultez le [README.md](./README.md) principal.

## Table des matières

1. [Prérequis](#prérequis)
2. [Authentification](#authentification)
3. [Endpoints disponibles](#endpoints-disponibles)
4. [Types TypeScript](#types-typescript)
5. [Exemples d'implémentation](#exemples-dimplémentation)
6. [Gestion des erreurs](#gestion-des-erreurs)
7. [Notes importantes](#notes-importantes)

---

## Prérequis

### Rôle requis
- Seuls les utilisateurs avec le rôle `ADMIN` peuvent accéder à ces endpoints
- Le token JWT doit être inclus dans toutes les requêtes : `Authorization: Bearer <token>`

### Base URL
```
/api/v1/admin
```

---

## Authentification

Toutes les routes admin nécessitent :
1. Un token JWT valide dans le header `Authorization`
2. Le rôle `ADMIN` pour l'utilisateur connecté

**Exemple de header :**
```typescript
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}
```

---

## Endpoints disponibles

### 1. Lister tous les utilisateurs

**Endpoint :** `GET /api/v1/admin/users`

**Description :** Récupère la liste de tous les utilisateurs (agriculteurs et techniciens). Les comptes ADMIN ne sont pas inclus dans cette liste.

**Requête :** Aucun paramètre

**Réponse réussie (200) :**
```typescript
{
  success: true,
  data: [
    {
      id: string;                    // UUID
      phone: string;                 // "+237612345678"
      email: string | null;          // "user@example.com" ou null
      firstName: string;             // "Jean"
      lastName: string;              // "Dupont"
      role: 'farmer' | 'technician'; // Rôle de l'utilisateur
      twoFactorEnabled: boolean;     // true si 2FA activé
      isActive: boolean;              // true si compte actif
      createdAt: string;             // ISO 8601 date
      plantationsCount: number;       // Nombre de plantations
    }
  ]
}
```

**Exemple de réponse :**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "phone": "+237612345678",
      "email": "jean.dupont@example.com",
      "firstName": "Jean",
      "lastName": "Dupont",
      "role": "farmer",
      "twoFactorEnabled": false,
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "plantationsCount": 3
    }
  ]
}
```

**Erreurs possibles :**
- `401` : Non authentifié ou token invalide
- `403` : Pas le rôle ADMIN
- `500` : Erreur serveur

---

### 2. Récupérer les détails d'un utilisateur

**Endpoint :** `GET /api/v1/admin/users/:id`

**Description :** Récupère les détails complets d'un utilisateur avec la liste de ses plantations.

**Paramètres :**
- `id` (UUID) : ID de l'utilisateur

**Réponse réussie (200) :**
```typescript
{
  success: true,
  data: {
    id: string;
    phone: string;
    email: string | null;
    firstName: string;
    lastName: string;
    role: 'farmer' | 'technician';
    twoFactorEnabled: boolean;
    isActive: boolean;
    createdAt: string;              // ISO 8601
    updatedAt: string;             // ISO 8601
    plantations: Array<{
      id: string;                  // UUID
      name: string;                // "Champ de manioc"
      location: string | null;     // "Douala" ou null
      cropType: string;            // "manioc"
    }>;
  }
}
```

**Exemple de réponse :**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "phone": "+237612345678",
    "email": "jean.dupont@example.com",
    "firstName": "Jean",
    "lastName": "Dupont",
    "role": "farmer",
    "twoFactorEnabled": false,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "plantations": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Champ de manioc",
        "location": "Douala",
        "cropType": "manioc"
      }
    ]
  }
}
```

**Erreurs possibles :**
- `400` : ID invalide (pas un UUID)
- `401` : Non authentifié
- `403` : Pas le rôle ADMIN
- `404` : Utilisateur non trouvé (ou c'est un ADMIN)
- `500` : Erreur serveur

---

### 3. Créer un compte technicien

**Endpoint :** `POST /api/v1/admin/users/technicians`

**Description :** Crée un nouveau compte technicien. Seuls les techniciens peuvent être créés via cet endpoint (pas les agriculteurs).

**Corps de la requête :**
```typescript
{
  phone: string;           // Requis, format mobile valide
  password: string;        // Requis, voir règles de validation ci-dessous
  firstName?: string;      // Optionnel
  lastName?: string;       // Optionnel
  email?: string;          // Optionnel, format email valide
}
```

**Règles de validation du mot de passe :**
- Minimum 8 caractères
- Au moins une lettre majuscule
- Au moins une lettre minuscule
- Au moins un chiffre
- Au moins un caractère spécial : `!@#$%^&*(),.?":{}|<>`

**Exemple de requête :**
```json
{
  "phone": "+237612345678",
  "password": "Technicien123!",
  "firstName": "Marie",
  "lastName": "Martin",
  "email": "marie.martin@example.com"
}
```

**Réponse réussie (201) :**
```typescript
{
  success: true,
  message: "Compte technicien créé avec succès",
  data: {
    id: string;
    phone: string;
    email: string | null;
    firstName: string;
    lastName: string;
    role: 'technician';
  }
}
```

**Exemple de réponse :**
```json
{
  "success": true,
  "message": "Compte technicien créé avec succès",
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "phone": "+237612345678",
    "email": "marie.martin@example.com",
    "firstName": "Marie",
    "lastName": "Martin",
    "role": "technician"
  }
}
```

**Erreurs possibles :**
- `400` : Données invalides (validation échouée)
- `401` : Non authentifié
- `403` : Pas le rôle ADMIN
- `409` : Email ou téléphone déjà utilisé
- `500` : Erreur serveur

**Format d'erreur de validation :**
```json
{
  "success": false,
  "message": "Données invalides",
  "errors": [
    {
      "field": "password",
      "message": "Le mot de passe doit contenir au moins 8 caractères"
    }
  ]
}
```

---

### 4. Activer/Désactiver un compte utilisateur

**Endpoint :** `PATCH /api/v1/admin/users/:id/status`

**Description :** Active ou désactive un compte utilisateur. Un compte désactivé ne peut plus se connecter au système.

**Paramètres :**
- `id` (UUID) : ID de l'utilisateur

**Corps de la requête :**
```typescript
{
  isActive: boolean;  // true pour activer, false pour désactiver
}
```

**Exemple de requête :**
```json
{
  "isActive": false
}
```

**Réponse réussie (200) :**
```typescript
{
  success: true,
  message: "Statut du compte mis à jour avec succès",
  data: {
    id: string;
    isActive: boolean;
  }
}
```

**Exemple de réponse :**
```json
{
  "success": true,
  "message": "Statut du compte mis à jour avec succès",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "isActive": false
  }
}
```

**Erreurs possibles :**
- `400` : 
  - ID invalide (pas un UUID)
  - `isActive` n'est pas un booléen
  - Tentative de modifier le statut d'un compte ADMIN
- `401` : Non authentifié
- `403` : Pas le rôle ADMIN
- `404` : Utilisateur non trouvé
- `500` : Erreur serveur

**Comportement :**
- Un compte désactivé (`isActive: false`) ne peut plus se connecter
- Les tokens existants d'un compte désactivé sont invalidés au prochain appel API
- Il est impossible de modifier le statut d'un compte ADMIN

---

### 5. Supprimer un utilisateur

**Endpoint :** `DELETE /api/v1/admin/users/:id`

**Description :** Supprime un utilisateur et toutes ses plantations en cascade. Cette action est irréversible.

**Paramètres :**
- `id` (UUID) : ID de l'utilisateur

**Requête :** Aucun corps requis

**Réponse réussie (200) :**
```typescript
{
  success: true,
  message: "Utilisateur supprimé avec succès"
}
```

**Exemple de réponse :**
```json
{
  "success": true,
  "message": "Utilisateur supprimé avec succès"
}
```

**Erreurs possibles :**
- `400` : 
  - ID invalide (pas un UUID)
  - Tentative de supprimer un compte ADMIN
- `401` : Non authentifié
- `403` : Pas le rôle ADMIN
- `404` : Utilisateur non trouvé
- `500` : Erreur serveur

**Comportement :**
- La suppression est en cascade : toutes les plantations de l'utilisateur sont également supprimées
- Les capteurs, actionneurs, événements et notifications associés sont également supprimés
- Il est impossible de supprimer un compte ADMIN

---

## Types TypeScript

Voici les types TypeScript complets pour implémenter les fonctionnalités admin :

```typescript
// Enums
export enum UserRole {
  FARMER = 'farmer',
  TECHNICIAN = 'technician',
  ADMIN = 'admin',
}

// Types de réponse
export interface UserListItem {
  id: string;
  phone: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: 'farmer' | 'technician';
  twoFactorEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  plantationsCount: number;
}

export interface UserDetails {
  id: string;
  phone: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: 'farmer' | 'technician';
  twoFactorEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  plantations: Array<{
    id: string;
    name: string;
    location: string | null;
    cropType: string;
  }>;
}

// DTOs pour les requêtes
export interface CreateTechnicianDto {
  phone: string;
  password: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface UpdateUserStatusDto {
  isActive: boolean;
}

// Réponses API
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
}

export interface UsersListResponse extends ApiResponse<UserListItem[]> {}
export interface UserDetailsResponse extends ApiResponse<UserDetails> {}
export interface CreateTechnicianResponse extends ApiResponse<{
  id: string;
  phone: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: 'technician';
}> {}
export interface UpdateUserStatusResponse extends ApiResponse<{
  id: string;
  isActive: boolean;
}> {}
```

---

## Exemples d'implémentation

### Exemple 1 : Service TypeScript pour les fonctionnalités admin

```typescript
// services/adminService.ts
import { 
  UsersListResponse, 
  UserDetailsResponse, 
  CreateTechnicianDto, 
  CreateTechnicianResponse,
  UpdateUserStatusDto,
  UpdateUserStatusResponse,
  ApiResponse
} from '../types/admin';

const API_BASE_URL = '/api/v1/admin';

export class AdminService {
  private static getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Récupère la liste de tous les utilisateurs
   */
  static async getAllUsers(): Promise<UsersListResponse> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la récupération des utilisateurs');
    }

    return response.json();
  }

  /**
   * Récupère les détails d'un utilisateur
   */
  static async getUserById(userId: string): Promise<UserDetailsResponse> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la récupération de l\'utilisateur');
    }

    return response.json();
  }

  /**
   * Crée un compte technicien
   */
  static async createTechnician(dto: CreateTechnicianDto): Promise<CreateTechnicianResponse> {
    const response = await fetch(`${API_BASE_URL}/users/technicians`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la création du technicien');
    }

    return response.json();
  }

  /**
   * Active ou désactive un compte utilisateur
   */
  static async updateUserStatus(
    userId: string, 
    isActive: boolean
  ): Promise<UpdateUserStatusResponse> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/status`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ isActive }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la mise à jour du statut');
    }

    return response.json();
  }

  /**
   * Supprime un utilisateur
   */
  static async deleteUser(userId: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la suppression de l\'utilisateur');
    }

    return response.json();
  }
}
```

### Exemple 2 : Composant React pour lister les utilisateurs

```typescript
// components/AdminUsersList.tsx
import React, { useState, useEffect } from 'react';
import { AdminService } from '../services/adminService';
import { UserListItem } from '../types/admin';

export const AdminUsersList: React.FC = () => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await AdminService.getAllUsers();
      if (response.success && response.data) {
        setUsers(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await AdminService.updateUserStatus(userId, !currentStatus);
      // Recharger la liste
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour du statut');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) {
      return;
    }

    try {
      await AdminService.deleteUser(userId);
      // Recharger la liste
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    }
  };

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur : {error}</div>;

  return (
    <div>
      <h2>Gestion des utilisateurs</h2>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Email</th>
            <th>Téléphone</th>
            <th>Rôle</th>
            <th>Statut</th>
            <th>Plantations</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.firstName} {user.lastName}</td>
              <td>{user.email || '-'}</td>
              <td>{user.phone}</td>
              <td>{user.role}</td>
              <td>
                <span className={user.isActive ? 'active' : 'inactive'}>
                  {user.isActive ? 'Actif' : 'Désactivé'}
                </span>
              </td>
              <td>{user.plantationsCount}</td>
              <td>
                <button 
                  onClick={() => handleToggleStatus(user.id, user.isActive)}
                >
                  {user.isActive ? 'Désactiver' : 'Activer'}
                </button>
                <button 
                  onClick={() => handleDelete(user.id)}
                  disabled={user.role === 'admin'}
                >
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### Exemple 3 : Formulaire de création de technicien

```typescript
// components/CreateTechnicianForm.tsx
import React, { useState } from 'react';
import { AdminService } from '../services/adminService';
import { CreateTechnicianDto } from '../types/admin';

export const CreateTechnicianForm: React.FC = () => {
  const [formData, setFormData] = useState<CreateTechnicianDto>({
    phone: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.phone) {
      newErrors.phone = 'Le téléphone est requis';
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'Le mot de passe doit contenir au moins une majuscule';
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = 'Le mot de passe doit contenir au moins une minuscule';
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'Le mot de passe doit contenir au moins un chiffre';
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
      newErrors.password = 'Le mot de passe doit contenir au moins un caractère spécial';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const response = await AdminService.createTechnician(formData);
      if (response.success) {
        alert('Technicien créé avec succès !');
        // Réinitialiser le formulaire
        setFormData({
          phone: '',
          password: '',
          firstName: '',
          lastName: '',
          email: '',
        });
      }
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création du technicien');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Téléphone *</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
        {errors.phone && <span className="error">{errors.phone}</span>}
      </div>

      <div>
        <label>Mot de passe *</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />
        {errors.password && <span className="error">{errors.password}</span>}
      </div>

      <div>
        <label>Prénom</label>
        <input
          type="text"
          value={formData.firstName}
          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
        />
      </div>

      <div>
        <label>Nom</label>
        <input
          type="text"
          value={formData.lastName}
          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
        />
      </div>

      <div>
        <label>Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Création...' : 'Créer le technicien'}
      </button>
    </form>
  );
};
```

---

## Gestion des erreurs

### Codes de statut HTTP

| Code | Signification | Action recommandée |
|------|---------------|-------------------|
| `200` | Succès | Traiter la réponse normalement |
| `201` | Créé | Afficher un message de succès |
| `400` | Requête invalide | Afficher les erreurs de validation |
| `401` | Non authentifié | Rediriger vers la page de connexion |
| `403` | Accès interdit | Afficher un message d'erreur, vérifier le rôle |
| `404` | Non trouvé | Afficher un message "Utilisateur non trouvé" |
| `409` | Conflit | Afficher "Email ou téléphone déjà utilisé" |
| `500` | Erreur serveur | Afficher un message d'erreur générique |

### Format des erreurs

**Erreur de validation (400) :**
```json
{
  "success": false,
  "message": "Données invalides",
  "errors": [
    {
      "field": "password",
      "message": "Le mot de passe doit contenir au moins 8 caractères"
    }
  ]
}
```

**Erreur simple :**
```json
{
  "success": false,
  "message": "Utilisateur non trouvé"
}
```

### Fonction utilitaire de gestion d'erreurs

```typescript
export const handleApiError = (error: any): string => {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        if (data.errors && Array.isArray(data.errors)) {
          return data.errors.map((e: any) => e.message).join(', ');
        }
        return data.message || 'Données invalides';
      case 401:
        return 'Session expirée. Veuillez vous reconnecter.';
      case 403:
        return 'Vous n\'avez pas les permissions nécessaires.';
      case 404:
        return 'Ressource non trouvée.';
      case 409:
        return 'Cette ressource existe déjà.';
      case 500:
        return 'Erreur serveur. Veuillez réessayer plus tard.';
      default:
        return data.message || 'Une erreur est survenue.';
    }
  }
  
  return error.message || 'Une erreur est survenue.';
};
```

---

## Notes importantes

### Sécurité

1. **Token JWT** : Toujours inclure le token dans le header `Authorization`
2. **Validation côté client** : La validation côté client est pour l'UX, mais le backend valide toujours
3. **Messages d'erreur** : Ne pas exposer d'informations sensibles dans les messages d'erreur

### Comportements spécifiques

1. **Comptes ADMIN** :
   - Ne sont pas listés dans `/users`
   - Ne peuvent pas être modifiés ou supprimés
   - Tentative de modification retourne une erreur 400

2. **Comptes désactivés** :
   - Un compte désactivé ne peut plus se connecter
   - Les tokens existants sont invalidés au prochain appel API
   - Le message d'erreur de connexion est générique pour la sécurité

3. **Suppression en cascade** :
   - La suppression d'un utilisateur supprime automatiquement :
     - Toutes ses plantations
     - Tous les capteurs et actionneurs associés
     - Tous les événements et notifications associés
   - Cette action est irréversible

4. **Création de techniciens** :
   - Seuls les techniciens peuvent être créés via cet endpoint
   - Les agriculteurs doivent s'inscrire via `/api/v1/auth/register`
   - Le rôle est automatiquement défini comme `technician`

### Bonnes pratiques

1. **Confirmation avant suppression** : Toujours demander confirmation avant de supprimer un utilisateur
2. **Feedback utilisateur** : Afficher des messages de succès/erreur clairs
3. **Gestion du loading** : Afficher un indicateur de chargement pendant les requêtes
4. **Validation en temps réel** : Valider les formulaires en temps réel pour une meilleure UX
5. **Gestion des erreurs réseau** : Gérer les cas où la requête échoue (réseau, timeout, etc.)

---

## Checklist d'implémentation

- [ ] Créer les types TypeScript pour les réponses API
- [ ] Créer un service pour les appels API admin
- [ ] Implémenter la liste des utilisateurs avec pagination (si nécessaire)
- [ ] Implémenter la vue détaillée d'un utilisateur
- [ ] Implémenter le formulaire de création de technicien
- [ ] Implémenter les boutons d'activation/désactivation
- [ ] Implémenter la suppression avec confirmation
- [ ] Gérer les erreurs et afficher les messages appropriés
- [ ] Ajouter des indicateurs de chargement
- [ ] Tester tous les cas d'erreur
- [ ] Vérifier les permissions (rôle ADMIN requis)
- [ ] Ajouter la gestion des tokens expirés

---

## Support

Pour toute question ou problème, consultez :
- Le README principal du backend : `README.md`
- La documentation API complète dans le README principal
- Les logs serveur pour les erreurs détaillées

