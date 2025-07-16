document.addEventListener('DOMContentLoaded', function () {
    // 1. Inizializza la mappa
    const map = L.map('map').setView([51.505, -0.09], 5); // Centrata sull'Europa
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    let drawnPolygon = null; // Memorizza il poligono disegnato

    // 2. Aggiungi i controlli di disegno (Leaflet Draw)
    const drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems
        },
        draw: {
            polygon: true,
            polyline: false,
            rectangle: false,
            circle: false,
            marker: false,
            circlemarker: false
        }
    });
    map.addControl(drawControl);

    // 3. Carica gli eventi esistenti dal backend
    fetch('http://localhost:8082/api/events')
        .then(response => response.json())
        .then(events => {
            events.forEach(event => {
                if (event.lat && event.lon) {
                    L.marker([parseFloat(event.lat), parseFloat(event.lon)])
                        .addTo(map)
                        .bindPopup(`<b>${event.name}</b>`);
                }
            });
        })
        .catch(error => console.error('Errore nel caricamento degli eventi:', error));

    // 4. Gestisci l'evento di creazione di un nuovo poligono
    map.on('draw:created', function (e) {
        // 'e' è l'oggetto dell'evento, contiene il tipo di layer e il layer stesso
        const type = e.layerType;
        const layer = e.layer;
            
        if (type === 'polygon') {
            // Pulisci i disegni precedenti e aggiungi quello nuovo
            drawnItems.clearLayers();
            drawnItems.addLayer(layer);
            
            // Salva il poligono come GeoJSON
            drawnPolygon = layer.toGeoJSON();
            
            // Questo log ORA DOVREBBE APPARIRE nella console del browser
            console.log("Poligono disegnato e salvato:", drawnPolygon); 
        }
    });

    // 5. Gestisci il click sul pulsante "Invia"
    document.getElementById('submitEvent').addEventListener('click', function() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        if (!drawnPolygon) {
            alert("Per favore, disegna un'area sulla mappa prima di inviare.");
            return;
        }
        if (!startDate || !endDate) {
            alert("Per favore, seleziona una data di inizio e una di fine.");
            return;
        }

        const newEventPayload = {
            type: "Feature", // Strutturiamolo come un GeoJSON Feature completo
            geometry: drawnPolygon.geometry,
            properties: {
                startDate: startDate,
                endDate: endDate,
                // Aggiungiamo un nome per il popup
                name: "Nuovo Evento Creato" 
            }
        };

        // Invia i dati al backend
        fetch('http://localhost:8082/api/events/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newEventPayload)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Risposta dal server:', data);
            
            if (data.status === 'success') {
                alert(`Evento creato con successo!`);
                
                // --- LOGICA AGGIORNATA ---
                // 1. Crea un layer GeoJSON con l'evento appena creato
                const newEventLayer = L.geoJSON(newEventPayload, {
                    // 2. Applica lo stile personalizzato che abbiamo definito sopra
                    style: newEventStyle,
                    // 3. Aggiungi un popup per mostrare i dettagli
                    onEachFeature: function (feature, layer) {
                        layer.bindPopup(`<b>${feature.properties.name}</b><br>Dal: ${feature.properties.startDate}<br>Al: ${feature.properties.endDate}`);
                    }
                });

                // 4. Aggiungi il nuovo layer colorato alla mappa
                newEventLayer.addTo(map);

                // 5. Pulisci il layer di disegno temporaneo
                drawnItems.clearLayers();
                drawnPolygon = null;

            } else {
                alert('Si è verificato un errore nella creazione dell\'evento.');
            }
        })
        .catch(error => {
            console.error('Errore durante l\'invio del nuovo evento:', error);
            alert('Si è verificato un errore di comunicazione con il server.');
        });
    });
});

let map;

document.addEventListener('DOMContentLoaded', function () {
    // ... inizializzazione della mappa ...
    if (L.DomUtil.get('map') !== null) {
        // Evita errore "Map container is already initialized"
        L.DomUtil.get('map')._leaflet_id = null;
    }
    
    const map = L.map('map').setView([51.505, -0.09], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    // ...

    // >> AGGIUNGI QUESTA PARTE <<
    // Stile per i nuovi eventi creati dall'utente
    const newEventStyle = {
        color: "#28a745",       // Un verde "successo" per il bordo
        weight: 2,
        fillColor: "#28a745",
        fillOpacity: 0.4
    };

    // ... il resto del codice ...
});
