# AutoScout24 Luxembourg - Frontend Dashboard

Ein modernes, interaktives Frontend zur Analyse der AutoScout24 Luxembourg Scraping-Daten.

## 🚀 Features

### 📊 Übersicht
- **Live-Statistiken**: Gesamte Listings, Fahrzeugmodelle, Durchschnittspreis
- **Interaktive Charts**: Preisverteilung, Kraftstofftypen, Verkäufertypen
- **Responsive Design**: Optimiert für Desktop und Mobile

### 🚗 Fahrzeugmodelle
- **Modell-Karten**: Detaillierte Statistiken pro Fahrzeugmodell
- **Live-Suche**: Schnelle Filterung nach Modellnamen
- **Sortierung**: Nach Listings, Preis oder Name

### 💰 Preisanalyse
- **Preisstatistiken**: Durchschnitt, Median, Min/Max, Spanne
- **Preishistogramm**: Verteilung der Preise in Kategorien
- **Günstigste Angebote**: Top 10 der preiswertesten Fahrzeuge

### 📈 Trends
- **Preisänderungen**: Visualisierung von Preiserhöhungen/-senkungen über Zeit
- **Aktuelle Änderungen**: Tabelle der neuesten Preisänderungen

### 🔍 Erweiterte Suche
- **Multi-Filter**: Nach Marke, Modell, Kraftstoff, Preisspanne
- **Live-Ergebnisse**: Sofortige Filterung der Listings
- **Detaillierte Ergebnisse**: Umfassende Fahrzeuginformationen

## 🛠️ Technologie

### Frontend
- **HTML5/CSS3**: Moderne, responsive Benutzeroberfläche
- **JavaScript (ES6+)**: Interaktive Funktionalität
- **Chart.js**: Datenvisualisierung
- **SQL.js**: Client-seitige SQLite-Datenbankverarbeitung
- **Font Awesome**: Icons und visuelle Elemente

### Datenquelle
- **GitHub Raw**: Direkte Lade der SQLite-Datenbank von GitHub
- **Kein Backend**: Vollständig client-seitige Anwendung
- **Live-Daten**: Automatische Updates bei neuen Datenbank-Commits

## 🔧 Setup & Verwendung

### Lokale Entwicklung
```bash
# Frontend-Verzeichnis öffnen
cd frontend/

# Einfacher HTTP-Server starten (Python)
python -m http.server 8000

# Oder mit Node.js
npx serve .

# Browser öffnen
open http://localhost:8000
```

### GitHub Pages Deployment
Das Frontend kann direkt auf GitHub Pages gehostet werden:

1. **Repository Settings** → **Pages**
2. **Source**: Deploy from a branch
3. **Branch**: main
4. **Folder**: /frontend

### Direkter Zugriff
Da das Frontend statische Dateien verwendet und die Datenbank direkt von GitHub lädt, kann es auch direkt über `file://` geöffnet werden (bei modernen Browsern mit CORS-Unterstützung).

## 📁 Dateistruktur

```
frontend/
├── index.html          # Hauptseite mit HTML-Struktur
├── styles.css          # CSS-Styling und responsive Design
├── app.js              # JavaScript-Logik und Datenverarbeitung
└── README.md           # Diese Dokumentation
```

## 🌐 Datenbank-URL

Das Frontend lädt die SQLite-Datenbank direkt von:
```
https://github.com/masterries/AutoAnalyse/raw/refs/heads/main/scrapper/data/autoscout_data.db
```

## 📱 Responsive Design

Das Frontend ist vollständig responsive und optimiert für:
- **Desktop**: Full-Feature-Erlebnis mit allen Charts und Tabellen
- **Tablet**: Angepasste Layouts mit Touch-Unterstützung
- **Mobile**: Optimierte Navigation und kompakte Darstellung

## 🎨 Design-Features

### Modern UI
- **Clean Design**: Minimalistisches, professionelles Interface
- **Dark/Light Mode**: Automatische Anpassung an Systemeinstellungen
- **Smooth Animations**: Flüssige Übergänge und Hover-Effekte

### Benutzerfreundlichkeit
- **Intuitive Navigation**: Tab-basierte Navigation
- **Keyboard Shortcuts**: Strg+F für schnelle Suche
- **Loading States**: Klare Statusanzeigen während des Ladens
- **Error Handling**: Benutzerfreundliche Fehlermeldungen

### Performance
- **Lazy Loading**: Charts werden nur bei Bedarf gerendert
- **Efficient Filtering**: Optimierte Suchalgorithmen
- **Memory Management**: Saubere Ressourcenverwaltung

## 🔄 Automatische Updates

Das Frontend aktualisiert sich automatisch, wenn neue Daten in das GitHub-Repository gepusht werden, da es die Datenbank direkt von der main-Branch lädt.

## 🧪 Browser-Unterstützung

- **Chrome/Edge**: ✅ Vollständig unterstützt
- **Firefox**: ✅ Vollständig unterstützt  
- **Safari**: ✅ Vollständig unterstützt
- **Mobile Browser**: ✅ Optimiert für Touch

## 📊 Datenanalyse-Features

### Automatische Berechnungen
- Durchschnittspreise nach Modell
- Preisverteilungen und Histogramme
- Kraftstoff- und Verkäuferstatistiken
- Trend-Analysen

### Interaktive Visualisierungen
- Hover-Tooltips mit Detailinformationen
- Klickbare Legenden zum Ein-/Ausblenden
- Zoom-Funktionalität in Charts
- Responsive Chart-Layouts

### Export-Möglichkeiten
- Charts als PNG speichern (Chart.js Feature)
- Tabellendaten kopierbar
- Print-optimierte Layouts

## 🚀 Erweiterungsmöglichkeiten

### Geplante Features
- **Favoriten**: Speichern von bevorzugten Fahrzeugen
- **Alerts**: Benachrichtigungen bei Preisänderungen
- **Vergleich**: Side-by-Side Modellvergleiche
- **Export**: CSV/Excel-Export von Suchergebnissen

### API-Integration
- Real-time Updates via WebSocket
- Push-Benachrichtigungen
- Social Sharing

## 📞 Support

Bei Fragen oder Problemen:
1. **Issues**: GitHub Issues für Bug-Reports
2. **Dokumentation**: Diese README-Datei
3. **Code-Kommentare**: Inline-Dokumentation im JavaScript

---

**Entwickelt mit ❤️ für die AutoScout24 Luxembourg Datenanalyse**
