# Solar Powerflow Card

Carte Lovelace de flux d'énergie solaire animé : production, batterie, réseau, maison.
Aucune dépendance. Éditeur visuel inclus : les entités se choisissent dans l'interface.

Page explicative avec exemples et graphiques : [`docs/solar-powerflow-card.html`](docs/solar-powerflow-card.html) (à ouvrir dans un navigateur après téléchargement).

## Installation

### Option A : HACS (dépôt personnalisé)
Nécessite que cette carte soit dans **son propre dépôt GitHub** (le fichier `solar-powerflow-card.js` et `hacs.json` à la racine).
1. HACS → ⋮ → **Dépôts personnalisés** → coller l'URL du dépôt, catégorie **Tableau de bord** (Lovelace).
2. Installer **Solar Powerflow Card**, puis recharger la page (Ctrl+F5).

### Option B : manuelle
1. Copier `solar-powerflow-card.js` dans `/config/www/community/solar-powerflow-card/`.
2. **Paramètres → Tableaux de bord → ⋮ → Ressources** (activer le *Mode avancé* dans le profil si besoin).
3. **Ajouter une ressource** : URL `/local/community/solar-powerflow-card/solar-powerflow-card.js`, type **Module JavaScript**.
4. Recharger avec Ctrl+F5.
5. Sur un tableau de bord : **Modifier → Ajouter une carte** → **Solar Powerflow Card** (aperçu en direct, en mode démo si les entités n'existent pas).

## Configuration

Via l'éditeur visuel, ou en YAML :

```yaml
type: custom:solar-powerflow-card
title: INSTALLATION PV
pv_entity: sensor.solarnet_puissance_photovoltaique
load_entity: sensor.solarnet_power_load_consumed
soc_entity: sensor.reserva_etat_de_charge
battery_charge_entity: sensor.solarnet_power_battery_charge
battery_discharge_entity: sensor.solarnet_power_battery_discharge
grid_export_entity: sensor.solarnet_power_grid_export
grid_import_entity: sensor.solarnet_power_grid_import
max_power: 7000
battery_capacity: 6.35
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
| `max_power` | Puissance (W) d'un cercle plein et de la vitesse maximale des animations | `7000` |
| `battery_capacity` | Capacité batterie (kWh). `0` pour masquer l'énergie stockée | `6.35` |

- Les capteurs en **kW** sont convertis automatiquement en W.
- Une entité non renseignée ou introuvable compte pour 0.
- Sans aucune entité trouvée, la carte passe en **mode démo**.
- Un clic sur un cercle ouvre la fiche de l'entité.

## Dépannage

- *Custom element doesn't exist* : ressource non ajoutée, ou cache non vidé.
- Après une mise à jour du fichier, ajouter `?v=2` à l'URL de la ressource.
