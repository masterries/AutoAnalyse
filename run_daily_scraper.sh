#!/bin/bash
"""
Daily AutoScout24 Scraper Runner
================================

Dieses Skript kann als Cron-Job eingerichtet werden für tägliche Ausführung.

Beispiel Cron-Job (jeden Tag um 8:00 Uhr):
0 8 * * * /path/to/run_daily_scraper.sh

"""

# Aktiviere virtuelle Umgebung falls vorhanden
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

# Führe Scraper aus
python3 autoscout_luxembourg_scraper.py \
    --make mercedes-benz \
    --model a-200 \
    --pages 5 \
    --delay 2 \
    --data-dir data

# Optional: Weitere Fahrzeugmodelle
python3 autoscout_luxembourg_scraper.py \
    --make bmw \
    --model 3-series \
    --pages 3 \
    --delay 2 \
    --data-dir data

python3 autoscout_luxembourg_scraper.py \
    --make audi \
    --model a4 \
    --pages 3 \
    --delay 2 \
    --data-dir data
