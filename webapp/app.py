#!/usr/bin/env python3
"""
AutoAnalyse - Fahrzeug-Analyse Web-Anwendung
============================================

Flask-Backend für die individuelle Analyse von Fahrzeugen aus AutoScout24 Daten.
Fokus auf Kilometerstand, Alter, Preis und Leistung.

Author: AutoAnalyse Team
Date: 2025-07-04
"""

from flask import Flask, render_template, jsonify, request
import sqlite3
import pandas as pd
import json
from datetime import datetime, timedelta
import re
from pathlib import Path
import statistics
from typing import Dict, List, Any, Optional, Tuple

app = Flask(__name__)

# Datenbank-Pfad
DB_PATH = Path("../scrapper/data/autoscout_data.db")

class VehicleAnalyzer:
    """Klasse für die Fahrzeuganalyse"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
    
    def get_connection(self):
        """Erstellt eine Datenbankverbindung"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def parse_power(self, power_str: str) -> Tuple[Optional[int], Optional[int]]:
        """
        Parst die Leistungsangabe (z.B. '120 kW (163 PS)')
        
        Returns:
            Tuple mit (kW, PS) oder (None, None) bei Parsing-Fehlern
        """
        if not power_str:
            return None, None
        
        try:
            # Regex für "120 kW (163 PS)" Format
            match = re.search(r'(\d+)\s*kW\s*\((\d+)\s*PS\)', power_str)
            if match:
                kw = int(match.group(1))
                ps = int(match.group(2))
                return kw, ps
        except:
            pass
        
        return None, None
    
    def calculate_age(self, first_registration: str) -> Optional[float]:
        """
        Berechnet das Alter in Jahren basierend auf der Erstzulassung
        
        Args:
            first_registration: Datum im Format "MM-YYYY"
            
        Returns:
            Alter in Jahren oder None bei Parsing-Fehlern
        """
        if not first_registration:
            return None
        
        try:
            # Parse "MM-YYYY" Format
            month, year = first_registration.split('-')
            reg_date = datetime(int(year), int(month), 1)
            age_years = (datetime.now() - reg_date).days / 365.25
            return round(age_years, 1)
        except:
            return None
    
    def get_all_makes_models(self) -> List[Dict[str, Any]]:
        """Holt alle verfügbaren Marken und Modelle"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT make, model, COUNT(*) as count
                FROM listings 
                WHERE is_active = 1 
                GROUP BY make, model 
                ORDER BY make, model
            """)
            
            results = []
            for row in cursor.fetchall():
                results.append({
                    'make': row['make'],
                    'model': row['model'],
                    'count': row['count']
                })
            
            return results
    
    def get_vehicles_by_make_model(self, make: str, model: str) -> List[Dict[str, Any]]:
        """Holt alle Fahrzeuge für eine bestimmte Marke und Modell"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM listings 
                WHERE make = ? AND model = ? AND is_active = 1
                ORDER BY price ASC
            """, (make, model))
            
            vehicles = []
            for row in cursor.fetchall():
                kw, ps = self.parse_power(row['power'])
                age = self.calculate_age(row['first_registration'])
                
                vehicle = {
                    'id': row['id'],
                    'listing_id': row['listing_id'],
                    'title': row['title'],
                    'price': row['price'],
                    'mileage': row['mileage'],
                    'age': age,
                    'fuel_type': row['fuel_type'],
                    'first_registration': row['first_registration'],
                    'power_kw': kw,
                    'power_ps': ps,
                    'power_display': row['power'],
                    'transmission': row['transmission'],
                    'seller_type': row['seller_type'],
                    'location': row['location'],
                    'url': row['url']
                }
                
                vehicles.append(vehicle)
            
            return vehicles
    
    def get_market_analysis(self, make: str, model: str) -> Dict[str, Any]:
        """Erstellt eine Marktanalyse für ein bestimmtes Fahrzeugmodell"""
        vehicles = self.get_vehicles_by_make_model(make, model)
        
        if not vehicles:
            return {}
        
        # Filter nur Fahrzeuge mit vollständigen Daten
        complete_vehicles = [
            v for v in vehicles 
            if v['price'] and v['mileage'] and v['age'] and v['power_ps']
        ]
        
        if not complete_vehicles:
            return {}
        
        prices = [v['price'] for v in complete_vehicles]
        mileages = [v['mileage'] for v in complete_vehicles]
        ages = [v['age'] for v in complete_vehicles]
        powers = [v['power_ps'] for v in complete_vehicles]
        
        analysis = {
            'total_vehicles': len(complete_vehicles),
            'price_stats': {
                'min': min(prices),
                'max': max(prices),
                'median': statistics.median(prices),
                'mean': round(statistics.mean(prices), 2)
            },
            'mileage_stats': {
                'min': min(mileages),
                'max': max(mileages),
                'median': statistics.median(mileages),
                'mean': round(statistics.mean(mileages))
            },
            'age_stats': {
                'min': min(ages),
                'max': max(ages),
                'median': round(statistics.median(ages), 1),
                'mean': round(statistics.mean(ages), 1)
            },
            'power_stats': {
                'min': min(powers),
                'max': max(powers),
                'median': statistics.median(powers),
                'mean': round(statistics.mean(powers))
            }
        }
        
        return analysis
    
    def get_vehicle_score(self, vehicle: Dict[str, Any], market_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Berechnet einen Score für ein Fahrzeug basierend auf Marktvergleich
        
        Score-Faktoren:
        - Preis vs. Marktdurchschnitt (niedriger = besser)
        - Kilometerstand vs. Marktdurchschnitt (niedriger = besser)  
        - Alter vs. Marktdurchschnitt (niedriger = besser)
        - Leistung vs. Marktdurchschnitt (höher = besser)
        """
        if not market_analysis or not vehicle.get('price') or not vehicle.get('mileage') or not vehicle.get('age') or not vehicle.get('power_ps'):
            return {'total_score': 0, 'breakdown': {}}
        
        # Normalisierte Scores (0-100)
        price_score = max(0, 100 - ((vehicle['price'] - market_analysis['price_stats']['median']) / market_analysis['price_stats']['median'] * 100))
        mileage_score = max(0, 100 - ((vehicle['mileage'] - market_analysis['mileage_stats']['median']) / market_analysis['mileage_stats']['median'] * 100))
        age_score = max(0, 100 - ((vehicle['age'] - market_analysis['age_stats']['median']) / market_analysis['age_stats']['median'] * 100))
        power_score = min(100, 50 + ((vehicle['power_ps'] - market_analysis['power_stats']['median']) / market_analysis['power_stats']['median'] * 50))
        
        # Gewichteter Gesamtscore
        total_score = (price_score * 0.35 + mileage_score * 0.25 + age_score * 0.25 + power_score * 0.15)
        
        return {
            'total_score': round(total_score, 1),
            'breakdown': {
                'price_score': round(price_score, 1),
                'mileage_score': round(mileage_score, 1),
                'age_score': round(age_score, 1),
                'power_score': round(power_score, 1)
            }
        }

# Globale Analyzer-Instanz
analyzer = VehicleAnalyzer(DB_PATH)

@app.route('/')
def index():
    """Hauptseite"""
    return render_template('index.html')

@app.route('/api/makes-models')
def api_makes_models():
    """API-Endpunkt für alle verfügbaren Marken und Modelle"""
    try:
        makes_models = analyzer.get_all_makes_models()
        return jsonify(makes_models)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/vehicles/<make>/<model>')
def api_vehicles(make, model):
    """API-Endpunkt für Fahrzeuge einer bestimmten Marke/Modell"""
    try:
        vehicles = analyzer.get_vehicles_by_make_model(make, model)
        market_analysis = analyzer.get_market_analysis(make, model)
        
        # Füge Scores zu den Fahrzeugen hinzu
        for vehicle in vehicles:
            vehicle['score'] = analyzer.get_vehicle_score(vehicle, market_analysis)
        
        # Sortiere nach Score (beste zuerst)
        vehicles.sort(key=lambda x: x['score']['total_score'], reverse=True)
        
        return jsonify({
            'vehicles': vehicles,
            'market_analysis': market_analysis
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analysis/<make>/<model>')
def api_analysis(make, model):
    """API-Endpunkt für detaillierte Marktanalyse"""
    try:
        market_analysis = analyzer.get_market_analysis(make, model)
        return jsonify(market_analysis)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
