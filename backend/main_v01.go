package main

import (
	"encoding/csv"
	"log"
	"net/http"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// Event rappresenta la struttura di un nostro evento.
// `json:"..."` serve per mappare i campi con il formato JSON.
type Event struct {
	Name      string `json:"name"`
	Latitude  string `json:"lat"`
	Longitude string `json:"lon"`
	// Aggiungi altri campi come StartDate, EndDate se presenti nei CSV
}

// Funzione per caricare i dati dai file CSV.
// Per l'MVP, uniamo i dati in memoria all'avvio del server.
func loadEvents() []Event {
	// NOTA: Questa è una implementazione semplificata.
	// Dovresti gestire gli errori in modo più robusto e parsare le diverse strutture dei tuoi CSV.
	// Qui assumiamo che tutti i CSV abbiano colonne "name", "lat", "lon".

	file, err := os.Open("data/uk_festivals.csv") // Scegli uno dei tuoi file per iniziare
	if err != nil {
		log.Fatal("Impossibile aprire il file CSV:", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		log.Fatal("Impossibile leggere il file CSV:", err)
	}

	var events []Event
	// Salta la riga dell'header (riga 0)
	for _, record := range records[1:] {
		event := Event{
			Name:      record[0], // Assumendo che il nome sia nella prima colonna
			Latitude:  record[1], // Assumendo la latitudine nella seconda
			Longitude: record[2], // Assumendo la longitudine nella terza
		}
		events = append(events, event)
	}
	return events
}

func main() {
	router := gin.Default()

	// CONFIGURAZIONE CORS: Fondamentale per permettere al frontend
	// (che gira su un'altra porta) di comunicare con il backend.
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"*"} // Per lo sviluppo, altrimenti specifica l'origine del tuo frontend
	router.Use(cors.New(config))

	// Carica gli eventi all'avvio
	events := loadEvents()

	// --- DEFINIZIONE DELLE API ---

	// API Endpoint per ottenere gli eventi esistenti
	router.GET("/api/events", func(c *gin.Context) {
		// NOTA: Per un vero GeoJSON, dovresti strutturare la risposta
		// come FeatureCollection. Per l'MVP, una lista di oggetti è sufficiente.
		c.JSON(http.StatusOK, events)
	})

	// API Endpoint per ricevere un nuovo evento
	router.POST("/api/events/new", func(c *gin.Context) {
		var newEventData map[string]interface{}

		// Collega il JSON ricevuto dalla richiesta alla nostra variabile
		if err := c.ShouldBindJSON(&newEventData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Per l'MVP, stampiamo semplicemente i dati ricevuti nel terminale del server.
		log.Printf("Nuovo evento ricevuto: %+v\n", newEventData)

		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": "Nuovo evento registrato correttamente.",
			"data":    newEventData,
		})
	})

	// Avvia il server
	router.Run("localhost:8082")
	log.Println("Server in ascolto su http://localhost:8082")
}
