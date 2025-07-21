package main

import (
	"encoding/csv"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"

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
	Name      string  `json:"name"`
	Latitude  string  `json:"lat"`
	Longitude string  `json:"lon"`
	Radius    float32 `json:"radius"`
}

// loadEvents carica gli eventi dal file CSV specificato
func loadEvents(filename string) []Event {
	// Se il filename è vuoto, usa un default.
	// Potresti voler impostare un default più robusto o nessun default
	// a seconda della logica desiderata quando nessuna mappa è selezionata.
	if filename == "" {
		log.Println("Nessun filename specificato, caricamento di 'uk_festivals.csv' come default.")
		filename = "uk_festivals.csv" // default
	}

	filepath := "data/" + filename
	file, err := os.Open(filepath)
	if err != nil {
		log.Printf("Attenzione: Impossibile aprire il file CSV '%s': %v. La mappa non avrà marker iniziali.", filepath, err)
		return []Event{}
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		log.Printf("Attenzione: Impossibile leggere il file CSV '%s': %v", filepath, err)
		return []Event{}
	}

	var events []Event
	if len(records) > 1 {
		for _, record := range records[1:] {
			var radius float64 = 0.0 // valore di default

			if len(record) >= 10 && record[9] != "" {
				if parsedRadius, err := strconv.ParseFloat(record[9], 32); err == nil {
					radius = parsedRadius
				} else {
					log.Printf("Avviso: Valore 'Radius' non valido (%s) per evento: %v. Uso 0.0 come default.", record[9], record)
				}
			} else {
				log.Printf("Avviso: Campo 'Radius' mancante per evento: %v. Uso 0.0 come default.", record)
			}

			if len(record) >= 3 {
				event := Event{
					Name:      record[0],
					Latitude:  record[1],
					Longitude: record[2],
					Radius:    float32(radius), // conversione float64 → float32
				}
				events = append(events, event)
			} else {
				log.Printf("Avviso: Riga CSV ignorata a causa di colonne insufficienti: %v", record)
			}
		}
	} else {
		log.Printf("Avviso: Il file CSV '%s' è vuoto o contiene solo l'intestazione.", filepath)
	}

	return events
}

func main() {
	router := gin.Default()
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"*"}
	config.AllowMethods = []string{"GET", "POST", "OPTIONS"}
	router.Use(cors.New(config))

	// Carica i template HTML
	// Assicurati che il percorso sia corretto rispetto alla root del progetto
	// Se main.go è in /backend, e index.html è in /frontend, il percorso relativo è ../frontend/*
	router.LoadHTMLGlob("../frontend/*.html")
	// Servi TUTTI i file statici dalla cartella ../frontend/static
	// Ora tutti i tuoi file JS e CSS sarebbero accessibili tramite /static/app.js, /static/style.css, ecc.
	router.Static("/static", "../frontend/static")

	// Endpoint per servire la pagina principale
	router.GET("/", func(c *gin.Context) {
		filename := c.Query("filename")
		events := loadEvents(filename)

		// Converti in JSON
		eventsJSON, err := json.Marshal(events)
		if err != nil {
			log.Printf("Errore nel marshal JSON degli eventi iniziali: %v", err)
			eventsJSON = []byte("[]") // Array vuoto come fallback
		}

		c.HTML(http.StatusOK, "index.html", gin.H{
			"eventsJSON":       string(eventsJSON),
			"selectedFilename": filename,
		})
	})

	// ========= ENDPOINT GET PER CARICARE GLI EVENTI =========
	// Questo endpoint verrà chiamato da map.js quando si cambia la selezione della mappa
	router.GET("/api/events", func(c *gin.Context) {
		filename := c.Query("filename") // Ottieni il filename dal query parameter
		events := loadEvents(filename)  // Carica gli eventi
		c.JSON(http.StatusOK, events)
	})

	// ========= ENDPOINT POST AGGIORNATO =========
	router.POST("/api/events/new", func(c *gin.Context) {
		var newEventData GeoJSONFeature
		if err := c.ShouldBindJSON(&newEventData); err != nil {
			log.Printf("ERRORE DI BINDING JSON per nuovo evento: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Formato dei dati non valido.",
				"error":   err.Error(),
			})
			return
		}

		log.Printf("✅ Nuovo evento GeoJSON ricevuto correttamente: %+v", newEventData)
		log.Printf("Dettagli: Nome='%s', Inizio='%s', Fine='%s'",
			newEventData.Properties.Name,
			newEventData.Properties.StartDate,
			newEventData.Properties.EndDate)

		// Qui potresti aggiungere la logica per salvare il nuovo evento
		// Ad esempio, scriverlo su un file o un database.
		// Per ora, lo rimandiamo semplicemente come conferma.

		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": "Nuovo evento registrato correttamente.",
			"data":    newEventData,
		})
	})

	log.Println("🚀 Server in ascolto su http://localhost:8082")
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}
	router.Run(":" + port)
}
