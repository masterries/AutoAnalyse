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


class AutoScout24LuxembourgScraper:
    """
    Hauptklasse für das Scraping von AutoScout24.lu mit Preisänderungs-Tracking
    """
    
    def __init__(self, make: str, model: str, sort: str = "standard", 
                 desc: int = 0, ustate: str = "N,U", atype: str = "C",
                 data_dir: str = "data"):
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
        """
        self.make = make
        self.model = model
        self.sort = sort
        self.desc = desc
        self.ustate = ustate
        self.atype = atype
        self.data_dir = Path(data_dir)
        
        # Verzeichnis erstellen falls nicht vorhanden
        self.data_dir.mkdir(exist_ok=True)
        
        # Logging setup
        self._setup_logging()
        
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
        
        # Dateinamen für CSV-Files
        self.csv_filename = self.data_dir / f"{make}_{model}_listings.csv"
        self.price_history_filename = self.data_dir / f"{make}_{model}_price_history.csv"
        self.metadata_filename = self.data_dir / f"{make}_{model}_metadata.json"
        
        # DataFrame für aktuelle Listings
        self.current_listings = pd.DataFrame()
        
        # DataFrame für Preishistorie
        self.price_history = pd.DataFrame()
        
        self.logger.info(f"Scraper initialisiert für {make} {model}")

    def _setup_logging(self):
        """Richtet das Logging ein"""
        log_dir = self.data_dir / "logs"
        log_dir.mkdir(exist_ok=True)
        
        log_filename = log_dir / f"scraper_{date.today().isoformat()}.log"
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_filename),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def generate_urls(self, num_pages: int) -> List[str]:
        """Generiert URLs für mehrere Seiten"""
        url_list = [
            self.base_url.format(
                self.make, self.model, self.sort, 
                self.desc, self.ustate, self.atype
            )
        ]
        
        for i in range(2, num_pages + 1):
            url_with_page = url_list[0] + f"&page={i}"
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

    def scrape_listings(self, num_pages: int = 1, delay: int = 1) -> pd.DataFrame:
        """
        Führt das Scraping durch und gibt DataFrame zurück
        
        Args:
            num_pages: Anzahl der zu scrapenden Seiten
            delay: Verzögerung zwischen Requests in Sekunden
            
        Returns:
            DataFrame mit den gescrapten Listings
        """
        url_list = self.generate_urls(num_pages)
        all_listings = []
        
        self.logger.info(f"Scraping {len(url_list)} Seiten...")
        
        for page_num, webpage in enumerate(url_list, 1):
            self.logger.info(f"Scraping Seite {page_num}/{len(url_list)}")
            
            try:
                # HTTP Request
                response = self.session.get(webpage, timeout=10)
                response.raise_for_status()
                
                # Parse HTML
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Finde alle article-Elemente
                articles = soup.find_all('article', class_='cldt-summary-full-item')
                
                self.logger.info(f"  Gefunden: {len(articles)} article-Elemente")
                
                listings_found = 0
                for article in articles:
                    listing_data = self.extract_listing_data(article)
                    
                    if listing_data and listing_data.get('title'):
                        all_listings.append(listing_data)
                        listings_found += 1
                
                self.logger.info(f"  Erfolgreich extrahiert: {listings_found} Listings")
                
                # Verzögerung zwischen Seiten
                if delay > 0 and page_num < len(url_list):
                    time.sleep(delay)
                    
            except requests.RequestException as e:
                self.logger.error(f"HTTP-Fehler beim Scraping der Seite {page_num}: {e}")
                continue
            except Exception as e:
                self.logger.error(f"Allgemeiner Fehler beim Scraping der Seite {page_num}: {e}")
                continue
        
        # Erstelle DataFrame
        if all_listings:
            self.current_listings = pd.DataFrame(all_listings)
            self.logger.info(f"Scraping abgeschlossen. Insgesamt {len(self.current_listings)} Listings gesammelt.")
        else:
            self.current_listings = pd.DataFrame()
            self.logger.warning("Keine Listings gefunden!")
        
        return self.current_listings

    def load_existing_data(self) -> tuple:
        """Lädt bestehende CSV-Daten"""
        existing_listings = pd.DataFrame()
        existing_price_history = pd.DataFrame()
        
        # Lade bestehende Listings
        if self.csv_filename.exists():
            try:
                existing_listings = pd.read_csv(self.csv_filename)
                self.logger.info(f"Bestehende Listings geladen: {len(existing_listings)} Einträge")
            except Exception as e:
                self.logger.error(f"Fehler beim Laden bestehender Listings: {e}")
        
        # Lade bestehende Preishistorie
        if self.price_history_filename.exists():
            try:
                existing_price_history = pd.read_csv(self.price_history_filename)
                self.logger.info(f"Preishistorie geladen: {len(existing_price_history)} Einträge")
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
        
        new_history_df = pd.DataFrame(price_changes)
        
        # Lade bestehende Preishistorie
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
        """Speichert alle Daten in CSV-Dateien"""
        timestamp = datetime.now()
        
        try:
            # Speichere aktuelle Listings
            if not self.current_listings.empty:
                self.current_listings.to_csv(self.csv_filename, index=False)
                self.logger.info(f"Aktuelle Listings gespeichert: {self.csv_filename}")
            
            # Speichere Preishistorie
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
                'scraper_version': '1.0'
            }
            
            with open(self.metadata_filename, 'w') as f:
                json.dump(metadata, f, indent=2)
                
            self.logger.info("Metadata gespeichert")
                
        except Exception as e:
            self.logger.error(f"Fehler beim Speichern: {e}")

    def run_daily_scrape(self, num_pages: int = 3, delay: int = 2):
        """
        Führt einen kompletten Scraping-Durchlauf durch mit Preisänderungs-Detection
        
        Args:
            num_pages: Anzahl der zu scrapenden Seiten
            delay: Verzögerung zwischen Requests
        """
        start_time = time.time()
        self.logger.info("=== TÄGLICHER SCRAPING-DURCHLAUF GESTARTET ===")
        
        try:
            # 1. Lade bestehende Daten
            existing_listings, existing_price_history = self.load_existing_data()
            
            # 2. Scrape aktuelle Listings
            current_listings = self.scrape_listings(num_pages=num_pages, delay=delay)
            
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
            
            # 7. Statistiken
            duration = time.time() - start_time
            self.logger.info(f"✅ Scraping abgeschlossen in {duration:.1f} Sekunden")
            self.logger.info(f"📊 Aktuelle Listings: {len(current_listings)}")
            self.logger.info(f"📈 Gesamte Preisänderungen: {len(self.price_history)}")
            
        except Exception as e:
            self.logger.error(f"❌ Fehler beim täglichen Scraping: {e}")
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


def main():
    """Hauptfunktion für die Ausführung als Skript"""
    import argparse
    
    parser = argparse.ArgumentParser(description='AutoScout24 Luxembourg Scraper')
    parser.add_argument('--make', default='mercedes-benz', help='Fahrzeugmarke')
    parser.add_argument('--model', default='a-200', help='Fahrzeugmodell')
    parser.add_argument('--pages', type=int, default=3, help='Anzahl Seiten zum Scrapen')
    parser.add_argument('--delay', type=int, default=2, help='Verzögerung zwischen Requests (Sekunden)')
    parser.add_argument('--data-dir', default='data', help='Datenverzeichnis')
    
    args = parser.parse_args()
    
    # Erstelle Scraper-Instanz
    scraper = AutoScout24LuxembourgScraper(
        make=args.make,
        model=args.model,
        data_dir=args.data_dir
    )
    
    # Führe tägliches Scraping durch
    scraper.run_daily_scrape(num_pages=args.pages, delay=args.delay)
    
    # Zeige Preiszusammenfassung
    summary = scraper.get_price_summary()
    if summary:
        print("\n=== PREISZUSAMMENFASSUNG ===")
        print(f"Listings: {summary['total_listings']}")
        print(f"Durchschnittspreis: €{summary['avg_price']:,.0f}")
        print(f"Median: €{summary['median_price']:,.0f}")
        print(f"Preisspanne: €{summary['min_price']:,.0f} - €{summary['max_price']:,.0f}")


if __name__ == "__main__":
    main()
