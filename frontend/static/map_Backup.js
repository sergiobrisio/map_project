// File: frontend/static/map.js

// Variabile globale per il feature group dei marker attuali
let currentMarkers = L.featureGroup();

document.addEventListener('DOMContentLoaded', () => {
    // Aggiungiamo un piccolo ritardo (timeout) per dare al browser un attimo in più per rendere il DOM.
    // Questo è un workaround, non una soluzione ideale, ma utile per diagnosticare problemi di timing estremi.
    setTimeout(() => {
        initializeMap(); // Inizializza la mappa quando il DOM è pronto
        
        // Carica gli eventi iniziali passati dal backend
        if (window.initialMapEvents) {
            loadMarkersOnMap(window.initialMapEvents);
        }
    }, 50); // Piccolo ritardo di 50 millisecondi
});

function initializeMap() {
    if (window.map && typeof window.map.remove === 'function') {
        console.log("⚠️ Mappa Leaflet esistente rilevata, rimozione in corso per una nuova inizializzazione...");
        window.map.remove();
    }

    const mapContainer = document.getElementById('map');

    // AGGIUNGI QUESTA RIGA DI DEBUG:
    console.log("DEBUG: Risultato di document.getElementById('map'):", mapContainer); 

    if (mapContainer === null) {
        // Se, nonostante il setTimeout, il div non è ancora trovato, c'è un problema molto serio.
        console.error("ERRORE CRITICO: L'elemento HTML con id='map' NON è stato trovato nel DOM. Impossibile inizializzare la mappa.");
        return;
    }
    console.log("✅ Elemento #map trovato nel DOM. Inizializzazione della mappa Leaflet...");

    window.map = L.map(mapContainer).setView([41.9, 12.5], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(window.map);

    window.map.addLayer(currentMarkers);
    console.log("✅ Mappa Leaflet inizializzata e configurata correttamente.");
}

// Funzione chiamata dalla select in index.html per cambiare la mappa
function changeMap() {
    const select = document.getElementById('mapSelect');
    const filename = select.value;
    
    if (filename) {
        window.location.href = `/?filename=${filename}`;
    } else {
        window.location.href = `/?filename=`;
    }
}

// Carica i marker sulla mappa e li aggiunge al gruppo `currentMarkers`
function loadMarkersOnMap(events) {
    currentMarkers.clearLayers();

    const markers = [];
    events.forEach(event => {
        const lat = parseFloat(event.lat);
        const lon = parseFloat(event.lon);
        
        if (!isNaN(lat) && !isNaN(lon)) {
            const marker = L.marker([lat, lon])
                .bindPopup(`<b>${event.name}</b><br>Lat: ${lat}<br>Lon: ${lon}`);
            markers.push(marker);
            currentMarkers.addLayer(marker);
        }
    });

    if (markers.length > 0) {
        const group = L.featureGroup(markers);
        // Usa `window.map` qui
        if (window.map && typeof window.map.fitBounds === 'function') {
             window.map.fitBounds(group.getBounds(), { padding: [20, 20] });
        } else {
            console.warn("Mappa non disponibile per fitBounds.");
        }
    } else {
        // Se non ci sono marker, centra sulla vista iniziale o su un'altra posizione predefinita
        if (window.map && typeof window.map.setView === 'function') {
            window.map.setView([41.9, 12.5], 5);
        } else {
            console.warn("Mappa non disponibile per setView.");
        }
    }
}

window.loadMarkersOnMap = loadMarkersOnMap;
window.changeMap = changeMap;