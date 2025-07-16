package main

import (
	"encoding/csv"
	"log"
	"net/http"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// ========= STRUTTURE DATI AGGIORNATE =========

// Geometry definisce la struttura della geometria GeoJSON
type Geometry struct {
	Type        string        `json:"type"`
	Coordinates [][][]float64 `json:"coordinates"` // Poligono è un array di anelli, che è un array di punti
}

// Properties definisce le proprietà associate alla feature
type Properties struct {
	StartDate string `json:"startDate"`
	EndDate   string `json:"endDate"`
	Name      string `json:"name"`
}

// GeoJSONFeature rappresenta la struttura completa dell'evento inviato dal frontend
type GeoJSONFeature struct {
	Type       string     `json:"type"`
	Geometry   Geometry   `json:"geometry"`
	Properties Properties `json:"properties"`
}

// Event rappresenta la struttura di un nostro evento letto da CSV (per i marker iniziali)
type Event struct {
	Name      string `json:"name"`
	Latitude  string `json:"lat"`
	Longitude string `json:"lon"`
}

func loadEvents() []Event {
	file, err := os.Open("data/uk_festivals.csv")
	if err != nil {
		log.Printf("Attenzione: Impossibile aprire il file CSV: %v. La mappa non avrà marker iniziali.", err)
		return []Event{}
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		log.Printf("Attenzione: Impossibile leggere il file CSV: %v", err)
		return []Event{}
	}

	var events []Event
	if len(records) > 1 {
		for _, record := range records[1:] {
			event := Event{
				Name:      record[0],
				Latitude:  record[1],
				Longitude: record[2],
			}
			events = append(events, event)
		}
	}
	return events
}

func main() {
	router := gin.Default()

	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"*"}
	config.AllowMethods = []string{"GET", "POST", "OPTIONS"} // Assicurati di permettere POST
	router.Use(cors.New(config))

	events := loadEvents()

	router.GET("/api/events", func(c *gin.Context) {
		c.JSON(http.StatusOK, events)
	})

	// ========= ENDPOINT POST AGGIORNATO =========
	router.POST("/api/events/new", func(c *gin.Context) {
		// Ora usiamo la nostra nuova struct GeoJSONFeature
		var newEventData GeoJSONFeature

		// Collega il JSON ricevuto alla nostra variabile
		if err := c.ShouldBindJSON(&newEventData); err != nil {
			// Se il binding fallisce, restituiamo un errore chiaro
			log.Printf("ERRORE DI BINDING JSON: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Formato dei dati non valido.",
				"error":   err.Error(),
			})
			return
		}

		// Se il binding ha successo, logghiamo i dati ricevuti
		log.Printf("✅ Nuovo evento GeoJSON ricevuto correttamente: %+v", newEventData)
		log.Printf("Dettagli: Nome='%s', Inizio='%s', Fine='%s'",
			newEventData.Properties.Name,
			newEventData.Properties.StartDate,
			newEventData.Properties.EndDate)

		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": "Nuovo evento registrato correttamente.",
			"data":    newEventData, // Rimandiamo indietro i dati ricevuti per conferma
		})
	})

	log.Println("🚀 Server in ascolto su http://localhost:8082")
	router.Run("localhost:8082")
}
