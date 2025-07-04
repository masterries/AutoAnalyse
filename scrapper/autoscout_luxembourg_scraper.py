#!/usr/bin/env python3
"""
AutoScout24 Luxembourg Scraper
==============================

Ein robuster Web-Scraper für AutoScout24.lu mit Preisänderungs-Tracking.

Features:
- BeautifulSoup-basiertes Scraping (schnell und effizient)
- Automatisches Preisänderungs-Tracking
- CSV-Export mit Zeitstempel
- Tägliche Ausführung möglich
- Vollständige Fehlerbehandlung

Author: AutoAnalyse Team
Date: 2025-07-04
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
import re
import time
from urllib.parse import urljoin
from datetime import datetime, date
import os
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
import json
from database import AutoScoutDatabase


class AutoScout24LuxembourgScraper:
    """
    Hauptklasse für das Scraping von AutoScout24.lu mit Preisänderungs-Tracking
    """
    
    def __init__(self, make: str, model: str, sort: str = "standard", 
                 desc: int = 0, ustate: str = "N,U", atype: str = "C",
                 data_dir: str = "data", use_database: bool = True):
        """
        Initialisiert den Scraper
        
        Args:
            make: Fahrzeugmarke (z.B. "mercedes-benz")
            model: Fahrzeugmodell (z.B. "a-200")
            sort: Sortierung (standard, price, mileage, age)
            desc: Absteigende Sortierung (0 oder 1)
            ustate: Fahrzeugzustand ("N,U" für Neu und Gebraucht)
            atype: Fahrzeugtyp ("C" für PKW)
            data_dir: Verzeichnis für Datenfiles
            use_database: Verwendung der SQLite-Datenbank (Standard: True)
        """
        self.make = make
        self.model = model
        self.sort = sort
        self.desc = desc
        self.ustate = ustate
        self.atype = atype
        self.data_dir = Path(data_dir)
        self.use_database = use_database
        
        # Verzeichnis erstellen falls nicht vorhanden
        self.data_dir.mkdir(exist_ok=True)
        
        # Logging setup
        self._setup_logging()
        
        # Datenbank-Verbindung
        if self.use_database:
            db_path = self.data_dir / "autoscout_data.db"
            self.database = AutoScoutDatabase(str(db_path))
            self.logger.info(f"SQLite-Datenbank initialisiert: {db_path}")
        else:
            self.database = None
            self.logger.info("CSV-Modus aktiviert (keine Datenbank)")
        
        # Basis URL für Luxembourg
        self.base_url = (
            "https://www.autoscout24.lu/lst/{}/{}?"
            "sort={}&desc={}&ustate={}&atype={}&cy=L&source=homepage_search-mask"
        )
        
        # Session für HTTP-Requests
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'de-DE,de;q=0.8,en-US;q=0.5,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Cache-Control': 'max-age=0',
        })
        
        # Legacy CSV-Dateinamen (für Kompatibilität)
        self.csv_filename = self.data_dir / f"{make}_{model}_listings.csv"
        self.price_history_filename = self.data_dir / f"{make}_{model}_price_history.csv"
        self.metadata_filename = self.data_dir / f"{make}_{model}_metadata.json"
        
        # DataFrame für aktuelle Listings (temporär)
        self.current_listings = pd.DataFrame()
        
        # DataFrame für Preishistorie (temporär)
        self.price_history = pd.DataFrame()
        
        self.logger.info(f"Scraper initialisiert für {make} {model}")
        
    def __del__(self):
        """Destruktor - schließt Datenbankverbindung"""
        if hasattr(self, 'database') and self.database:
            self.database.close()

    def _setup_logging(self):
        """Richtet das Logging ein mit automatischer Komprimierung nach 1 Woche"""
        import logging.handlers
        import gzip
        import shutil
        from datetime import datetime, timedelta
        
        log_dir = self.data_dir / "logs"
        log_dir.mkdir(exist_ok=True)
        
        # Komprimiere alte Logs (älter als 7 Tage)
        self._compress_old_logs(log_dir)
        
        log_filename = log_dir / f"scraper_{date.today().isoformat()}.log"
        
        # Erstelle RotatingFileHandler mit automatischer Rotation
        file_handler = logging.handlers.TimedRotatingFileHandler(
            filename=str(log_filename),
            when='midnight',  # Rotiere täglich um Mitternacht
            interval=1,
            backupCount=7,  # Behalte 7 Tage
            encoding='utf-8'
        )
        
        # Console Handler
        console_handler = logging.StreamHandler()
        
        # Formatter
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        
        # Logger konfigurieren
        logger = logging.getLogger(__name__)
        logger.setLevel(logging.INFO)
        
        # Entferne bestehende Handler um Duplikate zu vermeiden
        for handler in logger.handlers[:]:
            logger.removeHandler(handler)
        
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)
        
        self.logger = logger
        
    def _compress_old_logs(self, log_dir: Path):
        """Komprimiert Log-Dateien die älter als 7 Tage sind"""
        try:
            cutoff_date = datetime.now() - timedelta(days=7)
            
            for log_file in log_dir.glob("scraper_*.log*"):
                # Überspringe bereits komprimierte Dateien
                if log_file.suffix == '.gz':
                    continue
                
                # Prüfe Alter der Datei
                file_mtime = datetime.fromtimestamp(log_file.stat().st_mtime)
                
                if file_mtime < cutoff_date:
                    # Komprimiere die Datei
                    compressed_file = log_file.with_suffix(log_file.suffix + '.gz')
                    
                    # Überspringe wenn bereits komprimiert
                    if compressed_file.exists():
                        log_file.unlink()  # Lösche Original
                        continue
                    
                    try:
                        with open(log_file, 'rb') as f_in:
                            with gzip.open(compressed_file, 'wb') as f_out:
                                shutil.copyfileobj(f_in, f_out)
                        
                        # Lösche Original nach erfolgreicher Komprimierung
                        log_file.unlink()
                        
                        print(f"📦 Log komprimiert: {log_file.name} -> {compressed_file.name}")
                        
                    except Exception as e:
                        print(f"Warnung: Fehler beim Komprimieren von {log_file}: {e}")
            
            # Lösche sehr alte komprimierte Logs (älter als 30 Tage)
            self._cleanup_old_compressed_logs(log_dir)
            
        except Exception as e:
            # Fehler beim Log-Management sollten das Hauptprogramm nicht stoppen
            print(f"Warnung: Fehler beim Log-Management: {e}")
    
    def _cleanup_old_compressed_logs(self, log_dir: Path):
        """Lösche komprimierte Logs die älter als 30 Tage sind"""
        try:
            cutoff_date = datetime.now() - timedelta(days=30)
            
            for compressed_log in log_dir.glob("scraper_*.log.gz"):
                file_mtime = datetime.fromtimestamp(compressed_log.stat().st_mtime)
                
                if file_mtime < cutoff_date:
                    try:
                        compressed_log.unlink()
                        print(f"🗑️  Alter komprimierter Log gelöscht: {compressed_log.name}")
                    except Exception as e:
                        print(f"Warnung: Fehler beim Löschen von {compressed_log}: {e}")
                        
        except Exception as e:
            print(f"Warnung: Fehler beim Cleanup komprimierter Logs: {e}")

    def get_total_pages(self, first_page_soup) -> int:
        """Ermittelt die Gesamtanzahl der verfügbaren Seiten"""
        try:
            # Suche nach Pagination-Elementen
            pagination = first_page_soup.find('nav', class_=re.compile(r'.*pagination.*', re.I))
            if not pagination:
                pagination = first_page_soup.find('div', class_=re.compile(r'.*pagination.*', re.I))
            
            if pagination:
                # Suche nach der letzten Seitenzahl
                page_links = pagination.find_all('a', href=re.compile(r'page=\d+'))
                if page_links:
                    max_page = 1
                    for link in page_links:
                        href = link.get('href', '')
                        page_match = re.search(r'page=(\d+)', href)
                        if page_match:
                            page_num = int(page_match.group(1))
                            max_page = max(max_page, page_num)
                    return max_page
            
            # Alternative: Suche nach "Seite X von Y" Text
            page_info = first_page_soup.find(string=re.compile(r'(?:Seite|Page)\s+\d+\s+(?:von|of)\s+(\d+)', re.I))
            if page_info:
                match = re.search(r'(?:von|of)\s+(\d+)', page_info, re.I)
                if match:
                    return int(match.group(1))
            
            # Fallback: Suche nach der Anzahl der Ergebnisse
            results_text = first_page_soup.find(string=re.compile(r'(\d+)\s+(?:Treffer|results)', re.I))
            if results_text:
                match = re.search(r'(\d+)', results_text)
                if match:
                    total_results = int(match.group(1))
                    # Annahme: ~20 Listings pro Seite
                    estimated_pages = (total_results + 19) // 20
                    return min(estimated_pages, 50)  # Begrenze auf maximal 50 Seiten
                    
        except Exception as e:
            self.logger.warning(f"Fehler beim Ermitteln der Seitenzahl: {e}")
        
        return 1  # Fallback: nur eine Seite

    def generate_urls(self, max_pages: int = None) -> List[str]:
        """Generiert URLs für mehrere Seiten"""
        base_url = self.base_url.format(
            self.make, self.model, self.sort, 
            self.desc, self.ustate, self.atype
        )
        
        if max_pages is None:
            # Wenn keine maximale Seitenzahl angegeben, starte mit der ersten Seite
            return [base_url]
        
        url_list = [base_url]
        for i in range(2, max_pages + 1):
            url_with_page = base_url + f"&page={i}"
            url_list.append(url_with_page)
            
        return url_list

    def extract_listing_data(self, article_soup) -> Optional[Dict[str, Any]]:
        """Extrahiert Daten aus einem article Element"""
        try:
            # Eindeutige ID des Listings (GUID)
            listing_id = article_soup.get('data-guid')
            if not listing_id:
                listing_id = article_soup.get('id', 'unknown')
            
            # Basis-Datenstruktur
            data = {
                "listing_id": listing_id,
                "make": self.make,
                "model": self.model,
                "title": None,
                "url": None,
                "price": None,
                "mileage": None,
                "fuel_type": None,
                "first_registration": None,
                "power": None,
                "transmission": None,
                "seller_type": None,
                "location": None,
                "scraped_date": datetime.now().isoformat(),
                "scraped_timestamp": int(time.time())
            }
            
            # Direkt aus data-* Attributen extrahieren
            data["price"] = article_soup.get('data-price')
            data["mileage"] = article_soup.get('data-mileage')
            data["fuel_type"] = self._convert_fuel_type(article_soup.get('data-fuel-type'))
            data["first_registration"] = article_soup.get('data-first-registration')
            data["seller_type"] = self._convert_seller_type(article_soup.get('data-seller-type'))
            
            # Titel und URL aus dem Link extrahieren
            title_link = article_soup.find('a', class_=re.compile(r'.*title.*'))
            if title_link:
                data["title"] = title_link.get_text(strip=True)
                href = title_link.get('href')
                if href:
                    data["url"] = urljoin("https://www.autoscout24.lu", href)
            
            # Leistung extrahieren
            power_elem = article_soup.find('span', {'data-testid': 'VehicleDetails-speedometer'})
            if power_elem:
                power_text = power_elem.get_text(strip=True)
                power_match = re.search(r'(\d+)\s*kW\s*\((\d+)\s*(?:CH|PS)\)', power_text)
                if power_match:
                    data["power"] = f"{power_match.group(1)} kW ({power_match.group(2)} PS)"
            
            # Getriebe
            transmission_elem = article_soup.find('span', {'data-testid': 'VehicleDetails-transmission'})
            if transmission_elem:
                trans_text = transmission_elem.get_text(strip=True)
                data["transmission"] = self._convert_transmission(trans_text)
            
            # Standort
            location_elem = article_soup.find('span', class_=re.compile(r'.*SellerInfo.*'))
            if location_elem:
                location_text = location_elem.get_text(strip=True)
                data["location"] = location_text
            
            return data
            
        except Exception as e:
            self.logger.error(f"Fehler beim Extrahieren der Listing-Daten: {e}")
            return None

    def _convert_fuel_type(self, fuel_code: str) -> str:
        """Konvertiert Kraftstoff-Code zu lesbarem Text"""
        fuel_mapping = {
            'd': 'Diesel',
            'b': 'Benzin',
            'e': 'Elektro',
            'h': 'Hybrid',
            'l': 'LPG',
            'c': 'CNG'
        }
        return fuel_mapping.get(fuel_code, fuel_code) if fuel_code else None
    
    def _convert_seller_type(self, seller_code: str) -> str:
        """Konvertiert Verkäufer-Code zu lesbarem Text"""
        seller_mapping = {
            'p': 'Privat',
            'd': 'Händler'
        }
        return seller_mapping.get(seller_code, seller_code) if seller_code else None
    
    def _convert_transmission(self, trans_text: str) -> str:
        """Konvertiert französischen Getriebe-Text zu deutschem"""
        if not trans_text:
            return None
        if 'automatique' in trans_text.lower():
            return 'Automatik'
        elif 'manuelle' in trans_text.lower():
            return 'Manuell'
        return trans_text

    def scrape_listings(self, max_pages: int = None, delay: int = 1, 
                       stop_on_empty: bool = True, adaptive_delay: bool = True) -> pd.DataFrame:
        """
        Führt das Scraping durch und gibt DataFrame zurück
        
        Args:
            max_pages: Maximale Anzahl der zu scrapenden Seiten (None = automatisch ermitteln)
            delay: Basis-Verzögerung zwischen Requests in Sekunden
            stop_on_empty: Stoppe wenn eine Seite keine Listings enthält
            adaptive_delay: Verwende adaptive Verzögerung basierend auf Serverantwortzeit
            
        Returns:
            DataFrame mit den gescrapten Listings
        """
        all_listings = []
        seen_listing_ids = set()
        current_delay = delay
        actual_pages_scraped = 0
        
        self.logger.info(f"Starte intelligentes Scraping...")
        
        # Schritt 1: Erste Seite scrapen und Gesamtseitenzahl ermitteln
        first_url = self.generate_urls(1)[0]
        
        try:
            start_time = time.time()
            response = self.session.get(first_url, timeout=15)
            response.raise_for_status()
            response_time = time.time() - start_time
            
            # Adaptive Verzögerung basierend auf Serverantwortzeit
            if adaptive_delay:
                current_delay = max(delay, response_time * 2)
                self.logger.info(f"Serverantwortzeit: {response_time:.2f}s, angepasste Verzögerung: {current_delay:.2f}s")
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Ermittle Gesamtseitenzahl falls nicht angegeben
            if max_pages is None:
                total_pages = self.get_total_pages(soup)
                # Begrenze auf eine vernünftige Anzahl
                max_pages = min(total_pages, 100)
                self.logger.info(f"Automatisch ermittelte Seitenzahl: {total_pages}, begrenze auf: {max_pages}")
            
            # Verarbeite erste Seite
            articles = soup.find_all('article', class_='cldt-summary-full-item')
            self.logger.info(f"Seite 1/{max_pages}: {len(articles)} article-Elemente gefunden")
            
            page_listings = 0
            for article in articles:
                listing_data = self.extract_listing_data(article)
                
                if listing_data and listing_data.get('title') and listing_data.get('listing_id'):
                    listing_id = listing_data['listing_id']
                    
                    # Überprüfe auf Duplikate (global, nicht pro Seite)
                    if listing_id not in seen_listing_ids:
                        all_listings.append(listing_data)
                        seen_listing_ids.add(listing_id)
                        page_listings += 1
            
            self.logger.info(f"Seite 1: {page_listings} neue Listings extrahiert")
            actual_pages_scraped = 1
            
            # Wenn erste Seite leer ist, stoppe sofort
            if page_listings == 0 and stop_on_empty:
                self.logger.warning("Erste Seite enthält keine Listings - Scraping beendet")
                return pd.DataFrame()
                
        except requests.RequestException as e:
            self.logger.error(f"Fehler beim Laden der ersten Seite: {e}")
            return pd.DataFrame()
        except Exception as e:
            self.logger.error(f"Allgemeiner Fehler auf der ersten Seite: {e}")
            return pd.DataFrame()
        
        # Schritt 2: Weitere Seiten scrapen (nur wenn mehr als 1 Seite verfügbar)
        if max_pages > 1:
            for page_num in range(2, max_pages + 1):
                try:
                    # Verzögerung vor nächster Seite
                    if current_delay > 0:
                        time.sleep(current_delay)
                    
                    # URL für aktuelle Seite
                    page_url = first_url + f"&page={page_num}"
                    
                    start_time = time.time()
                    response = self.session.get(page_url, timeout=15)
                    response.raise_for_status()
                    response_time = time.time() - start_time
                    
                    # Adaptive Verzögerung anpassen
                    if adaptive_delay:
                        # Erhöhe Verzögerung wenn Server langsam antwortet
                        if response_time > 3:
                            current_delay = min(current_delay * 1.2, 10)
                        elif response_time < 1:
                            current_delay = max(current_delay * 0.9, delay)
                    
                    soup = BeautifulSoup(response.content, 'html.parser')
                    articles = soup.find_all('article', class_='cldt-summary-full-item')
                    
                    self.logger.info(f"Seite {page_num}/{max_pages}: {len(articles)} article-Elemente gefunden")
                    
                    page_listings = 0
                    
                    for article in articles:
                        listing_data = self.extract_listing_data(article)
                        
                        if listing_data and listing_data.get('title') and listing_data.get('listing_id'):
                            listing_id = listing_data['listing_id']
                            
                            # Überprüfe auf Duplikate (global)
                            if listing_id not in seen_listing_ids:
                                all_listings.append(listing_data)
                                seen_listing_ids.add(listing_id)
                                page_listings += 1
                    
                    self.logger.info(f"Seite {page_num}: {page_listings} neue Listings extrahiert")
                    actual_pages_scraped = page_num
                    
                    # Einfache Regel: Wenn eine Seite 0 neue Listings hat, stoppe
                    if page_listings == 0 and stop_on_empty:
                        self.logger.info(f"Stoppe nach Seite {page_num} - keine neuen Listings gefunden")
                        break
                        
                except requests.RequestException as e:
                    self.logger.error(f"HTTP-Fehler auf Seite {page_num}: {e}")
                    # Erhöhe Verzögerung bei Fehlern
                    current_delay = min(current_delay * 1.5, 15)
                    continue
                except Exception as e:
                    self.logger.error(f"Allgemeiner Fehler auf Seite {page_num}: {e}")
                    continue
        
        # Erstelle DataFrame
        if all_listings:
            self.current_listings = pd.DataFrame(all_listings)
            self.logger.info(
                f"✅ Intelligentes Scraping abgeschlossen. "
                f"Insgesamt {len(self.current_listings)} eindeutige Listings gesammelt "
                f"aus {actual_pages_scraped} Seiten."
            )
        else:
            self.current_listings = pd.DataFrame()
            self.logger.warning("❌ Keine Listings gefunden!")
        
        return self.current_listings

    def load_existing_data(self) -> tuple:
        """Lädt bestehende Daten aus der Datenbank oder CSV-Dateien"""
        existing_listings = pd.DataFrame()
        existing_price_history = pd.DataFrame()
        
        if self.use_database and self.database:
            # Lade aus SQLite-Datenbank
            try:
                existing_listings = self.database.get_existing_listings(self.make, self.model)
                existing_price_history = self.database.get_price_history(self.make, self.model)
                
                self.logger.info(
                    f"Daten aus Datenbank geladen: {len(existing_listings)} Listings, "
                    f"{len(existing_price_history)} Preisänderungen"
                )
                
            except Exception as e:
                self.logger.error(f"Fehler beim Laden aus Datenbank: {e}")
        else:
            # Legacy CSV-Modus
            if self.csv_filename.exists():
                try:
                    existing_listings = pd.read_csv(self.csv_filename)
                    self.logger.info(f"Bestehende Listings aus CSV geladen: {len(existing_listings)} Einträge")
                except Exception as e:
                    self.logger.error(f"Fehler beim Laden bestehender Listings: {e}")
            
            if self.price_history_filename.exists():
                try:
                    existing_price_history = pd.read_csv(self.price_history_filename)
                    self.logger.info(f"Preishistorie aus CSV geladen: {len(existing_price_history)} Einträge")
                except Exception as e:
                    self.logger.error(f"Fehler beim Laden der Preishistorie: {e}")
        
        return existing_listings, existing_price_history

    def detect_price_changes(self, existing_listings: pd.DataFrame) -> List[Dict]:
        """Erkennt Preisänderungen zwischen aktuellen und bestehenden Listings"""
        price_changes = []
        
        if existing_listings.empty or self.current_listings.empty:
            return price_changes
        
        # Merge auf listing_id
        merged = self.current_listings.merge(
            existing_listings[['listing_id', 'price', 'scraped_date']], 
            on='listing_id', 
            suffixes=('_new', '_old'),
            how='inner'
        )
        
        for _, row in merged.iterrows():
            try:
                price_new = float(row['price_new']) if pd.notna(row['price_new']) else None
                price_old = float(row['price_old']) if pd.notna(row['price_old']) else None
                
                if price_new and price_old and price_new != price_old:
                    change = {
                        'listing_id': row['listing_id'],
                        'title': row['title'],
                        'price_old': price_old,
                        'price_new': price_new,
                        'price_difference': price_new - price_old,
                        'price_change_percent': ((price_new - price_old) / price_old) * 100,
                        'change_date': datetime.now().isoformat(),
                        'change_timestamp': int(time.time()),
                        'last_seen': row['scraped_date_old']
                    }
                    
                    change_type = "PREIS_GESUNKEN" if price_new < price_old else "PREIS_GESTIEGEN"
                    change['change_type'] = change_type
                    
                    price_changes.append(change)
                    
                    self.logger.info(
                        f"{change_type}: {row['title']} - "
                        f"€{price_old:,.0f} → €{price_new:,.0f} "
                        f"({change['price_change_percent']:+.1f}%)"
                    )
                    
            except (ValueError, TypeError) as e:
                self.logger.warning(f"Preisvergleich fehlgeschlagen für listing_id {row['listing_id']}: {e}")
        
        return price_changes

    def update_price_history(self, price_changes: List[Dict]):
        """Aktualisiert die Preishistorie mit neuen Änderungen"""
        if not price_changes:
            return
        
        if self.use_database and self.database:
            # Speichere in SQLite-Datenbank
            try:
                self.database.insert_price_changes(price_changes, self.make, self.model)
                
                # Lade aktualisierte Preishistorie für temporäres DataFrame
                self.price_history = self.database.get_price_history(self.make, self.model)
                
            except Exception as e:
                self.logger.error(f"Fehler beim Speichern der Preishistorie in Datenbank: {e}")
        else:
            # Legacy CSV-Modus
            new_history_df = pd.DataFrame(price_changes)
            
            if self.price_history_filename.exists():
                try:
                    existing_history = pd.read_csv(self.price_history_filename)
                    self.price_history = pd.concat([existing_history, new_history_df], ignore_index=True)
                except Exception as e:
                    self.logger.error(f"Fehler beim Laden der Preishistorie: {e}")
                    self.price_history = new_history_df
            else:
                self.price_history = new_history_df

    def save_data(self):
        """Speichert alle Daten in Datenbank oder CSV-Dateien"""
        timestamp = datetime.now()
        
        try:
            if self.use_database and self.database:
                # Speichere in SQLite-Datenbank
                new_listings_count = 0
                
                if not self.current_listings.empty:
                    # Konvertiere DataFrame zu Liste von Dictionaries
                    listings_data = self.current_listings.to_dict('records')
                    
                    # Speichere Listings in Datenbank
                    new_listings_count = self.database.insert_listings(
                        listings_data, self.make, self.model
                    )
                    
                    # Markiere nicht mehr verfügbare Listings als inaktiv
                    current_listing_ids = self.current_listings['listing_id'].tolist()
                    self.database.mark_listings_inactive(self.make, self.model, current_listing_ids)
                    
                    self.logger.info(f"Listings in Datenbank gespeichert: {len(self.current_listings)}")
                
                # Aktualisiere Metadaten
                price_changes_count = len(self.price_history) if not self.price_history.empty else 0
                self.database.update_metadata(
                    self.make, self.model,
                    total_listings=len(self.current_listings),
                    new_listings=new_listings_count,
                    price_changes=price_changes_count,
                    status='success',
                    scraper_version='2.0'
                )
                
                # Optional: Exportiere auch zu CSV für Frontend-Kompatibilität
                self.database.export_to_csv(self.make, self.model, str(self.data_dir))
                
            else:
                # Legacy CSV-Modus
                if not self.current_listings.empty:
                    self.current_listings.to_csv(self.csv_filename, index=False)
                    self.logger.info(f"Aktuelle Listings gespeichert: {self.csv_filename}")
                
                if not self.price_history.empty:
                    self.price_history.to_csv(self.price_history_filename, index=False)
                    self.logger.info(f"Preishistorie gespeichert: {self.price_history_filename}")
                
                # Speichere Metadata
                metadata = {
                    'last_update': timestamp.isoformat(),
                    'make': self.make,
                    'model': self.model,
                    'total_listings': len(self.current_listings),
                    'total_price_changes': len(self.price_history),
                    'scraper_version': '2.0'
                }
                
                with open(self.metadata_filename, 'w') as f:
                    json.dump(metadata, f, indent=2)
                    
                self.logger.info("Metadata gespeichert")
                
        except Exception as e:
            self.logger.error(f"Fehler beim Speichern: {e}")

    def run_daily_scrape(self, max_pages: int = None, delay: int = 2, 
                        stop_on_empty: bool = True, adaptive_delay: bool = True):
        """
        Führt einen kompletten Scraping-Durchlauf durch mit Preisänderungs-Detection
        
        Args:
            max_pages: Maximale Anzahl der zu scrapenden Seiten (None = automatisch ermitteln)
            delay: Basis-Verzögerung zwischen Requests
            stop_on_empty: Stoppe wenn keine neuen Listings mehr gefunden werden
            adaptive_delay: Verwende adaptive Verzögerung basierend auf Serverantwortzeit
        """
        start_time = time.time()
        self.logger.info("=== INTELLIGENTER SCRAPING-DURCHLAUF GESTARTET ===")
        
        if max_pages is None:
            self.logger.info("🔍 Automatische Seitenerkennung aktiviert")
        else:
            self.logger.info(f"📄 Maximale Seiten: {max_pages}")
            
        self.logger.info(f"⚙️  Stop-on-Empty: {stop_on_empty}, Adaptive-Delay: {adaptive_delay}")
        
        try:
            # 1. Lade bestehende Daten
            existing_listings, existing_price_history = self.load_existing_data()
            
            # 2. Scrape aktuelle Listings mit intelligenter Logik
            current_listings = self.scrape_listings(
                max_pages=max_pages, 
                delay=delay,
                stop_on_empty=stop_on_empty,
                adaptive_delay=adaptive_delay
            )
            
            if current_listings.empty:
                self.logger.warning("Keine neuen Listings gefunden - Scraping beendet")
                return
            
            # 3. Erkenne Preisänderungen
            price_changes = self.detect_price_changes(existing_listings)
            
            if price_changes:
                self.logger.info(f"🔄 {len(price_changes)} Preisänderungen erkannt!")
                
                # 4. Aktualisiere Preishistorie
                self.update_price_history(price_changes)
                
                # 5. Zeige Zusammenfassung der Änderungen
                price_drops = [c for c in price_changes if c['price_difference'] < 0]
                price_increases = [c for c in price_changes if c['price_difference'] > 0]
                
                self.logger.info(f"📉 Preissenkungen: {len(price_drops)}")
                self.logger.info(f"📈 Preiserhöhungen: {len(price_increases)}")
                
                if price_drops:
                    avg_drop = sum(c['price_difference'] for c in price_drops) / len(price_drops)
                    self.logger.info(f"💰 Durchschnittliche Preissenkung: €{abs(avg_drop):,.0f}")
            else:
                self.logger.info("ℹ️  Keine Preisänderungen erkannt")
            
            # 6. Speichere alle Daten
            self.save_data()
            
            # 7. Erweiterte Statistiken
            duration = time.time() - start_time
            unique_listings = len(current_listings['listing_id'].unique()) if not current_listings.empty else 0
            
            self.logger.info(f"✅ Intelligentes Scraping abgeschlossen in {duration:.1f} Sekunden")
            self.logger.info(f"📊 Einzigartige Listings: {unique_listings}")
            self.logger.info(f"📈 Gesamte Preisänderungen: {len(self.price_history)}")
            
            # Effizienz-Statistik
            if duration > 0:
                listings_per_second = unique_listings / duration
                self.logger.info(f"⚡ Effizienz: {listings_per_second:.2f} Listings/Sekunde")
            
        except Exception as e:
            self.logger.error(f"❌ Fehler beim intelligenten Scraping: {e}")
            raise
        finally:
            self.session.close()

    def get_price_summary(self) -> Dict:
        """Erstellt eine Zusammenfassung der Preisdaten"""
        if self.current_listings.empty:
            return {}
        
        # Konvertiere Preise zu numerisch
        prices = pd.to_numeric(self.current_listings['price'], errors='coerce').dropna()
        
        if prices.empty:
            return {}
        
        summary = {
            'total_listings': len(self.current_listings),
            'avg_price': float(prices.mean()),
            'median_price': float(prices.median()),
            'min_price': float(prices.min()),
            'max_price': float(prices.max()),
            'price_range': float(prices.max() - prices.min()),
        }
        
        return summary
    
    def get_all_vehicle_models(self) -> List[tuple]:
        """Gibt alle verfügbaren Fahrzeugmodelle aus der Datenbank zurück"""
        if self.use_database and self.database:
            return self.database.get_all_vehicle_models()
        else:
            self.logger.warning("Fahrzeugmodell-Liste nur im Datenbank-Modus verfügbar")
            return [(self.make, self.model)]
    
    def get_statistics(self, make: str = None, model: str = None) -> Dict:
        """Erstellt Statistiken für ein oder alle Fahrzeugmodelle"""
        if self.use_database and self.database:
            return self.database.get_statistics(
                make or self.make, 
                model or self.model
            )
        else:
            self.logger.warning("Statistiken nur im Datenbank-Modus verfügbar")
            return {}
    
    def close_database(self):
        """Schließt die Datenbankverbindung explizit"""
        if self.database:
            self.database.close()
            self.database = None
            self.logger.info("Datenbankverbindung geschlossen")
    
    @classmethod
    def scrape_multiple_models(cls, vehicle_models: List[tuple], max_pages: int = None, 
                              delay: int = 2, data_dir: str = "data", 
                              stop_on_empty: bool = True, adaptive_delay: bool = True) -> Dict[str, Dict]:
        """
        Scraped mehrere Fahrzeugmodelle sequenziell
        
        Args:
            vehicle_models: Liste von (make, model) Tupeln
            max_pages: Maximale Anzahl Seiten pro Modell (None = automatisch)
            delay: Basis-Verzögerung zwischen Requests
            data_dir: Datenverzeichnis
            stop_on_empty: Stoppe wenn keine neuen Listings mehr gefunden werden
            adaptive_delay: Verwende adaptive Verzögerung
            
        Returns:
            Dictionary mit Ergebnissen pro Fahrzeugmodell
        """
        results = {}
        
        for make, model in vehicle_models:
            try:
                print(f"\n{'='*60}")
                print(f"🚗 Intelligentes Scraping: {make} {model}")
                print(f"{'='*60}")
                
                scraper = cls(make=make, model=model, data_dir=data_dir)
                
                # Führe intelligentes Scraping durch
                scraper.run_daily_scrape(
                    max_pages=max_pages, 
                    delay=delay,
                    stop_on_empty=stop_on_empty,
                    adaptive_delay=adaptive_delay
                )
                
                # Sammle Ergebnisse
                summary = scraper.get_price_summary()
                statistics = scraper.get_statistics()
                
                results[f"{make}_{model}"] = {
                    'summary': summary,
                    'statistics': statistics,
                    'status': 'success'
                }
                
                # Intelligente Pause zwischen verschiedenen Modellen
                # Längere Pause für bessere Server-Schonung
                model_delay = max(5, delay * 2)
                print(f"⏸️  Pause {model_delay}s vor nächstem Modell...")
                time.sleep(model_delay)
                
            except Exception as e:
                print(f"❌ Fehler beim Scraping von {make} {model}: {e}")
                results[f"{make}_{model}"] = {
                    'status': 'error',
                    'error': str(e)
                }
        
        return results


def main():
    """Hauptfunktion für die Ausführung als Skript"""
    import argparse
    
    parser = argparse.ArgumentParser(description='AutoScout24 Luxembourg Scraper mit intelligentem Seiten-Scraping')
    parser.add_argument('--make', default='mercedes-benz', help='Fahrzeugmarke')
    parser.add_argument('--model', default='a-200', help='Fahrzeugmodell')
    parser.add_argument('--pages', type=int, help='Maximale Anzahl Seiten (Standard: automatisch ermitteln)')
    parser.add_argument('--delay', type=int, default=2, help='Basis-Verzögerung zwischen Requests (Sekunden)')
    parser.add_argument('--data-dir', default='data', help='Datenverzeichnis')
    parser.add_argument('--csv-mode', action='store_true', help='Verwende CSV-Dateien statt Datenbank')
    parser.add_argument('--multi-model', help='CSV-Datei mit make,model Paaren für Multi-Scraping')
    parser.add_argument('--list-models', action='store_true', help='Zeige alle Fahrzeugmodelle in der Datenbank')
    parser.add_argument('--stats', action='store_true', help='Zeige Datenbankstatistiken')
    
    # Neue intelligente Scraping-Optionen
    parser.add_argument('--no-auto-stop', action='store_true', help='Deaktiviere automatisches Stoppen bei leeren Seiten')
    parser.add_argument('--no-adaptive-delay', action='store_true', help='Deaktiviere adaptive Verzögerung')
    parser.add_argument('--scrape-all', action='store_true', help='Scrape alle verfügbaren Seiten (automatische Erkennung)')
    
    args = parser.parse_args()
    
    # Liste alle Fahrzeugmodelle
    if args.list_models:
        scraper = AutoScout24LuxembourgScraper(
            make="dummy", model="dummy", data_dir=args.data_dir, use_database=not args.csv_mode
        )
        models = scraper.get_all_vehicle_models()
        
        print("\n📋 Verfügbare Fahrzeugmodelle in der Datenbank:")
        print("=" * 60)
        for make, model in models:
            print(f"🚗 {make} {model}")
        
        if not models:
            print("Keine Fahrzeugmodelle gefunden.")
        
        scraper.close_database()
        return
    
    # Zeige Statistiken
    if args.stats:
        scraper = AutoScout24LuxembourgScraper(
            make=args.make, model=args.model, data_dir=args.data_dir, use_database=not args.csv_mode
        )
        stats = scraper.get_statistics()
        
        print(f"\n📊 Statistiken für {args.make} {args.model}:")
        print("=" * 60)
        
        if stats:
            listings = stats.get('listings', {})
            print(f"📋 Listings:")
            print(f"  Gesamt: {listings.get('total_listings', 0)}")
            print(f"  Durchschnittspreis: €{listings.get('avg_price', 0):,.0f}")
            print(f"  Preisspanne: €{listings.get('min_price', 0):,.0f} - €{listings.get('max_price', 0):,.0f}")
            
            price_changes = stats.get('price_changes', {})
            print(f"\n💰 Preisänderungen:")
            print(f"  Gesamt: {price_changes.get('total_changes', 0)}")
            print(f"  Preissenkungen: {price_changes.get('price_drops', 0)}")
            print(f"  Preiserhöhungen: {price_changes.get('price_increases', 0)}")
            
            fuel_types = stats.get('fuel_types', {})
            if fuel_types:
                print(f"\n⛽ Kraftstoffarten:")
                for fuel, count in fuel_types.items():
                    print(f"  {fuel}: {count}")
        else:
            print("Keine Statistiken verfügbar.")
        
        scraper.close_database()
        return
    
    # Intelligente Scraping-Parameter
    max_pages = args.pages if args.pages else None
    stop_on_empty = not args.no_auto_stop
    adaptive_delay = not args.no_adaptive_delay
    
    if args.scrape_all:
        max_pages = None
        print("🔍 Automatische Seitenerkennung aktiviert - alle verfügbaren Seiten werden gescrapt")
    
    # Multi-Model Scraping
    if args.multi_model:
        try:
            import csv
            vehicle_models = []
            
            with open(args.multi_model, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    vehicle_models.append((row['make'], row['model']))
            
            print(f"\n🚗 Intelligentes Multi-Model Scraping für {len(vehicle_models)} Fahrzeugmodelle")
            
            results = AutoScout24LuxembourgScraper.scrape_multiple_models(
                vehicle_models=vehicle_models,
                max_pages=max_pages,
                delay=args.delay,
                data_dir=args.data_dir,
                stop_on_empty=stop_on_empty,
                adaptive_delay=adaptive_delay
            )
            
            # Zeige Zusammenfassung
            print(f"\n📊 ZUSAMMENFASSUNG")
            print("=" * 60)
            successful = 0
            failed = 0
            total_listings = 0
            
            for model_key, result in results.items():
                if result['status'] == 'success':
                    successful += 1
                    summary = result.get('summary', {})
                    listings_count = summary.get('total_listings', 0)
                    total_listings += listings_count
                    print(f"✅ {model_key}: {listings_count} Listings")
                else:
                    failed += 1
                    print(f"❌ {model_key}: {result.get('error', 'Unbekannter Fehler')}")
            
            print(f"\n🎯 Erfolgreich: {successful}, Fehlgeschlagen: {failed}")
            print(f"📊 Gesamte Listings: {total_listings}")
            
        except FileNotFoundError:
            print(f"❌ Multi-Model CSV-Datei nicht gefunden: {args.multi_model}")
        except Exception as e:
            print(f"❌ Fehler beim Multi-Model Scraping: {e}")
        
        return
    
    # Standard Single-Model Scraping
    scraper = AutoScout24LuxembourgScraper(
        make=args.make,
        model=args.model,
        data_dir=args.data_dir,
        use_database=not args.csv_mode
    )
    
    print(f"\n🚗 Intelligentes Scraping: {args.make} {args.model}")
    print("=" * 60)
    
    if args.csv_mode:
        print("📄 CSV-Modus aktiviert")
    else:
        print("🗄️  SQLite-Datenbank-Modus aktiviert")
    
    if max_pages:
        print(f"📄 Maximale Seiten: {max_pages}")
    else:
        print("🔍 Automatische Seitenerkennung aktiviert")
        
    print(f"⚙️  Stop-on-Empty: {stop_on_empty}, Adaptive-Delay: {adaptive_delay}")
    
    # Führe intelligentes Scraping durch
    scraper.run_daily_scrape(
        max_pages=max_pages, 
        delay=args.delay,
        stop_on_empty=stop_on_empty,
        adaptive_delay=adaptive_delay
    )
    
    # Zeige Preiszusammenfassung
    summary = scraper.get_price_summary()
    if summary:
        print("\n=== PREISZUSAMMENFASSUNG ===")
        print(f"Listings: {summary['total_listings']}")
        print(f"Durchschnittspreis: €{summary['avg_price']:,.0f}")
        print(f"Median: €{summary['median_price']:,.0f}")
        print(f"Preisspanne: €{summary['min_price']:,.0f} - €{summary['max_price']:,.0f}")
    
    # Zeige Statistiken
    stats = scraper.get_statistics()
    if stats and not args.csv_mode:
        price_changes = stats.get('price_changes', {})
        print(f"\n📈 Gesamte Preisänderungen in Datenbank: {price_changes.get('total_changes', 0)}")
    
    scraper.close_database()


if __name__ == "__main__":
    main()
