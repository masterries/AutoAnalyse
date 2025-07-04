# AutoScout24 Luxembourg Scraper

Ein robuster, täglich laufender Web-Scraper für AutoScout24.lu mit Preisänderungs-Tracking und modernem Frontend.

## 🚀 Features

- **Intelligentes Scraping** - Automatische Seitenerkennung mit adaptiver Verzögerung
- **Multi-Model Support** - Mehrere Fahrzeugmodelle parallel scrapen
- **SQLite-Datenbank** - Robuste Datenspeicherung mit Preishistorie
- **Preisänderungs-Tracking** - Automatische Erkennung von Preisänderungen
- **Log-Management** - Automatische Komprimierung und Bereinigung
- **Frontend Dashboard** - Moderne Weboberfläche für Datenanalyse
- **GitHub Actions** - Täglich automatisches Scraping um 4:00 AM UTC

## 📁 Struktur

```
scrapper/
├── autoscout_luxembourg_scraper.py  # Haupt-Scraper
├── database.py                      # SQLite-Datenbankmanager
├── log_manager.py                   # Log-Verwaltung
├── requirements.txt                 # Python-Dependencies
├── vehicle_models.csv               # Multi-Model-Konfiguration
├── data/                           # Ausgabedaten
│   ├── autoscout_data.db           # SQLite-Datenbank
│   ├── logs/                       # Log-Dateien
│   └── *.csv                       # CSV-Exporte
└── frontend/                       # Dashboard
    ├── index.html                  # Haupt-Dashboard
    ├── style.css                   # Styling
    └── script.js                   # Interaktive Features
```

## 🛠️ Installation

```bash
# Dependencies installieren
pip install -r requirements.txt

# Einzelnes Modell scrapen
python3 autoscout_luxembourg_scraper.py --make bmw --model 120 --scrape-all

# Multi-Model Scraping
python3 autoscout_luxembourg_scraper.py --multi-model vehicle_models.csv --scrape-all
```

## 📊 Verwendung

### Grundlegendes Scraping
```bash
# BMW 120 scrapen (automatische Seitenerkennung)
python3 autoscout_luxembourg_scraper.py --make bmw --model 120 --scrape-all

# Mit spezifischer Seitenzahl
python3 autoscout_luxembourg_scraper.py --make mercedes-benz --model a-200 --pages 5
```

### Multi-Model Scraping
```bash
# Alle Modelle aus vehicle_models.csv scrapen
python3 autoscout_luxembourg_scraper.py --multi-model vehicle_models.csv --scrape-all --delay 3
```

### Statistiken anzeigen
```bash
# Alle Fahrzeugmodelle auflisten
python3 autoscout_luxembourg_scraper.py --list-models

# Statistiken für ein Modell
python3 autoscout_luxembourg_scraper.py --make bmw --model 120 --stats
```

### Log-Management
```bash
# Log-Statistiken anzeigen
python3 log_manager.py --stats

# Manuelle Log-Wartung
python3 log_manager.py --maintenance
```

## 🌐 Frontend Dashboard

Öffne `frontend/index.html` im Browser für:
- **Preisanalyse** - Durchschnittspreise, Min/Max, Trends
- **Filterung** - Nach Marke, Modell, Kraftstoff, etc.
- **Visualisierung** - Charts und Diagramme
- **Export** - CSV-Download der gefilterten Daten

## ⚙️ Konfiguration

### vehicle_models.csv
```csv
make,model
mercedes-benz,a-180
mercedes-benz,a-200
mercedes-benz,c-200
bmw,120
bmw,320
```

### Wichtige Parameter
- `--scrape-all`: Automatische Seitenerkennung (empfohlen)
- `--delay X`: Verzögerung zwischen Requests (Standard: 2s)
- `--csv-mode`: CSV-Dateien statt SQLite verwenden
- `--no-auto-stop`: Weitermachen auch bei leeren Seiten

## 🤖 GitHub Actions

Der Scraper läuft täglich automatisch:
- **Zeit**: 4:00 AM UTC
- **Befehl**: `python3 autoscout_luxembourg_scraper.py --multi-model vehicle_models.csv --scrape-all`
- **Commit**: Automatisch bei Datenänderungen

## 📈 Datenbank-Schema

- **listings**: Aktuelle Fahrzeug-Listings
- **price_history**: Preisänderungen über Zeit
- **metadata**: Scraping-Metadaten und Statistiken

## 🔧 Log-Management

- **Automatisch**: Logs älter als 7 Tage werden komprimiert
- **Cleanup**: Komprimierte Logs älter als 30 Tage werden gelöscht
- **Manuell**: `python3 log_manager.py --maintenance`

## 🚗 Unterstützte Fahrzeugdaten

- Preis, Kilometerstand, Kraftstoffart
- Erstzulassung, Leistung, Getriebe
- Verkäufertyp, Standort, URL
- Automatisches Preisänderungs-Tracking

## ⚡ Performance

- **Adaptive Verzögerung** - Passt sich an Serverantwortzeit an
- **Duplikat-Erkennung** - Verhindert doppelte Listings
- **Intelligenter Stop** - Stoppt bei leeren Seiten
- **Effizienz**: ~1-2 Listings/Sekunde

## 📋 Requirements

- Python 3.8+
- requests, beautifulsoup4, pandas
- SQLite3 (Standard in Python)

Für vollständige Liste siehe `requirements.txt`.
