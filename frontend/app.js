// ===== Global Variables =====
let db = null;
let allListings = [];
let allModels = [];
let priceHistory = [];

// ===== Database Loading =====
async function loadDatabase() {
    try {
        updateStatus('loading', 'Lade Datenbank von GitHub...');
        
        // Initialize SQL.js
        const SQL = await initSqlJs({
            locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/${file}`
        });
        
        // Try multiple database sources
        const dbUrls = [
            // Direct GitHub raw URL (primary)
            'https://raw.githubusercontent.com/masterries/AutoAnalyse/main/scrapper/data/autoscout_data.db',
            // Local file for development (if running locally)
            './autoscout_data.db',
            // jsDelivr CDN as fallback
            'https://cdn.jsdelivr.net/gh/masterries/AutoAnalyse@main/scrapper/data/autoscout_data.db',
            // CORS proxy as last resort
            'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://github.com/masterries/AutoAnalyse/raw/refs/heads/main/scrapper/data/autoscout_data.db')
        ];
        
        let buffer = null;
        let successUrl = null;
        
        for (const url of dbUrls) {
            try {
                const urlDescription = url.includes('allorigins.win') ? 'CORS Proxy' : 
                                     url.includes('jsdelivr') ? 'jsDelivr CDN' : 
                                     url.includes('./') ? 'Lokale Datei' :
                                     'GitHub Raw';
                                     
                updateStatus('loading', `Versuche Datenbank zu laden von: ${urlDescription}`);
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/octet-stream',
                        'Cache-Control': 'no-cache'
                    },
                    mode: 'cors'
                });
                
                if (response.ok) {
                    buffer = await response.arrayBuffer();
                    successUrl = url;
                    break;
                }
                
            } catch (error) {
                console.warn(`Fehler beim Laden von ${url}:`, error);
                continue;
            }
        }
        
        if (!buffer) {
            throw new Error('Datenbank konnte von keiner URL geladen werden. Überprüfe die Netzwerkverbindung und versuche es später erneut.');
        }
        
        db = new SQL.Database(new Uint8Array(buffer));
        
        updateStatus('success', `Datenbank erfolgreich geladen! (${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);
        
        // Load data
        await loadData();
        
        // Initialize UI
        initializeUI();
        
    } catch (error) {
        console.error('Fehler beim Laden der Datenbank:', error);
        
        // Show detailed error message with troubleshooting tips
        const errorMessage = `
            <div style="text-align: left; max-width: 500px; margin: 0 auto;">
                <strong>Fehler beim Laden der Datenbank:</strong><br>
                ${error.message}<br><br>
                
                <strong>Mögliche Lösungen:</strong><br>
                • Aktualisiere die Seite (F5)<br>
                • Überprüfe deine Internetverbindung<br>
                • Deaktiviere Adblocker temporär<br>
                • Verwende einen anderen Browser<br>
                • Warte einige Minuten und versuche es erneut
            </div>
        `;
        
        updateStatus('error', errorMessage);
    }
}

// ===== Data Loading Functions =====
async function loadData() {
    try {
        // Load listings
        const listingsResult = db.exec(`
            SELECT l.*, m.make, m.model 
            FROM listings l 
            JOIN scraping_metadata m ON l.make = m.make AND l.model = m.model 
            WHERE l.is_active = 1
        `);
        
        if (listingsResult.length > 0) {
            allListings = listingsResult[0].values.map(row => {
                const columns = listingsResult[0].columns;
                const obj = {};
                columns.forEach((col, index) => {
                    obj[col] = row[index];
                });
                return obj;
            });
        }
        
        // Load metadata for models
        const modelsResult = db.exec(`
            SELECT make, model, total_listings, last_scrape_date,
                   new_listings, price_changes, status
            FROM scraping_metadata 
            ORDER BY make, model
        `);
        
        if (modelsResult.length > 0) {
            allModels = modelsResult[0].values.map(row => {
                const columns = modelsResult[0].columns;
                const obj = {};
                columns.forEach((col, index) => {
                    obj[col] = row[index];
                });
                return obj;
            });
        }
        
        // Load price history
        const priceHistoryResult = db.exec(`
            SELECT * FROM price_history 
            ORDER BY change_date DESC 
            LIMIT 1000
        `);
        
        if (priceHistoryResult.length > 0) {
            priceHistory = priceHistoryResult[0].values.map(row => {
                const columns = priceHistoryResult[0].columns;
                const obj = {};
                columns.forEach((col, index) => {
                    obj[col] = row[index];
                });
                return obj;
            });
        }
        
        console.log(`Geladen: ${allListings.length} Listings, ${allModels.length} Modelle, ${priceHistory.length} Preisänderungen`);
        
    } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
        throw error;
    }
}

// ===== UI Initialization =====
function initializeUI() {
    updateOverviewStats();
    createOverviewCharts();
    populateModelsTab();
    populatePricesTab();
    populateTrendsTab();
    populateAnalysisTab();
    populateSearchFilters();
}

// ===== Status Updates =====
function updateStatus(type, message) {
    const statusElement = document.getElementById('status');
    statusElement.className = `status ${type}`;
    
    let icon;
    switch (type) {
        case 'loading':
            icon = '<i class="fas fa-spinner fa-spin"></i>';
            break;
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-circle"></i>';
            break;
        default:
            icon = '<i class="fas fa-info-circle"></i>';
    }
    
    // Support for HTML content in error messages
    if (type === 'error' && message.includes('<div')) {
        statusElement.innerHTML = `${icon} ${message}`;
    } else {
        statusElement.innerHTML = `${icon} ${message}`;
    }
}

// ===== Tab Management =====
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
}

// ===== Overview Functions =====
function updateOverviewStats() {
    const totalListings = allListings.length;
    const totalModels = allModels.length;
    
    // Calculate average price
    const prices = allListings
        .map(listing => parseFloat(listing.price))
        .filter(price => !isNaN(price) && price > 0);
    
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    
    // Get last update
    const lastUpdate = allModels.length > 0 
        ? new Date(Math.max(...allModels.map(m => new Date(m.last_scrape_date || 0))))
        : new Date();
    
    // Update UI
    document.getElementById('total-listings').textContent = totalListings.toLocaleString('de-DE');
    document.getElementById('total-models').textContent = totalModels;
    document.getElementById('avg-price').textContent = `€${Math.round(avgPrice).toLocaleString('de-DE')}`;
    document.getElementById('last-update').textContent = lastUpdate.toLocaleDateString('de-DE');
}

function createOverviewCharts() {
    createPriceDistributionChart();
    createFuelTypesChart();
    createSellerTypesChart();
    createListingsPerModelChart();
}

function createPriceDistributionChart() {
    const ctx = document.getElementById('priceDistributionChart').getContext('2d');
    
    // Group by model and calculate average prices
    const modelPrices = {};
    allListings.forEach(listing => {
        const key = `${listing.make} ${listing.model}`;
        const price = parseFloat(listing.price);
        
        if (!isNaN(price) && price > 0) {
            if (!modelPrices[key]) {
                modelPrices[key] = [];
            }
            modelPrices[key].push(price);
        }
    });
    
    const labels = Object.keys(modelPrices);
    const data = labels.map(model => {
        const prices = modelPrices[model];
        return prices.reduce((a, b) => a + b, 0) / prices.length;
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Durchschnittspreis (€)',
                data: data,
                backgroundColor: 'rgba(37, 99, 235, 0.8)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '€' + value.toLocaleString('de-DE');
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Ø €' + Math.round(context.parsed.y).toLocaleString('de-DE');
                        }
                    }
                }
            }
        }
    });
}

