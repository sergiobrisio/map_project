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
        console.log("✅ Config loaded:", config);
        apiBaseUrl = config.apiBaseUrl;
        initDrawingAndSubmission(); // chiama la funzione principale
    })
    .catch(error => {
        console.error('Error in config loading:', error);
        alert('Impossible to load config.');
    });

    function initDrawingAndSubmission() {
        console.log("🌍 Avvio initDrawingAndSubmission con base URL:", apiBaseUrl);

        // Assicurati che la mappa sia stata inizializzata da map.js
        if (!window.map) {
            console.error("Error: The map has not been initialized. Ensure that map.js have been loaded before app.js.");
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
                console.log("The polygon has been drawn and saved:", drawnPolygon);
            }
        });

        // Invio nuovo evento
        document.getElementById('submitEvent').addEventListener('click', function () {
            const eventName = document.getElementById('eventName').value;
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;

            if (!drawnPolygon) {
                alert("Please, draw an area on the map before clicking on Send.");
                return;
            }

             if (!eventName) {
                alert("Please, insert an event name.");
                return;
            }

            if (!startDate || !endDate) {
                alert("Please, select a star date and an end date.");
                return;
            }

            const newEventPayload = {
                type: "Feature",
                geometry: drawnPolygon.geometry,
                properties: {
                    startDate: startDate,
                    endDate: endDate,
                    name: eventName,
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
                console.log('Server response:', data);

                if (data.status === 'success') {
                    alert(`Event successfully created!`);

                    // Visualizza il nuovo poligono con stile
                    const newEventLayer = L.geoJSON(newEventPayload, {
                        style: newEventStyle,
                        onEachFeature: function (feature, layer) {
                            layer.bindPopup(`<b>${feature.properties.name}</b><br>From: ${feature.properties.startDate}<br>To: ${feature.properties.endDate}`);
                        }
                    });

                    newEventLayer.addTo(window.map); // Usa window.map

                    // Pulisce il disegno
                    drawnItems.clearLayers();
                    drawnPolygon = null;

                } else {
                    alert('An error occurred while creating the event: ' + (data.message || 'Unknown error.'));
                }
            })
            .catch(error => {
                console.error('Error sending new event:', error);
                alert('An error occurred communicating with the server.');
            });
        });
    }
});