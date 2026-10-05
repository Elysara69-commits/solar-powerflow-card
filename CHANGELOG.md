# Journal des versions

## 1.2.0
Toutes les nouveautés sont des **options désactivées par défaut** : une carte existante garde son aspect.
- `layout` : disposition `standard`, `compact` (plus basse) ou `horizontal` (large et peu haute).
- `show_battery` / `show_grid` : masquer la batterie ou le réseau ; le reste est recentré.
- `direct_flows` : flux directs production → batterie, production → réseau, batterie → maison, réseau → maison.
- Alertes : `alert_battery_full`, `alert_battery_low` (seuil réglable), `alert_no_production` (production nulle en plein jour, via `sun.sun`).
- Le clignotement automatique sous 15 % de batterie n'existe plus : il s'active avec `alert_battery_low`.
- Texte du cercle central un peu réduit pour rester dans le cercle.
- README : captures de chaque option et GIF animé.

## 1.1.1
- Correction du clignotement de la carte à chaque mise à jour des capteurs : l'affichage est maintenant mis à jour sans être recréé, donc les animations ne sont plus relancées.
- Vitesse des points animés par paliers, pour éviter les sauts quand la puissance varie légèrement.

## 1.1.0
- Valeurs numériques dans les cercles, textes d'état (EN PRODUCTION, REPOS, INJECTION, SOUTIRAGE…) sous le titre de chaque cercle.
- Suppression de la barre « Où va la production » en bas de la carte.
- Le sélecteur de cartes ne préremplit plus d'entités : aperçu en mode démo.
- Valeurs par défaut génériques : `max_power: 5000`, `battery_capacity: 0`.

## 1.0.0
- Première version : flux animé production, batterie, réseau, maison, éditeur visuel, mode démo.
