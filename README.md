# ☀️ Solar Powerflow Card

![version](https://img.shields.io/badge/version-1.1.0-fbbf24)

Carte Lovelace de **flux d'énergie solaire animé** : production, batterie, réseau et maison.
Aucune dépendance, éditeur visuel inclus : les entités se choisissent directement dans l'interface.

![Aperçu de la carte](images/preview.png)

## 🧭 Comment fonctionne la carte

| Icône | Élément | Ce qu'il affiche |
|---|---|---|
| ☀️ | **Production** | Puissance solaire dans le cercle. Sous le titre : « EN PRODUCTION » ou « AU REPOS ». Le cercle se remplit selon `max_power`. |
| 🔋 | **Batterie** | Niveau de charge dans le cercle. Sous le titre : `▲` puissance de charge, `▼` puissance de décharge, ou « REPOS ». L'énergie stockée en kWh est ajoutée si `battery_capacity` est renseigné. |
| 🗼 | **Réseau** | Puissance échangée dans le cercle. Sous le titre : « → INJECTION » (violet), « ← SOUTIRAGE » (rouge) ou « INACTIF ». |
| 🏠 | **Maison** | Consommation instantanée. Le cercle passe au vert quand le solaire couvre toute la consommation. |
| 🎯 | **Cercle central** | Pourcentage d'**autonomie** : part de la consommation qui ne vient pas du réseau. |
| 🏷️ | **Badge d'état** | Résumé en haut à droite, voir le tableau ci-dessous. |
| ✨ | **Animations** | Les points suivent le sens du flux. Plus la puissance est élevée, plus ils vont vite. |
| 👆 | **Clic** | Un clic sur un cercle ouvre la fiche de l'entité correspondante. |

### 🏷️ États du badge

| Badge | Condition |
|---|---|
| 🟣 SURPLUS INJECTÉ | Production > 10 W et injection > 10 W |
| 🟢 CHARGE BATTERIE | Production > 10 W et batterie en charge |
| 🟡 AUTOCONSOMMATION | Production > 10 W, tout part dans la maison |
| 🔵 SUR BATTERIE | Pas de production, batterie en décharge |
| 🔴 SOUTIRAGE RÉSEAU | Pas de production ni de batterie, la maison tire sur le réseau |
| ⚪ VEILLE | Aucun flux |

> Les puissances sont lues en W. Les capteurs en **kW** sont convertis automatiquement.
> Une entité non renseignée ou introuvable compte pour 0. Sans aucune entité trouvée, la carte s'affiche en **mode démo**.

## 📦 Installation

### Option A : HACS (dépôt personnalisé)
Le fichier `solar-powerflow-card.js` et `hacs.json` doivent être à la racine du dépôt GitHub.
1. HACS → ⋮ → **Dépôts personnalisés** → coller l'URL du dépôt, catégorie **Tableau de bord**.
2. Installer **Solar Powerflow Card**, puis recharger la page (Ctrl+F5).

### Option B : manuelle
1. Copier `solar-powerflow-card.js` dans `/config/www/community/solar-powerflow-card/`.
2. **Paramètres → Tableaux de bord → ⋮ → Ressources** (activer le *Mode avancé* dans le profil si besoin).
3. **Ajouter une ressource** : URL `/local/community/solar-powerflow-card/solar-powerflow-card.js`, type **Module JavaScript**.
4. Recharger avec Ctrl+F5.
5. **Modifier → Ajouter une carte** → **Solar Powerflow Card**.

## ⚙️ Configuration

Via l'éditeur visuel, ou en YAML :

```yaml
type: custom:solar-powerflow-card
title: INSTALLATION PV
pv_entity: sensor.production_solaire
load_entity: sensor.consommation_maison
soc_entity: sensor.batterie_niveau
battery_charge_entity: sensor.batterie_charge
battery_discharge_entity: sensor.batterie_decharge
grid_export_entity: sensor.reseau_injection
grid_import_entity: sensor.reseau_soutirage
max_power: 5000
battery_capacity: 6.5
```

| Option | Description | Défaut |
|---|---|---|
| `title` | Titre en haut à gauche | `INSTALLATION PV` |
| `pv_entity` | Puissance de production solaire | – |
| `load_entity` | Consommation de la maison | – |
| `soc_entity` | Niveau de charge de la batterie (%) | – |
| `battery_charge_entity` | Puissance de charge de la batterie | – |
| `battery_discharge_entity` | Puissance de décharge de la batterie | – |
| `grid_export_entity` | Puissance injectée dans le réseau | – |
| `grid_import_entity` | Puissance soutirée au réseau | – |
| `max_power` | Puissance (W) d'un cercle plein et de la vitesse maximale des animations | `5000` |
| `battery_capacity` | Capacité de la batterie (kWh). `0` pour masquer l'énergie stockée | `0` |

Sans batterie : laisser les trois entités de batterie vides.

## 🔄 Mises à jour

Avec HACS, une mise à jour est proposée quand une nouvelle **release** est publiée sur GitHub :
**Releases → Draft a new release**, tag `v1.1.0` (à faire évoluer à chaque version), puis **Publish release**.
Le détail des versions est dans [CHANGELOG.md](CHANGELOG.md).

## 🛠️ Dépannage

- *Custom element doesn't exist* : ressource non ajoutée, ou cache non vidé.
- Après une mise à jour du fichier en installation manuelle, ajouter `?v=2` à l'URL de la ressource.

Page explicative avec exemples : [`docs/solar-powerflow-card.html`](docs/solar-powerflow-card.html) (à télécharger puis ouvrir dans un navigateur).
