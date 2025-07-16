let map;
let drawnItems;
let drawnPolygon;
let apiBaseUrl;

document.addEventListener('DOMContentLoaded', () => {
    // Previeni errore "Map container already initialized"
    if (L.DomUtil.get('map') !== null) {
        L.DomUtil.get('map')._leaflet_id = null;
    }

    // 1. Inizializza la mappa
    map = L.map('map').setView([41.9, 12.5], 5); // Italia
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // 2. Stile personalizzato per i nuovi eventi
    const newEventStyle = {
        color: "#28a745",       // verde per il bordo
        weight: 2,
        fillColor: "#28a745",
        fillOpacity: 0.4
    };

    // 3. Inizializza il layer dei disegni
    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // 4. Controlli di disegno
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

    // 5. Carica la config e avvia l'app
    fetch('./config.json')
    .then(response => response.json())
    .then(config => {
        console.log("✅ Configurazione caricata:", config);
        apiBaseUrl = config.apiBaseUrl;
        init(); // chiama la funzione principale
    })
    .catch(error => {
        console.error('Errore nel caricamento della configurazione:', error);
        alert('Impossibile caricare la configurazione.');
    });

    function init() {
        console.log("🌍 Avvio init con base URL:", apiBaseUrl);
        // 6. Carica eventi esistenti (CSV) dal backend
        fetch(`${apiBaseUrl}/api/events`)
            .then(response => response.json())
            .then(events => {
                console.log("📍 Eventi ricevuti:", events);
                const markers = [];

                events.forEach(event => {
                    if (event.lat && event.lon) {
                        const lat = parseFloat(event.lat);
                        const lon = parseFloat(event.lon);

                        const marker = L.marker([lat, lon])
                            .addTo(map)
                            .bindPopup(`<b>${event.name}</b>`);

                        markers.push(marker);
                    }
                });

                // Centra la mappa automaticamente
                if (markers.length > 0) {
                    const group = L.featureGroup(markers);
                    map.fitBounds(group.getBounds(), { padding: [20, 20] });
                }
            })
            .catch(error => {
                console.error('Errore nel caricamento degli eventi:', error);
                alert('Errore durante il caricamento degli eventi. Verifica che il server sia avviato.');
            });
    }
    // 7. Quando disegni un poligono
    map.on('draw:created', function (e) {
        const type = e.layerType;
        const layer = e.layer;

        if (type === 'polygon') {
            drawnItems.clearLayers();
            drawnItems.addLayer(layer);
            drawnPolygon = layer.toGeoJSON();
            console.log("Poligono disegnato e salvato:", drawnPolygon);
        }
    });

    // 8. Invio nuovo evento
    document.getElementById('submitEvent').addEventListener('click', function () {
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
            type: "Feature",
            geometry: drawnPolygon.geometry,
            properties: {
                startDate: startDate,
                endDate: endDate,
                name: "Nuovo Evento Creato"
            }
        };

        fetch(`${apiBaseUrl}/api/events/new`, {
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

                // Visualizza il nuovo poligono con stile
                const newEventLayer = L.geoJSON(newEventPayload, {
                    style: newEventStyle,
                    onEachFeature: function (feature, layer) {
                        layer.bindPopup(`<b>${feature.properties.name}</b><br>Dal: ${feature.properties.startDate}<br>Al: ${feature.properties.endDate}`);
                    }
                });

                newEventLayer.addTo(map);

                // Pulisce il disegno
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
