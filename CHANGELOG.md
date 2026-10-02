# Journal des versions

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
