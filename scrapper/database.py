#!/usr/bin/env python3
"""
SQLite Database Manager für AutoScout24 Scraper
===============================================

Verwaltet die Datenbank-Operationen für das AutoScout24 Scraping-System.
Unterstützt mehrere Fahrzeugmodelle in einer einzigen Datenbank.

Author: AutoAnalyse Team
Date: 2025-07-04
"""

import sqlite3
import pandas as pd
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import logging
import json


class AutoScoutDatabase:
    """
    SQLite Datenbank-Manager für AutoScout24 Daten
    """
    
    def __init__(self, db_path: str = "data/autoscout_data.db"):
        """
        Initialisiert die Datenbankverbindung
        
        Args:
            db_path: Pfad zur SQLite-Datenbankdatei
        """
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(exist_ok=True)
        
        # Logger
        self.logger = logging.getLogger(__name__)
        
        # Datenbankverbindung
        self.connection = None
        
        # Initialisiere Datenbank
        self._init_database()
        
    def _init_database(self):
        """Erstellt die Datenbank-Tabellen falls sie nicht existieren"""
        try:
            self.connection = sqlite3.connect(str(self.db_path), check_same_thread=False)
            self.connection.row_factory = sqlite3.Row  # Ermöglicht Zugriff per Spaltenname
            
            cursor = self.connection.cursor()
            
            # Tabelle für Fahrzeug-Listings
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS listings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    listing_id TEXT NOT NULL,
                    make TEXT NOT NULL,
                    model TEXT NOT NULL,
                    title TEXT,
                    url TEXT,
                    price REAL,
                    mileage INTEGER,
                    fuel_type TEXT,
                    first_registration TEXT,
                    power TEXT,
                    transmission TEXT,
                    seller_type TEXT,
                    location TEXT,
                    scraped_date TEXT NOT NULL,
                    scraped_timestamp INTEGER NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(listing_id, make, model)
                )
            """)
            
            # Tabelle für Preishistorie
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS price_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    listing_id TEXT NOT NULL,
                    make TEXT NOT NULL,
                    model TEXT NOT NULL,
                    title TEXT,
                    price_old REAL NOT NULL,
                    price_new REAL NOT NULL,
                    price_difference REAL NOT NULL,
                    price_change_percent REAL NOT NULL,
                    change_type TEXT NOT NULL,
                    change_date TEXT NOT NULL,
                    change_timestamp INTEGER NOT NULL,
                    last_seen TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Tabelle für Scraping-Metadaten
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS scraping_metadata (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    make TEXT NOT NULL,
                    model TEXT NOT NULL,
                    last_scrape_date TEXT NOT NULL,
                    last_scrape_timestamp INTEGER NOT NULL,
                    total_listings INTEGER DEFAULT 0,
                    new_listings INTEGER DEFAULT 0,
                    price_changes INTEGER DEFAULT 0,
                    scraper_version TEXT,
                    status TEXT DEFAULT 'success',
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(make, model)
                )
            """)
            
            # Indices für bessere Performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_listings_make_model ON listings(make, model)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_listings_listing_id ON listings(listing_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_listings_scraped_date ON listings(scraped_date)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_price_history_listing_id ON price_history(listing_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_price_history_change_date ON price_history(change_date)")
            
            self.connection.commit()
            self.logger.info(f"Datenbank initialisiert: {self.db_path}")
            
        except sqlite3.Error as e:
            self.logger.error(f"Fehler beim Initialisieren der Datenbank: {e}")
            raise
    
    def close(self):
        """Schließt die Datenbankverbindung"""
        if self.connection:
            self.connection.close()
            self.logger.info("Datenbankverbindung geschlossen")
    
    def insert_listings(self, listings_data: List[Dict[str, Any]], make: str, model: str) -> int:
        """
        Fügt neue Listings in die Datenbank ein oder aktualisiert bestehende
        
        Args:
            listings_data: Liste der Listing-Daten
            make: Fahrzeugmarke
            model: Fahrzeugmodell
            
        Returns:
            Anzahl der eingefügten/aktualisierten Datensätze
        """
        if not listings_data:
            return 0
            
        cursor = self.connection.cursor()
        inserted_count = 0
        updated_count = 0
        
        try:
            for listing in listings_data:
                # Prüfe ob Listing bereits existiert
                cursor.execute("""
                    SELECT id, price, updated_at FROM listings 
                    WHERE listing_id = ? AND make = ? AND model = ?
                """, (listing['listing_id'], make, model))
                
                existing = cursor.fetchone()
                
                if existing:
                    # Update bestehender Eintrag
                    cursor.execute("""
                        UPDATE listings SET
                            title = ?, url = ?, price = ?, mileage = ?, fuel_type = ?,
                            first_registration = ?, power = ?, transmission = ?, seller_type = ?,
                            location = ?, scraped_date = ?, scraped_timestamp = ?,
                            is_active = 1, updated_at = CURRENT_TIMESTAMP
                        WHERE listing_id = ? AND make = ? AND model = ?
                    """, (
                        listing.get('title'),
                        listing.get('url'),
                        listing.get('price'),
                        listing.get('mileage'),
                        listing.get('fuel_type'),
                        listing.get('first_registration'),
                        listing.get('power'),
                        listing.get('transmission'),
                        listing.get('seller_type'),
                        listing.get('location'),
                        listing.get('scraped_date'),
                        listing.get('scraped_timestamp'),
                        listing['listing_id'],
                        make,
                        model
                    ))
                    updated_count += 1
                else:
                    # Neuer Eintrag
                    cursor.execute("""
                        INSERT INTO listings (
                            listing_id, make, model, title, url, price, mileage, fuel_type,
                            first_registration, power, transmission, seller_type, location,
                            scraped_date, scraped_timestamp
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        listing['listing_id'],
                        make,
                        model,
                        listing.get('title'),
                        listing.get('url'),
                        listing.get('price'),
                        listing.get('mileage'),
                        listing.get('fuel_type'),
                        listing.get('first_registration'),
                        listing.get('power'),
                        listing.get('transmission'),
                        listing.get('seller_type'),
                        listing.get('location'),
                        listing.get('scraped_date'),
                        listing.get('scraped_timestamp')
                    ))
                    inserted_count += 1
            
            self.connection.commit()
            total_count = inserted_count + updated_count
            
            self.logger.info(
                f"Listings gespeichert: {inserted_count} neu, {updated_count} aktualisiert "
                f"für {make} {model}"
            )
            
            return total_count
            
        except sqlite3.Error as e:
            self.connection.rollback()
            self.logger.error(f"Fehler beim Speichern der Listings: {e}")
            raise
    
    def get_existing_listings(self, make: str, model: str) -> pd.DataFrame:
        """
        Lädt bestehende Listings für ein Fahrzeugmodell
        
        Args:
            make: Fahrzeugmarke
            model: Fahrzeugmodell
            
        Returns:
            DataFrame mit bestehenden Listings
        """
        try:
            query = """
                SELECT * FROM listings 
                WHERE make = ? AND model = ? AND is_active = 1
                ORDER BY scraped_timestamp DESC
            """
            
            df = pd.read_sql_query(query, self.connection, params=(make, model))
            self.logger.info(f"Bestehende Listings geladen: {len(df)} für {make} {model}")
            
            return df
            
        except Exception as e:
            self.logger.error(f"Fehler beim Laden bestehender Listings: {e}")
            return pd.DataFrame()
    
    def insert_price_changes(self, price_changes: List[Dict[str, Any]], make: str, model: str) -> int:
        """
        Fügt Preisänderungen in die Datenbank ein
        
        Args:
            price_changes: Liste der Preisänderungen
            make: Fahrzeugmarke
            model: Fahrzeugmodell
            
        Returns:
            Anzahl der eingefügten Datensätze
        """
        if not price_changes:
            return 0
            
        cursor = self.connection.cursor()
        
        try:
            for change in price_changes:
                cursor.execute("""
                    INSERT INTO price_history (
                        listing_id, make, model, title, price_old, price_new, 
                        price_difference, price_change_percent, change_type,
                        change_date, change_timestamp, last_seen
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    change['listing_id'],
                    make,
                    model,
                    change.get('title'),
                    change['price_old'],
                    change['price_new'],
                    change['price_difference'],
                    change['price_change_percent'],
                    change['change_type'],
                    change['change_date'],
                    change['change_timestamp'],
                    change.get('last_seen')
                ))
            
            self.connection.commit()
            self.logger.info(f"Preisänderungen gespeichert: {len(price_changes)} für {make} {model}")
            
            return len(price_changes)
            
        except sqlite3.Error as e:
            self.connection.rollback()
            self.logger.error(f"Fehler beim Speichern der Preisänderungen: {e}")
            raise
    
    def get_price_history(self, make: str, model: str, limit: int = None) -> pd.DataFrame:
        """
        Lädt Preishistorie für ein Fahrzeugmodell
        
        Args:
            make: Fahrzeugmarke
            model: Fahrzeugmodell
            limit: Maximale Anzahl Datensätze (optional)
            
        Returns:
            DataFrame mit Preishistorie
        """
        try:
            query = """
                SELECT * FROM price_history 
                WHERE make = ? AND model = ?
                ORDER BY change_timestamp DESC
            """
            
            if limit:
                query += f" LIMIT {limit}"
            
            df = pd.read_sql_query(query, self.connection, params=(make, model))
            self.logger.info(f"Preishistorie geladen: {len(df)} Einträge für {make} {model}")
            
            return df
            
        except Exception as e:
            self.logger.error(f"Fehler beim Laden der Preishistorie: {e}")
            return pd.DataFrame()
    
    def update_metadata(self, make: str, model: str, total_listings: int, 
                       new_listings: int, price_changes: int, status: str = 'success',
                       error_message: str = None, scraper_version: str = '1.0'):
        """
        Aktualisiert Scraping-Metadaten
        
        Args:
            make: Fahrzeugmarke
            model: Fahrzeugmodell
            total_listings: Gesamtanzahl Listings
            new_listings: Anzahl neuer Listings
            price_changes: Anzahl Preisänderungen
            status: Status des Scraping-Durchlaufs
            error_message: Fehlermeldung (optional)
            scraper_version: Version des Scrapers
        """
        cursor = self.connection.cursor()
        
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO scraping_metadata (
                    make, model, last_scrape_date, last_scrape_timestamp,
                    total_listings, new_listings, price_changes,
                    scraper_version, status, error_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                make, model, datetime.now().isoformat(), int(datetime.now().timestamp()),
                total_listings, new_listings, price_changes,
                scraper_version, status, error_message
            ))
            
            self.connection.commit()
            self.logger.info(f"Metadaten aktualisiert für {make} {model}")
            
        except sqlite3.Error as e:
            self.logger.error(f"Fehler beim Aktualisieren der Metadaten: {e}")
            raise
    
    def get_all_vehicle_models(self) -> List[Tuple[str, str]]:
        """
        Gibt alle verfügbaren Fahrzeugmodelle zurück
        
        Returns:
            Liste von (make, model) Tupeln
        """
        try:
            cursor = self.connection.cursor()
            cursor.execute("SELECT DISTINCT make, model FROM listings ORDER BY make, model")
            
            models = cursor.fetchall()
            return [(row[0], row[1]) for row in models]
            
        except sqlite3.Error as e:
            self.logger.error(f"Fehler beim Laden der Fahrzeugmodelle: {e}")
            return []
    
    def get_statistics(self, make: str = None, model: str = None) -> Dict[str, Any]:
        """
        Erstellt Statistiken für ein oder alle Fahrzeugmodelle
        
        Args:
            make: Fahrzeugmarke (optional)
            model: Fahrzeugmodell (optional)
            
        Returns:
            Dictionary mit Statistiken
        """
        try:
            cursor = self.connection.cursor()
            
            # Base WHERE Klausel
            where_clause = "WHERE is_active = 1"
            params = []
            
            if make and model:
                where_clause += " AND make = ? AND model = ?"
                params.extend([make, model])
            elif make:
                where_clause += " AND make = ?"
                params.append(make)
            
            # Grundstatistiken
            cursor.execute(f"""
                SELECT 
                    COUNT(*) as total_listings,
                    AVG(price) as avg_price,
                    MIN(price) as min_price,
                    MAX(price) as max_price,
                    AVG(mileage) as avg_mileage
                FROM listings {where_clause} AND price IS NOT NULL
            """, params)
            
            stats = dict(cursor.fetchone())
            
            # Kraftstoffarten
            cursor.execute(f"""
                SELECT fuel_type, COUNT(*) as count
                FROM listings {where_clause} AND fuel_type IS NOT NULL
                GROUP BY fuel_type
                ORDER BY count DESC
            """, params)
            
            fuel_types = {row[0]: row[1] for row in cursor.fetchall()}
            
            # Verkäufertypen
            cursor.execute(f"""
                SELECT seller_type, COUNT(*) as count
                FROM listings {where_clause} AND seller_type IS NOT NULL
                GROUP BY seller_type
            """, params)
            
            seller_types = {row[0]: row[1] for row in cursor.fetchall()}
            
            # Preisänderungen
            price_history_where = "WHERE 1=1"
            if make and model:
                price_history_where += " AND make = ? AND model = ?"
            elif make:
                price_history_where += " AND make = ?"
            
            cursor.execute(f"""
                SELECT 
                    COUNT(*) as total_changes,
                    SUM(CASE WHEN price_difference < 0 THEN 1 ELSE 0 END) as price_drops,
                    SUM(CASE WHEN price_difference > 0 THEN 1 ELSE 0 END) as price_increases,
                    AVG(price_difference) as avg_change
                FROM price_history {price_history_where}
            """, params)
            
            price_stats = dict(cursor.fetchone())
            
            return {
                'listings': stats,
                'fuel_types': fuel_types,
                'seller_types': seller_types,
                'price_changes': price_stats,
                'generated_at': datetime.now().isoformat()
            }
            
        except sqlite3.Error as e:
            self.logger.error(f"Fehler beim Erstellen der Statistiken: {e}")
            return {}
    
    def mark_listings_inactive(self, make: str, model: str, current_listing_ids: List[str]):
        """
        Markiert Listings als inaktiv, die nicht mehr in der aktuellen Scraping-Session gefunden wurden
        
        Args:
            make: Fahrzeugmarke
            model: Fahrzeugmodell
            current_listing_ids: Liste der aktuell gefundenen Listing-IDs
        """
        try:
            cursor = self.connection.cursor()
            
            if current_listing_ids:
                placeholders = ','.join(['?' for _ in current_listing_ids])
                cursor.execute(f"""
                    UPDATE listings 
                    SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                    WHERE make = ? AND model = ? AND listing_id NOT IN ({placeholders})
                """, [make, model] + current_listing_ids)
            else:
                # Alle als inaktiv markieren falls keine aktuellen Listings gefunden
                cursor.execute("""
                    UPDATE listings 
                    SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                    WHERE make = ? AND model = ?
                """, (make, model))
            
            affected_rows = cursor.rowcount
            self.connection.commit()
            
            if affected_rows > 0:
                self.logger.info(f"{affected_rows} Listings als inaktiv markiert für {make} {model}")
                
        except sqlite3.Error as e:
            self.logger.error(f"Fehler beim Markieren inaktiver Listings: {e}")
            raise
    
    def export_to_csv(self, make: str, model: str, output_dir: str = "data"):
        """
        Exportiert Daten zu CSV-Dateien (für Kompatibilität mit Frontend)
        
        Args:
            make: Fahrzeugmarke
            model: Fahrzeugmodell
            output_dir: Ausgabeverzeichnis
        """
        try:
            output_path = Path(output_dir)
            output_path.mkdir(exist_ok=True)
            
            # Listings exportieren
            listings_df = self.get_existing_listings(make, model)
            if not listings_df.empty:
                csv_filename = output_path / f"{make}_{model}_listings.csv"
                listings_df.to_csv(csv_filename, index=False)
                self.logger.info(f"Listings exportiert: {csv_filename}")
            
            # Preishistorie exportieren
            price_history_df = self.get_price_history(make, model)
            if not price_history_df.empty:
                price_history_filename = output_path / f"{make}_{model}_price_history.csv"
                price_history_df.to_csv(price_history_filename, index=False)
                self.logger.info(f"Preishistorie exportiert: {price_history_filename}")
            
        except Exception as e:
            self.logger.error(f"Fehler beim CSV-Export: {e}")
            raise
