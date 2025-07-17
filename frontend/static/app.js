let drawnItems;
let drawnPolygon;
let apiBaseUrl;

document.addEventListener('DOMContentLoaded', () => {
    // Controlla se la mappa è già pronta
    if (window.map) {
        initDrawingAndSubmission();
    } else {
        // Aspetta l'evento mapReady
        window.addEventListener('mapReady', initDrawingAndSubmission);
    }
    // 1. Carica la config e avvia l'app
    fetch('/static/config.json')
    .then(response => response.json())
    .then(config => {
        console.log("✅ Configurazione caricata:", config);
        apiBaseUrl = config.apiBaseUrl;
        initDrawingAndSubmission(); // chiama la funzione principale
    })
    .catch(error => {
        console.error('Errore nel caricamento della configurazione:', error);
        alert('Impossibile caricare la configurazione.');
    });

    function initDrawingAndSubmission() {
        console.log("🌍 Avvio initDrawingAndSubmission con base URL:", apiBaseUrl);

        // Assicurati che la mappa sia stata inizializzata da map.js
        if (!window.map) {
            console.error("Errore: La mappa non è stata inizializzata. Assicurati che map.js sia caricato prima di app.js.");
            return;
        }

        // Stile personalizzato per i nuovi eventi
        const newEventStyle = {
            color: "#28a745",       // verde per il bordo
            weight: 2,
            fillColor: "#28a745",
            fillOpacity: 0.4
        };

        // Inizializza il layer dei disegni
        drawnItems = new L.FeatureGroup();
        window.map.addLayer(drawnItems); // Usa window.map

        // Controlli di disegno
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
        window.map.addControl(drawControl); // Usa window.map

        // Quando disegni un poligono
        window.map.on('draw:created', function (e) { // Usa window.map
            const type = e.layerType;
            const layer = e.layer;

            if (type === 'polygon') {
                drawnItems.clearLayers();
                drawnItems.addLayer(layer);
                drawnPolygon = layer.toGeoJSON();
                console.log("Poligono disegnato e salvato:", drawnPolygon);
            }
        });

        // Invio nuovo evento
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
                    name: "Nuovo Evento Creato" // Puoi aggiungere un input per il nome
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

                    newEventLayer.addTo(window.map); // Usa window.map

                    // Pulisce il disegno
                    drawnItems.clearLayers();
                    drawnPolygon = null;

                } else {
                    alert('Si è verificato un errore nella creazione dell\'evento: ' + (data.message || 'Errore sconosciuto.'));
                }
            })
            .catch(error => {
                console.error('Errore durante l\'invio del nuovo evento:', error);
                alert('Si è verificato un errore di comunicazione con il server.');
            });
        });
    }
});