function createFuelTypesChart() {
    const ctx = document.getElementById('fuelTypesChart').getContext('2d');
    
    const fuelTypes = {};
    allListings.forEach(listing => {
        const fuel = listing.fuel_type || 'Unbekannt';
        fuelTypes[fuel] = (fuelTypes[fuel] || 0) + 1;
    });
    
    const colors = [
        '#2563eb', '#dc2626', '#059669', '#d97706', 
        '#7c3aed', '#db2777', '#0891b2', '#65a30d'
    ];
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(fuelTypes),
            datasets: [{
                data: Object.values(fuelTypes),
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createSellerTypesChart() {
    const ctx = document.getElementById('sellerTypesChart').getContext('2d');
    
    const sellerTypes = {};
    allListings.forEach(listing => {
        const seller = listing.seller_type || 'Unbekannt';
        sellerTypes[seller] = (sellerTypes[seller] || 0) + 1;
    });
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(sellerTypes),
            datasets: [{
                data: Object.values(sellerTypes),
                backgroundColor: ['#2563eb', '#dc2626', '#059669', '#d97706'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createListingsPerModelChart() {
    const ctx = document.getElementById('listingsPerModelChart').getContext('2d');
    
    const modelCounts = {};
    allListings.forEach(listing => {
        const key = `${listing.make} ${listing.model}`;
        modelCounts[key] = (modelCounts[key] || 0) + 1;
    });
    
    const sortedModels = Object.entries(modelCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedModels.map(([model]) => model),
            datasets: [{
                label: 'Anzahl Listings',
                data: sortedModels.map(([, count]) => count),
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true
                }
            }
        }
    });
}

// ===== Models Tab =====
function populateModelsTab() {
    const modelsGrid = document.getElementById('models-grid');
    
    allModels.forEach(model => {
        const modelListings = allListings.filter(l => 
            l.make === model.make && l.model === model.model
        );
        
        const prices = modelListings
            .map(l => parseFloat(l.price))
            .filter(p => !isNaN(p) && p > 0);
        
        const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
        
        const modelCard = document.createElement('div');
        modelCard.className = 'model-card';
        modelCard.innerHTML = `
            <div class="model-header">
                <h3>${model.make} ${model.model}</h3>
                <p>Letztes Update: ${new Date(model.last_scrape_date || 0).toLocaleDateString('de-DE')}</p>
            </div>
            <div class="model-body">
                <div class="model-stats">
                    <div class="model-stat">
                        <div class="value">${modelListings.length}</div>
                        <div class="label">Listings</div>
                    </div>
                    <div class="model-stat">
                        <div class="value">€${Math.round(avgPrice).toLocaleString('de-DE')}</div>
                        <div class="label">Ø Preis</div>
                    </div>
                    <div class="model-stat">
                        <div class="value">€${minPrice.toLocaleString('de-DE')}</div>
                        <div class="label">Min. Preis</div>
                    </div>
                    <div class="model-stat">
                        <div class="value">€${maxPrice.toLocaleString('de-DE')}</div>
                        <div class="label">Max. Preis</div>
                    </div>
                </div>
            </div>
        `;
        
        modelsGrid.appendChild(modelCard);
    });
}

// ===== Prices Tab =====
function populatePricesTab() {
    createPriceStats();
    createPriceHistogram();
    createCheapestListingsTable();
}

function createPriceStats() {
    const prices = allListings
        .map(l => parseFloat(l.price))
        .filter(p => !isNaN(p) && p > 0);
    
    if (prices.length === 0) return;
    
    prices.sort((a, b) => a - b);
    
    const stats = {
        'Durchschnittspreis': '€' + Math.round(prices.reduce((a, b) => a + b, 0) / prices.length).toLocaleString('de-DE'),
        'Median': '€' + Math.round(prices[Math.floor(prices.length / 2)]).toLocaleString('de-DE'),
        'Günstigstes Angebot': '€' + Math.round(prices[0]).toLocaleString('de-DE'),
        'Teuerstes Angebot': '€' + Math.round(prices[prices.length - 1]).toLocaleString('de-DE'),
        'Preisspanne': '€' + Math.round(prices[prices.length - 1] - prices[0]).toLocaleString('de-DE')
    };
    
    const statsContent = document.getElementById('price-stats-content');
    statsContent.innerHTML = Object.entries(stats)
        .map(([label, value]) => `
            <div class="price-stat-item">
                <span>${label}</span>
                <span class="font-bold">${value}</span>
            </div>
        `).join('');
}

function createPriceHistogram() {
    const ctx = document.getElementById('priceHistogramChart').getContext('2d');
    
    const prices = allListings
        .map(l => parseFloat(l.price))
        .filter(p => !isNaN(p) && p > 0);
    
    // Create price ranges
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    const binSize = range / 20;
    
    const bins = Array(20).fill(0);
    const labels = [];
    
    for (let i = 0; i < 20; i++) {
        const start = min + (i * binSize);
        const end = start + binSize;
        labels.push(`€${Math.round(start/1000)}k-${Math.round(end/1000)}k`);
        
        prices.forEach(price => {
            if (price >= start && price < end) {
                bins[i]++;
            }
        });
    }
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Anzahl Fahrzeuge',
                data: bins,
                backgroundColor: 'rgba(37, 99, 235, 0.8)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createCheapestListingsTable() {
    const cheapestListings = allListings
        .filter(l => l.price && !isNaN(parseFloat(l.price)))
        .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
        .slice(0, 10);
    
    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Fahrzeug</th>
                    <th>Preis</th>
                    <th>Kilometerstand</th>
                    <th>Kraftstoff</th>
                    <th>Verkäufer</th>
                </tr>
            </thead>
            <tbody>
                ${cheapestListings.map(listing => `
                    <tr>
                        <td>
                            <strong>${listing.make} ${listing.model}</strong><br>
                            <small>${(listing.title || '').substring(0, 50)}...</small>
                        </td>
                        <td class="price-cell">€${parseInt(listing.price).toLocaleString('de-DE')}</td>
                        <td>${listing.mileage ? parseInt(listing.mileage).toLocaleString('de-DE') + ' km' : '-'}</td>
                        <td>${listing.fuel_type || '-'}</td>
                        <td>${listing.seller_type || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    document.getElementById('cheapest-listings-table').innerHTML = tableHTML;
}

// ===== Trends Tab =====
function populateTrendsTab() {
    createPriceChangesChart();
    createRecentChangesTable();
}

function createPriceChangesChart() {
    const ctx = document.getElementById('priceChangesChart').getContext('2d');
    
    // Group price changes by date
    const changesByDate = {};
    priceHistory.forEach(change => {
        const date = new Date(change.change_date).toLocaleDateString('de-DE');
        if (!changesByDate[date]) {
            changesByDate[date] = { increases: 0, decreases: 0 };
        }
        
        if (parseFloat(change.price_difference) > 0) {
            changesByDate[date].increases++;
        } else {
            changesByDate[date].decreases++;
        }
    });
    
    const dates = Object.keys(changesByDate).sort();
    const increases = dates.map(date => changesByDate[date].increases);
    const decreases = dates.map(date => changesByDate[date].decreases);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Preiserhöhungen',
                    data: increases,
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true
                },
                {
                    label: 'Preissenkungen',
                    data: decreases,
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createRecentChangesTable() {
    const recentChanges = priceHistory
        .sort((a, b) => new Date(b.change_date) - new Date(a.change_date))
        .slice(0, 20);
    
    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Datum</th>
                    <th>Fahrzeug</th>
                    <th>Alter Preis</th>
                    <th>Neuer Preis</th>
                    <th>Änderung</th>
                </tr>
            </thead>
            <tbody>
                ${recentChanges.map(change => {
                    const diff = parseFloat(change.price_difference);
                    const diffClass = diff > 0 ? 'price-change-positive' : 'price-change-negative';
                    const diffIcon = diff > 0 ? '↗' : '↘';
                    
                    return `
                        <tr>
                            <td>${new Date(change.change_date).toLocaleDateString('de-DE')}</td>
                            <td>
                                <strong>${change.make} ${change.model}</strong><br>
                                <small>${(change.title || '').substring(0, 40)}...</small>
                            </td>
                            <td>€${parseInt(change.price_old).toLocaleString('de-DE')}</td>
                            <td>€${parseInt(change.price_new).toLocaleString('de-DE')}</td>
                            <td class="${diffClass}">
                                ${diffIcon} €${Math.abs(diff).toLocaleString('de-DE')}
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    document.getElementById('recent-changes-table').innerHTML = tableHTML;
}

// ===== Analysis Tab =====
function populateAnalysisTab() {
    createAgeVsMileageChart();
    createPriceVsAgeChart();
    createPriceVsMileageChart();
    createDealerVsPrivateAnalysis();
    createAgeDistributionChart();
    createMileageDistributionChart();
    createDepreciationAnalysis();
}

function createAgeVsMileageChart() {
    const ctx = document.getElementById('ageVsMileageChart').getContext('2d');
    
    // Prepare data for scatter plot
    const scatterData = allListings
        .filter(listing => {
            const year = parseInt(listing.first_registration);
            const mileage = parseInt(listing.mileage);
            const price = parseFloat(listing.price);
            return year && mileage && price && year > 1990 && year <= new Date().getFullYear();
        })
        .map(listing => {
            const year = parseInt(listing.first_registration);
            const age = new Date().getFullYear() - year;
            const mileage = parseInt(listing.mileage);
            const price = parseFloat(listing.price);
            
            return {
                x: age,
                y: mileage,
                price: price,
                model: `${listing.make} ${listing.model}`,
                year: year
            };
        });
    
    // Color by price ranges
    const prices = scatterData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    const datasets = [{
        label: 'Fahrzeuge',
        data: scatterData,
        backgroundColor: scatterData.map(d => {
            const ratio = (d.price - minPrice) / (maxPrice - minPrice);
            if (ratio < 0.33) return 'rgba(16, 185, 129, 0.6)'; // Grün für günstig
            if (ratio < 0.66) return 'rgba(245, 158, 11, 0.6)'; // Orange für mittel
            return 'rgba(239, 68, 68, 0.6)'; // Rot für teuer
        }),
        borderColor: scatterData.map(d => {
            const ratio = (d.price - minPrice) / (maxPrice - minPrice);
            if (ratio < 0.33) return 'rgba(16, 185, 129, 1)';
            if (ratio < 0.66) return 'rgba(245, 158, 11, 1)';
            return 'rgba(239, 68, 68, 1)';
        }),
        borderWidth: 1,
        pointRadius: 4
    }];
    
    new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Alter (Jahre)'
                    },
                    beginAtZero: true
                },
                y: {
                    title: {
                        display: true,
                        text: 'Kilometerstand'
                    },
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return (value / 1000).toFixed(0) + 'k km';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            return [
                                `${point.model}`,
                                `Baujahr: ${point.year}`,
                                `Alter: ${point.x} Jahre`,
                                `Kilometerstand: ${point.y.toLocaleString('de-DE')} km`,
                                `Preis: €${point.price.toLocaleString('de-DE')}`
                            ];
                        }
                    }
                },
                legend: {
                    display: false
                }
            }
        }
    });
}

