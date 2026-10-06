# Journal des versions

## 1.5.0
- **Fond de la carte** (`background`) : sombre (défaut), noir, bleu, vert, violet, rouge, gris, clair, **transparent**, ou couleur personnalisée (`background_color`).
- `background_opacity` : fond semi-transparent (0 à 100 %).
- `text_theme` : texte clair ou foncé, choisi automatiquement selon le fond (et le thème de Home Assistant pour le fond transparent), ou forcé.
- `card_border` : possibilité de masquer le contour de la carte.
- Nouvelle section « Fond de la carte » dans l'éditeur ; le champ de couleur personnalisée n'apparaît qu'avec `perso`, et l'opacité disparaît avec `transparent`.

## 1.4.0
- Couleurs des appareils choisies par leur nom (bleu, rouge, orange, jaune, vert, violet, rose, turquoise, marron, blanc) ; l'hexadécimal reste accepté.
- Soutirage réseau signalé seulement au-dessus de 50 W (`grid_import_threshold`, réglable) : flux, badge, autonomie. L'injection reste détectée dès 10 W.
- Un seul capteur signé pour le réseau (`grid_power_entity`, positif = soutirage) et pour la batterie (`battery_power_entity`, positif = charge), avec inversion du sens.
- Nouvelle disposition `layout: mini` : une seule ligne, qui respecte l'affichage de la batterie et du réseau.
- Éditeur réorganisé en sections repliables, avec des champs affichés seulement quand ils servent.
- README : avertissement sur la dépendance aux données de l'onduleur et de l'installation ; sections « Mises à jour » et « Dépannage » retirées.

## 1.3.0
Nouvelle option, désactivée par défaut : le **détail de la consommation de la maison**.
- `consumption_breakdown: ring` : l'anneau du cercle Maison se découpe en segments colorés, un par appareil, avec une légende sous la carte.
- `devices` : liste de capteurs de puissance (nom, groupe et couleur facultatifs), avec un éditeur visuel (ajouter, supprimer, réordonner).
- La part non détaillée (« Autres ») est la consommation de la maison moins les appareils affichés ; elle n'est jamais négative.
- `breakdown_max` (5 par défaut), `breakdown_legend`, `group_devices`, `other_label`.
- Appareils indisponibles comptés pour 0, avec une mention sous la légende.
- Les noms (titre, appareils) sont échappés avant affichage.

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
