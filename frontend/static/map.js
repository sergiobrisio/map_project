// File separato per la logica della mappa
let map;
let currentMarkers = L.featureGroup(); // Per gestire i marker correnti e pulirli

document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    // Carica gli eventi iniziali passati dal backend
    if (window.initialMapEvents) {
        loadMarkersOnMap(window.initialMapEvents);
    }
});

function initializeMap() {
    // Previeni errore "Map container already initialized"
    if (L.DomUtil.get('map') !== null) {
        L.DomUtil.get('map')._leaflet_id = null;
    }
    
    map = L.map('map').setView([41.9, 12.5], 5); // Italia
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    map.addLayer(currentMarkers); // Aggiungi il featureGroup per i marker
    // SPOSTA QUI le assegnazioni globali, DOPO che la mappa è stata creata
    window.map = map;
    window.loadMarkersOnMap = loadMarkersOnMap;
    
    // Opzionale: dispara un evento per notificare che la mappa è pronta
    window.dispatchEvent(new CustomEvent('mapReady'));
}

// Funzione chiamata dalla select per cambiare la mappa
function changeMap() {
    const select = document.getElementById('mapSelect');
    const filename = select.value;
    
    if (filename) {
        // Reindirizza la pagina con il nuovo filename come parametro di query
        // Questo farà sì che il backend ricarichi la pagina con i dati del nuovo CSV
        window.location.href = `/?filename=${filename}`;
    } else {
        // Se si seleziona "Seleziona una mappa", puoi decidere di non caricare nulla o una mappa vuota
        window.location.href = `/?filename=`; // O semplicemente pulire i marker
    }
}

// Carica i marker sulla mappa e li aggiunge al gruppo currentMarkers
function loadMarkersOnMap(events) {
    currentMarkers.clearLayers(); // Pulisce i marker precedenti

    const markers = [];
    events.forEach(event => {
        const lat = parseFloat(event.lat);
        const lon = parseFloat(event.lon);
        
        if (!isNaN(lat) && !isNaN(lon)) {
            const marker = L.marker([lat, lon])
                .bindPopup(`<b>${event.name}</b><br>Lat: ${lat}<br>Lon: ${lon}`);
            markers.push(marker);
            currentMarkers.addLayer(marker); // Aggiungi al feature group
        }
    });

    // Centra la mappa automaticamente sui nuovi marker
    if (markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds(), { padding: [20, 20] });
    } else {
        // Se non ci sono marker, centra sulla vista iniziale o su un'altra posizione predefinita
        map.setView([41.9, 12.5], 5);
    }
}