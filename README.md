# ☀️ Solar Powerflow Card

![version](https://img.shields.io/badge/version-1.2.0-fbbf24)

Carte Lovelace de **flux d'énergie solaire animé** : production, batterie, réseau et maison.
Aucune dépendance, éditeur visuel inclus : les entités et toutes les options se règlent directement dans l'interface.

<p align="center"><img src="images/demo.gif" alt="Démonstration animée de la carte" width="440"></p>

<p align="center"><img src="images/preview.png" alt="Aperçu de la carte" width="440"></p>

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

## 🎛️ Options d'affichage

Toutes ces options sont **désactivées par défaut** : l'aspect de la carte ne change que si tu les actives, dans l'éditeur visuel ou en YAML.

### 📐 Disposition (`layout`)

| `standard` (défaut) | `compact` | `horizontal` |
|:---:|:---:|:---:|
| <img src="images/preview.png" width="220"> | <img src="images/compact.png" width="220"> | <img src="images/horizontal.png" width="300"> |
| Vertical, avec tous les libellés | Plus bas, cercles plus petits : petits tableaux de bord | Large et peu haute : bandeau, tablette murale |

### 🙈 Masquer la batterie ou le réseau (`show_battery`, `show_grid`)

Avec `show_battery: false` ou `show_grid: false`, le cercle est retiré et le reste de la carte est recentré. Sans réseau, le cercle central affiche « – » car l'autonomie ne peut plus être calculée.

<p><img src="images/no-battery.png" width="260" alt="Carte sans batterie"></p>

### 🔀 Flux directs (`direct_flows: true`)

Au lieu de tout faire passer par le cercle central, les points relient directement :
production → batterie, production → réseau, production → maison, batterie → maison, réseau → maison.

<p><img src="images/direct.png" width="260" alt="Flux directs"></p>

> ℹ️ Les capteurs mesurent les puissances de chaque élément, pas l'origine de chaque watt. La répartition affichée est donc **estimée** : la production alimente d'abord la batterie en charge, puis le réseau (injection), puis la maison. Le reste de la consommation vient de la batterie puis du réseau.

### 🚨 Alertes visuelles

| Option | Effet | Réglage |
|---|---|---|
| `alert_battery_full` | « PLEINE » en vert avec un halo sur la batterie | `battery_full_threshold` (défaut `99` %) |
| `alert_battery_low` | « ⚠ FAIBLE » en rouge, la batterie clignote | `battery_low_threshold` (défaut `15` %) |
| `alert_no_production` | « ⚠ AUCUNE PRODUCTION » en rouge quand la production est nulle alors que le soleil est levé (hauteur > 10°) | `sun_entity` (défaut `sun.sun`) |

<p><img src="images/alerts.png" width="260" alt="Alertes visuelles"></p>

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
# Options facultatives
layout: compact              # standard | compact | horizontal
show_battery: true
show_grid: true
direct_flows: false
alert_battery_full: true
battery_full_threshold: 99
alert_battery_low: true
battery_low_threshold: 15
alert_no_production: true
sun_entity: sun.sun
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
| `layout` | `standard`, `compact` ou `horizontal` | `standard` |
| `show_battery` / `show_grid` | Afficher ou masquer la batterie / le réseau | `true` |
| `direct_flows` | Flux directs entre les éléments | `false` |
| `alert_battery_full` / `battery_full_threshold` | Alerte batterie pleine et son seuil (%) | `false` / `99` |
| `alert_battery_low` / `battery_low_threshold` | Alerte batterie faible et son seuil (%) | `false` / `15` |
| `alert_no_production` / `sun_entity` | Alerte « aucune production en plein jour » et entité soleil | `false` / `sun.sun` |

## 🔄 Mises à jour

Avec HACS, une mise à jour est proposée quand une nouvelle **release** est publiée sur GitHub :
**Releases → Draft a new release**, tag `v1.2.0` (à faire évoluer à chaque version), puis **Publish release**.
Le détail des versions est dans [CHANGELOG.md](CHANGELOG.md).

## 🛠️ Dépannage

- *Custom element doesn't exist* : ressource non ajoutée, ou cache non vidé.
- Après une mise à jour du fichier en installation manuelle, ajouter `?v=4` à l'URL de la ressource.

Page explicative avec exemples : [`docs/solar-powerflow-card.html`](docs/solar-powerflow-card.html) (à télécharger puis ouvrir dans un navigateur).