function createPriceVsAgeChart() {
    const ctx = document.getElementById('priceVsAgeChart').getContext('2d');
    
    const scatterData = allListings
        .filter(listing => {
            const year = parseInt(listing.first_registration);
            const price = parseFloat(listing.price);
            return year && price && year > 1990 && year <= new Date().getFullYear();
        })
        .map(listing => {
            const year = parseInt(listing.first_registration);
            const age = new Date().getFullYear() - year;
            const price = parseFloat(listing.price);
            
            return {
                x: age,
                y: price,
                model: `${listing.make} ${listing.model}`
            };
        });
    
    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Preis nach Alter',
                data: scatterData,
                backgroundColor: 'rgba(37, 99, 235, 0.6)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 1,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Alter (Jahre)'
                    },
                    beginAtZero: true
                },
                y: {
                    title: {
                        display: true,
                        text: 'Preis (€)'
                    },
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '€' + (value / 1000).toFixed(0) + 'k';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            return [
                                `${point.model}`,
                                `Alter: ${point.x} Jahre`,
                                `Preis: €${point.y.toLocaleString('de-DE')}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

function createPriceVsMileageChart() {
    const ctx = document.getElementById('priceVsMileageChart').getContext('2d');
    
    const scatterData = allListings
        .filter(listing => {
            const mileage = parseInt(listing.mileage);
            const price = parseFloat(listing.price);
            return mileage && price && mileage > 0;
        })
        .map(listing => {
            const mileage = parseInt(listing.mileage);
            const price = parseFloat(listing.price);
            
            return {
                x: mileage,
                y: price,
                model: `${listing.make} ${listing.model}`
            };
        });
    
    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Preis nach Kilometerstand',
                data: scatterData,
                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 1,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Kilometerstand'
                    },
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return (value / 1000).toFixed(0) + 'k km';
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Preis (€)'
                    },
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '€' + (value / 1000).toFixed(0) + 'k';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            return [
                                `${point.model}`,
                                `Kilometerstand: ${point.x.toLocaleString('de-DE')} km`,
                                `Preis: €${point.y.toLocaleString('de-DE')}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

function createDealerVsPrivateAnalysis() {
    // Separate dealer and private listings
    const dealerListings = allListings.filter(l => l.seller_type === 'Händler');
    const privateListings = allListings.filter(l => l.seller_type === 'Privat');
    
    // Calculate statistics for dealers
    const dealerPrices = dealerListings.map(l => parseFloat(l.price)).filter(p => !isNaN(p) && p > 0);
    const dealerMileages = dealerListings.map(l => parseInt(l.mileage)).filter(m => !isNaN(m) && m > 0);
    
    const dealerStats = {
        count: dealerListings.length,
        avgPrice: dealerPrices.length > 0 ? dealerPrices.reduce((a, b) => a + b, 0) / dealerPrices.length : 0,
        medianPrice: dealerPrices.length > 0 ? dealerPrices.sort((a, b) => a - b)[Math.floor(dealerPrices.length / 2)] : 0,
        avgMileage: dealerMileages.length > 0 ? dealerMileages.reduce((a, b) => a + b, 0) / dealerMileages.length : 0,
        minPrice: dealerPrices.length > 0 ? Math.min(...dealerPrices) : 0,
        maxPrice: dealerPrices.length > 0 ? Math.max(...dealerPrices) : 0
    };
    
    // Calculate statistics for private sellers
    const privatePrices = privateListings.map(l => parseFloat(l.price)).filter(p => !isNaN(p) && p > 0);
    const privateMileages = privateListings.map(l => parseInt(l.mileage)).filter(m => !isNaN(m) && m > 0);
    
    const privateStats = {
        count: privateListings.length,
        avgPrice: privatePrices.length > 0 ? privatePrices.reduce((a, b) => a + b, 0) / privatePrices.length : 0,
        medianPrice: privatePrices.length > 0 ? privatePrices.sort((a, b) => a - b)[Math.floor(privatePrices.length / 2)] : 0,
        avgMileage: privateMileages.length > 0 ? privateMileages.reduce((a, b) => a + b, 0) / privateMileages.length : 0,
        minPrice: privatePrices.length > 0 ? Math.min(...privatePrices) : 0,
        maxPrice: privatePrices.length > 0 ? Math.max(...privatePrices) : 0
    };
    
    // Update dealer stats UI
    document.getElementById('dealer-stats').innerHTML = `
        <div class="dealer-stat-item">
            <span class="dealer-stat-label">Anzahl Listings</span>
            <span class="dealer-stat-value">${dealerStats.count.toLocaleString('de-DE')}</span>
        </div>
        <div class="dealer-stat-item">
            <span class="dealer-stat-label">Ø Preis</span>
            <span class="dealer-stat-value">€${Math.round(dealerStats.avgPrice).toLocaleString('de-DE')}</span>
        </div>
        <div class="dealer-stat-item">
            <span class="dealer-stat-label">Median Preis</span>
            <span class="dealer-stat-value">€${Math.round(dealerStats.medianPrice).toLocaleString('de-DE')}</span>
        </div>
        <div class="dealer-stat-item">
            <span class="dealer-stat-label">Ø Kilometerstand</span>
            <span class="dealer-stat-value">${Math.round(dealerStats.avgMileage).toLocaleString('de-DE')} km</span>
        </div>
        <div class="dealer-stat-item">
            <span class="dealer-stat-label">Preisspanne</span>
            <span class="dealer-stat-value">€${Math.round(dealerStats.minPrice).toLocaleString('de-DE')} - €${Math.round(dealerStats.maxPrice).toLocaleString('de-DE')}</span>
        </div>
    `;
    
    // Update private stats UI
    document.getElementById('private-stats').innerHTML = `
        <div class="dealer-stat-item">
            <span class="dealer-stat-label">Anzahl Listings</span>
            <span class="dealer-stat-value">${privateStats.count.toLocaleString('de-DE')}</span>
        </div>
        <div class="dealer-stat-item">
            <span class="dealer-stat-label">Ø Preis</span>
            <span class="dealer-stat-value">€${Math.round(privateStats.avgPrice).toLocaleString('de-DE')}</span>
        </div>
        <div class="dealer-stat-item">
            <span class="dealer-stat-label">Median Preis</span>
            <span class="dealer-stat-value">€${Math.round(privateStats.medianPrice).toLocaleString('de-DE')}</span>
        </div>
        <div class="dealer-stat-item">
            <span class="dealer-stat-label">Ø Kilometerstand</span>
            <span class="dealer-stat-value">${Math.round(privateStats.avgMileage).toLocaleString('de-DE')} km</span>
        </div>
        <div class="dealer-stat-item">
            <span class="dealer-stat-label">Preisspanne</span>
            <span class="dealer-stat-value">€${Math.round(privateStats.minPrice).toLocaleString('de-DE')} - €${Math.round(privateStats.maxPrice).toLocaleString('de-DE')}</span>
        </div>
    `;
    
    // Create price distribution chart
    createDealerVsPrivatePriceChart(dealerPrices, privatePrices);
    createAvgPriceBySellerChart(dealerStats, privateStats);
}

function createDealerVsPrivatePriceChart(dealerPrices, privatePrices) {
    const ctx = document.getElementById('dealerVsPrivatePriceChart').getContext('2d');
    
    // Create price ranges
    const allPrices = [...dealerPrices, ...privatePrices];
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const range = max - min;
    const binSize = range / 15;
    
    const bins = Array(15).fill().map((_, i) => {
        const start = min + (i * binSize);
        const end = start + binSize;
        return {
            label: `€${Math.round(start/1000)}k-${Math.round(end/1000)}k`,
            dealer: dealerPrices.filter(p => p >= start && p < end).length,
            private: privatePrices.filter(p => p >= start && p < end).length
        };
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: bins.map(b => b.label),
            datasets: [
                {
                    label: 'Händler',
                    data: bins.map(b => b.dealer),
                    backgroundColor: 'rgba(37, 99, 235, 0.8)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Privat',
                    data: bins.map(b => b.private),
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Anzahl Fahrzeuge'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Preisbereich'
                    }
                }
            }
        }
    });
}

