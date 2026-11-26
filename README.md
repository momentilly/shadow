# Schattenlauf

Plane die Verschattung von PV-Modulen in 3D. Wähle dein Haus auf der Karte, und die App lädt Gebäude, Gelände und Luftbild der Umgebung. Danach zeigt sie Sonnenstand, Schattenwurf und PV-Leistung im Tagesverlauf und rechnet eine Jahresanalyse der Verschattung.

## Funktionen

- Haus auf einer Karte wählen, mit Adresssuche und Luftbild-Ansicht
- 3D-Gebäude im Umkreis von 100, 150 oder 250 m laden
- Gelände aus dem Höhenmodell laden, Gebäude stehen auf der richtigen Höhe
- Luftbild automatisch nordausgerichtet über das Gelände legen
- PV-Module, Bäume und eigene Gebäude platzieren und bearbeiten
- Sonnenbahn, Schattenwurf und PV-Leistung im Tagesverlauf
- Jahresanalyse mit Heatmap und Vergleich mehrerer Projektvarianten
- Projekte werden lokal im Browser gespeichert

## Datenquellen

| Daten | In NRW | Außerhalb von NRW |
| --- | --- | --- |
| Gebäude | LoD2-Gebäudemodell von Geobasis NRW | Gebäudeumrisse aus OpenStreetMap, Höhe aus Stockwerken geschätzt |
| Gelände | DGM1 von Geobasis NRW (WCS) | nicht verfügbar, Gelände bleibt flach |
| Luftbild | Digitale Orthophotos von Geobasis NRW (WMS) | nicht verfügbar, manueller Upload möglich |
| Adresssuche | Nominatim (OpenStreetMap) | Nominatim (OpenStreetMap) |
| Karte | OpenStreetMap-Kacheln | OpenStreetMap-Kacheln |

Die Daten von Geobasis NRW stehen unter der Lizenz dl-de/zero-2-0. OpenStreetMap-Daten stehen unter der ODbL, die Quelle ist in der App genannt.

## Aufbau

- `index.html` – die komplette App, lädt three.js, Leaflet und geotiff.js von CDNs
- `api/lod2.js` – Vercel-Funktion: lädt die passenden LoD2-Kacheln (bis zu 56 MB je Kachel), schneidet den Umkreis aus und liefert die Gebäude als kompaktes JSON
- `api/ping.js` – zeigt der App, dass die Funktion verfügbar ist
- `lib/lod2.js` – Umrechnung nach UTM 32 und LoD2-Parser für die Funktion

Luftbild, Gelände und Adresssuche lädt der Browser direkt, die Dienste erlauben CORS. Ohne die Vercel-Funktion, zum Beispiel auf GitHub Pages, lädt der Browser die LoD2-Kacheln selbst. Das funktioniert auch, dauert aber länger.

## Auf Vercel veröffentlichen

1. Melde dich auf vercel.com mit GitHub an.
2. Klicke auf „Add New…“, dann auf „Project“, und importiere dieses Repository.
3. Wähle bei „Framework Preset“ die Option „Other“. Build Command und Output Directory bleiben leer.
4. Klicke auf „Deploy“.

Jeder Push auf `main` veröffentlicht automatisch eine neue Version.

## Lokal testen

```bash
npm install
npx vercel dev
```

Ohne Vercel reicht auch ein einfacher Webserver, dann ohne LoD2-Funktion:

```bash
npx serve .
```

## Hinweise zur Berechnung

Die Berechnung nutzt ein Klarhimmel-Modell. Diffuses Himmelslicht wird nicht abgeschattet, Bäume gelten als undurchsichtig. Für Ertragsprognosen mit Wetterdaten eignet sich PVGIS der EU-Kommission.
