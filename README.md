# AutoScout24 Luxembourg Scraper

Ein robuster Web-Scraper für AutoScout24.lu mit automatischem Preisänderungs-Tracking.

## Features

🚗 **Multi-Fahrzeug Support** - Scrape verschiedene Marken und Modelle  
📊 **Preisänderungs-Tracking** - Automatische Erkennung von Preisänderungen  
💾 **CSV Export** - Strukturierte Datenspeicherung  
⏰ **Tägliche Ausführung** - Für regelmäßige Preisüberwachung  
📝 **Vollständiges Logging** - Detaillierte Ausführungsprotokolle  

## Installation

```bash
# Repository klonen
git clone <repository-url>
cd AutoAnalyse

# Abhängigkeiten installieren
pip install -r requirements.txt

# Oder mit virtueller Umgebung
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# oder: venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

## Verwendung

### Einmalige Ausführung

```bash
# Basis-Verwendung
python autoscout_luxembourg_scraper.py

# Mit benutzerdefinierten Parametern
python autoscout_luxembourg_scraper.py \
    --make mercedes-benz \
    --model a-200 \
    --pages 5 \
    --delay 2 \
    --data-dir data
```

### Parameter

- `--make`: Fahrzeugmarke (z.B. "mercedes-benz", "bmw", "audi")
- `--model`: Fahrzeugmodell (z.B. "a-200", "3-series", "a4")
- `--pages`: Anzahl der zu scrapenden Seiten (Standard: 3)
- `--delay`: Verzögerung zwischen Requests in Sekunden (Standard: 2)
- `--data-dir`: Verzeichnis für Datenfiles (Standard: "data")

### Tägliche Ausführung mit Cron

```bash
# Cron-Job einrichten (jeden Tag um 8:00 Uhr)
crontab -e

# Füge diese Zeile hinzu:
0 8 * * * /pfad/zum/AutoAnalyse/run_daily_scraper.sh
```

## Datenstruktur

### Hauptdatei: `{make}_{model}_listings.csv`

Enthält alle aktuellen Listings mit folgenden Spalten:

| Spalte | Beschreibung |
|--------|-------------|
| `listing_id` | Eindeutige ID des Listings |
| `make` | Fahrzeugmarke |
| `model` | Fahrzeugmodell |
| `title` | Vollständiger Titel |
| `url` | Link zum Listing |
| `price` | Aktueller Preis |
| `mileage` | Laufleistung |
| `fuel_type` | Kraftstoffart |
| `first_registration` | Erstzulassung |
| `power` | Leistung (kW/PS) |
| `transmission` | Getriebeart |
| `seller_type` | Verkäufertyp (Privat/Händler) |
| `location` | Standort |
| `scraped_date` | Scraping-Datum |

### Preishistorie: `{make}_{model}_price_history.csv`

Dokumentiert alle Preisänderungen:

| Spalte | Beschreibung |
|--------|-------------|
| `listing_id` | Eindeutige ID des Listings |
| `title` | Fahrzeugtitel |
| `price_old` | Alter Preis |
| `price_new` | Neuer Preis |
| `price_difference` | Preisdifferenz |
| `price_change_percent` | Prozentuale Änderung |
| `change_type` | PREIS_GESUNKEN/PREIS_GESTIEGEN |
| `change_date` | Datum der Änderung |
| `last_seen` | Letztes Scraping-Datum |

## Beispiel-Ausgabe

```
=== TÄGLICHER SCRAPING-DURCHLAUF GESTARTET ===
Scraping 3 Seiten...
  Gefunden: 18 article-Elemente
  Erfolgreich extrahiert: 18 Listings
🔄 3 Preisänderungen erkannt!
PREIS_GESUNKEN: Mercedes-Benz A 200 d AMG Line - €25.000 → €23.500 (-6.0%)
PREIS_GESUNKEN: Mercedes-Benz A 200 Kompakt - €22.000 → €21.500 (-2.3%)
PREIS_GESTIEGEN: Mercedes-Benz A 200 Sport - €28.000 → €28.500 (+1.8%)
📉 Preissenkungen: 2
📈 Preiserhöhungen: 1
💰 Durchschnittliche Preissenkung: €750
✅ Scraping abgeschlossen in 8.3 Sekunden
📊 Aktuelle Listings: 18
📈 Gesamte Preisänderungen: 15

=== PREISZUSAMMENFASSUNG ===
Listings: 18
Durchschnittspreis: €24,567
Median: €23,500
Preisspanne: €19,500 - €35,000
```

## Verzeichnisstruktur

```
AutoAnalyse/
├── autoscout_luxembourg_scraper.py  # Hauptskript
├── requirements.txt                 # Python-Abhängigkeiten
├── run_daily_scraper.sh            # Shell-Skript für Cron
├── README.md                       # Diese Datei
└── data/                           # Datenverzeichnis
    ├── logs/                       # Log-Dateien
    │   └── scraper_2025-07-04.log
    ├── mercedes-benz_a-200_listings.csv
    ├── mercedes-benz_a-200_price_history.csv
    ├── mercedes-benz_a-200_metadata.json
    ├── bmw_3-series_listings.csv
    └── ...
```

## Monitoring & Alerts

Für erweiterte Funktionalität können Sie folgende Features hinzufügen:

1. **E-Mail-Benachrichtigungen** bei großen Preisänderungen
2. **Slack/Discord-Integration** für Echtzeit-Updates
3. **Grafische Dashboards** mit Plotly/Dash
4. **Datenbank-Integration** für bessere Performance

## Troubleshooting

### Häufige Probleme

1. **Keine Listings gefunden**
   - Überprüfen Sie die Internet-Verbindung
   - Website-Struktur könnte sich geändert haben
   - User-Agent könnte blockiert sein

2. **Preisänderungen werden nicht erkannt**
   - Stellen Sie sicher, dass listing_id eindeutig ist
   - Überprüfen Sie das CSV-Format

3. **Scraping ist zu langsam**
   - Reduzieren Sie die Anzahl der Seiten
   - Erhöhen Sie den Delay zwischen Requests

### Logs überprüfen

```bash
# Neueste Log-Datei anzeigen
tail -f data/logs/scraper_$(date +%Y-%m-%d).log

# Alle Preisänderungen anzeigen
grep "PREIS_" data/logs/scraper_*.log
```

## Rechtliche Hinweise

⚠️ **Wichtig**: Beachten Sie die robots.txt und Nutzungsbedingungen von AutoScout24.lu  
⚠️ **Rate Limiting**: Verwenden Sie angemessene Delays zwischen Requests  
⚠️ **Respektvolle Nutzung**: Überlasten Sie die Server nicht  

## Lizenz

MIT License - Siehe LICENSE-Datei für Details.

---

# AutoAnalyse