function createAvgPriceBySellerChart(dealerStats, privateStats) {
    const ctx = document.getElementById('avgPriceBySellerChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Händler', 'Privat'],
            datasets: [
                {
                    label: 'Durchschnittspreis',
                    data: [dealerStats.avgPrice, privateStats.avgPrice],
                    backgroundColor: ['rgba(37, 99, 235, 0.8)', 'rgba(16, 185, 129, 0.8)'],
                    borderColor: ['rgba(37, 99, 235, 1)', 'rgba(16, 185, 129, 1)'],
                    borderWidth: 1
                },
                {
                    label: 'Median-Preis',
                    data: [dealerStats.medianPrice, privateStats.medianPrice],
                    backgroundColor: ['rgba(37, 99, 235, 0.5)', 'rgba(16, 185, 129, 0.5)'],
                    borderColor: ['rgba(37, 99, 235, 1)', 'rgba(16, 185, 129, 1)'],
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '€' + (value / 1000).toFixed(0) + 'k';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': €' + Math.round(context.parsed.y).toLocaleString('de-DE');
                        }
                    }
                }
            }
        }
    });
}

function createAgeDistributionChart() {
    const ctx = document.getElementById('ageDistributionChart').getContext('2d');
    
    const ages = allListings
        .map(l => {
            const year = parseInt(l.first_registration);
            return year ? new Date().getFullYear() - year : null;
        })
        .filter(age => age !== null && age >= 0 && age <= 30);
    
    // Group by age ranges
    const ageRanges = [
        { label: '0-2 Jahre', min: 0, max: 2 },
        { label: '3-5 Jahre', min: 3, max: 5 },
        { label: '6-10 Jahre', min: 6, max: 10 },
        { label: '11-15 Jahre', min: 11, max: 15 },
        { label: '16-20 Jahre', min: 16, max: 20 },
        { label: '21+ Jahre', min: 21, max: 100 }
    ];
    
    const ageCounts = ageRanges.map(range => 
        ages.filter(age => age >= range.min && age <= range.max).length
    );
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ageRanges.map(r => r.label),
            datasets: [{
                data: ageCounts,
                backgroundColor: [
                    '#ef4444', '#f97316', '#eab308', 
                    '#22c55e', '#3b82f6', '#8b5cf6'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createMileageDistributionChart() {
    const ctx = document.getElementById('mileageDistributionChart').getContext('2d');
    
    const mileages = allListings
        .map(l => parseInt(l.mileage))
        .filter(m => !isNaN(m) && m > 0);
    
    // Group by mileage ranges
    const mileageRanges = [
        { label: '0-50k km', min: 0, max: 50000 },
        { label: '50-100k km', min: 50000, max: 100000 },
        { label: '100-150k km', min: 100000, max: 150000 },
        { label: '150-200k km', min: 150000, max: 200000 },
        { label: '200k+ km', min: 200000, max: Infinity }
    ];
    
    const mileageCounts = mileageRanges.map(range => 
        mileages.filter(m => m >= range.min && m < range.max).length
    );
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: mileageRanges.map(r => r.label),
            datasets: [{
                label: 'Anzahl Fahrzeuge',
                data: mileageCounts,
                backgroundColor: 'rgba(245, 158, 11, 0.8)',
                borderColor: 'rgba(245, 158, 11, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createDepreciationAnalysis() {
    // Calculate depreciation insights
    const validListings = allListings.filter(l => {
        const year = parseInt(l.first_registration);
        const price = parseFloat(l.price);
        return year && price && year > 1990;
    });
    
    // Group by model and calculate depreciation
    const modelDepreciation = {};
    validListings.forEach(listing => {
        const model = `${listing.make} ${listing.model}`;
        const year = parseInt(listing.first_registration);
        const age = new Date().getFullYear() - year;
        const price = parseFloat(listing.price);
        
        if (!modelDepreciation[model]) {
            modelDepreciation[model] = [];
        }
        
        modelDepreciation[model].push({ age, price, year });
    });
    
    // Calculate insights
    const insights = [];
    
    // Best value models (low depreciation)
    const modelAverages = Object.entries(modelDepreciation)
        .filter(([model, data]) => data.length >= 5) // Only models with enough data
        .map(([model, data]) => {
            const avgAge = data.reduce((sum, d) => sum + d.age, 0) / data.length;
            const avgPrice = data.reduce((sum, d) => sum + d.price, 0) / data.length;
            return { model, avgAge, avgPrice, count: data.length };
        })
        .sort((a, b) => b.avgPrice - a.avgPrice);
    
    if (modelAverages.length > 0) {
        const bestValue = modelAverages[0];
        insights.push({
            title: 'Wertstabilstes Modell',
            value: bestValue.model,
            description: `Ø €${Math.round(bestValue.avgPrice).toLocaleString('de-DE')} bei ${Math.round(bestValue.avgAge)} Jahren`
        });
        
        const mostAffordable = modelAverages[modelAverages.length - 1];
        insights.push({
            title: 'Günstigstes Modell',
            value: mostAffordable.model,
            description: `Ø €${Math.round(mostAffordable.avgPrice).toLocaleString('de-DE')} bei ${Math.round(mostAffordable.avgAge)} Jahren`
        });
    }
    
    // Average age insights
    const allAges = validListings.map(l => new Date().getFullYear() - parseInt(l.first_registration));
    const avgAge = allAges.reduce((a, b) => a + b, 0) / allAges.length;
    
    insights.push({
        title: 'Durchschnittsalter',
        value: `${Math.round(avgAge)} Jahre`,
        description: `Über alle ${validListings.length} Fahrzeuge`
    });
    
    // Price per year calculation
    const pricePerYear = validListings.map(l => {
        const age = new Date().getFullYear() - parseInt(l.first_registration);
        const price = parseFloat(l.price);
        return age > 0 ? price / age : 0;
    }).filter(ppy => ppy > 0);
    
    if (pricePerYear.length > 0) {
        const avgPricePerYear = pricePerYear.reduce((a, b) => a + b, 0) / pricePerYear.length;
        insights.push({
            title: 'Ø Wertverlust/Jahr',
            value: `€${Math.round(avgPricePerYear).toLocaleString('de-DE')}`,
            description: 'Preis geteilt durch Alter'
        });
    }
    
    // Update insights UI
    document.getElementById('value-insights').innerHTML = insights.map(insight => `
        <div class="insight-card">
            <div class="insight-title">${insight.title}</div>
            <div class="insight-value">${insight.value}</div>
            <div class="insight-description">${insight.description}</div>
        </div>
    `).join('');
    
    // Create depreciation chart
    createDepreciationChart(modelAverages.slice(0, 8)); // Top 8 models
}

function createDepreciationChart(topModels) {
    const ctx = document.getElementById('depreciationChart').getContext('2d');
    
    const datasets = topModels.map((model, index) => {
        const colors = [
            '#ef4444', '#f97316', '#eab308', '#22c55e',
            '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'
        ];
        
        return {
            label: model.model,
            data: [{
                x: model.avgAge,
                y: model.avgPrice
            }],
            backgroundColor: colors[index],
            borderColor: colors[index],
            pointRadius: 8
        };
    });
    
    new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Durchschnittsalter (Jahre)'
                    },
                    beginAtZero: true
                },
                y: {
                    title: {
                        display: true,
                        text: 'Durchschnittspreis (€)'
                    },
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '€' + (value / 1000).toFixed(0) + 'k';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            return [
                                context.dataset.label,
                                `Ø Alter: ${point.x.toFixed(1)} Jahre`,
                                `Ø Preis: €${Math.round(point.y).toLocaleString('de-DE')}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

// ===== Search Tab =====
function populateSearchFilters() {
    // Populate make filter
    const makes = [...new Set(allListings.map(l => l.make))].sort();
    const makeSelect = document.getElementById('search-make');
    makes.forEach(make => {
        const option = document.createElement('option');
        option.value = make;
        option.textContent = make;
        makeSelect.appendChild(option);
    });
    
    // Populate fuel filter
    const fuels = [...new Set(allListings.map(l => l.fuel_type).filter(f => f))].sort();
    const fuelSelect = document.getElementById('search-fuel');
    fuels.forEach(fuel => {
        const option = document.createElement('option');
        option.value = fuel;
        option.textContent = fuel;
        fuelSelect.appendChild(option);
    });
    
    // Add event listener for make change
    makeSelect.addEventListener('change', updateModelFilter);
}

function updateModelFilter() {
    const selectedMake = document.getElementById('search-make').value;
    const modelSelect = document.getElementById('search-model');
    
    // Clear existing options
    modelSelect.innerHTML = '<option value="">Alle Modelle</option>';
    
    if (selectedMake) {
        const models = [...new Set(allListings
            .filter(l => l.make === selectedMake)
            .map(l => l.model)
        )].sort();
        
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            modelSelect.appendChild(option);
        });
    }
}

function performSearch() {
    const filters = {
        make: document.getElementById('search-make').value,
        model: document.getElementById('search-model').value,
        fuel: document.getElementById('search-fuel').value,
        priceMin: parseFloat(document.getElementById('price-min').value) || 0,
        priceMax: parseFloat(document.getElementById('price-max').value) || Infinity
    };
    
    const filteredListings = allListings.filter(listing => {
        const price = parseFloat(listing.price) || 0;
        
        return (!filters.make || listing.make === filters.make) &&
               (!filters.model || listing.model === filters.model) &&
               (!filters.fuel || listing.fuel_type === filters.fuel) &&
               (price >= filters.priceMin && price <= filters.priceMax);
    });
    
    displaySearchResults(filteredListings);
}

function displaySearchResults(results) {
    document.getElementById('results-count').textContent = `(${results.length} Ergebnisse)`;
    
    if (results.length === 0) {
        document.getElementById('search-results-table').innerHTML = 
            '<div class="empty-state"><i class="fas fa-search"></i><p>Keine Ergebnisse gefunden</p></div>';
        return;
    }
    
    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Fahrzeug</th>
                    <th>Preis</th>
                    <th>Kilometerstand</th>
                    <th>Kraftstoff</th>
                    <th>Baujahr</th>
                    <th>Verkäufer</th>
                </tr>
            </thead>
            <tbody>
                ${results.slice(0, 100).map(listing => `
                    <tr>
                        <td>
                            <strong>${listing.make} ${listing.model}</strong><br>
                            <small>${(listing.title || '').substring(0, 50)}...</small>
                        </td>
                        <td class="price-cell">€${parseInt(listing.price || 0).toLocaleString('de-DE')}</td>
                        <td>${listing.mileage ? parseInt(listing.mileage).toLocaleString('de-DE') + ' km' : '-'}</td>
                        <td>${listing.fuel_type || '-'}</td>
                        <td>${listing.first_registration || '-'}</td>
                        <td>${listing.seller_type || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${results.length > 100 ? `<p class="text-center mt-2">Zeige erste 100 von ${results.length} Ergebnissen</p>` : ''}
    `;
    
    document.getElementById('search-results-table').innerHTML = tableHTML;
}

// ===== Utility Functions =====
function formatCurrency(amount) {
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('de-DE').format(new Date(date));
}

// ===== Initialize Application =====
document.addEventListener('DOMContentLoaded', function() {
    loadDatabase();
});

// ===== Event Listeners =====
document.getElementById('model-search').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const modelCards = document.querySelectorAll('.model-card');
    
    modelCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        if (title.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
});

// Add keyboard shortcut for search
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        document.getElementById('model-search').focus();
    }
});
